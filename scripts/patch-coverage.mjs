#!/usr/bin/env node
// Patch coverage gate: the lines a change adds must be covered by tests.
// Same mechanism as obioucounting's scripts/patch-coverage.mjs, adapted to this monorepo.
//
//   node scripts/patch-coverage.mjs --base <ref|sha> [--min 85]
//
// Base: the pull request base, or on a push the commit that was on the branch before it
// (github.event.before). Locally, `pnpm check` uses origin/main: exactly what the push will add.
//
// Every workspace package that produced coverage/cobertura-coverage.xml (run the tests first) is
// gated. The others are listed as not gated, so a package without coverage is never silently
// trusted. The project-wide floors live in each package's vitest.config.ts (coverage.thresholds).
//
// No dependency, no external service: git diff + the Cobertura report written by Vitest.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const WORKSPACE_GLOBS = ['apps', 'packages']
const SOURCE_FILE = /\.(ts|mts|js|mjs|vue)$/

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
}

const base = arg('base')
const min = Number(arg('min', '85'))
const inCi = process.env.GITHUB_ACTIONS === 'true'

if (!base) {
  console.error('patch-coverage : --base <ref|sha> est requis')
  process.exit(2)
}

// A push that creates a branch has an all-zero "before"; a force push can point at a commit
// that no longer exists. Nothing to compare against: say so, the floors still apply.
function skip(reason) {
  console.log(inCi ? `::warning::patch-coverage ignoré : ${reason}` : `– patch-coverage ignoré : ${reason}`)
  process.exit(0)
}
if (/^0+$/.test(base)) skip('pas de commit de base (nouvelle branche)')
try {
  git('cat-file', '-e', `${base}^{commit}`)
} catch {
  skip(`commit de base ${base} introuvable (historique réécrit, ou checkout sans fetch-depth: 0)`)
}

const root = git('rev-parse', '--show-toplevel').trim()
const packages = WORKSPACE_GLOBS.flatMap((dir) =>
  existsSync(join(root, dir))
    ? readdirSync(join(root, dir), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && existsSync(join(root, dir, entry.name, 'package.json')))
        .map((entry) => `${dir}/${entry.name}`)
    : [],
)

/** Added line numbers per package-relative source file, from the diff base...HEAD. */
function changedLines(pkg) {
  const diff = git('-C', root, 'diff', '--unified=0', '--no-color', `${base}...HEAD`, '--', pkg)
  const changed = new Map()
  let current = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const path = line.slice(4).replace(/^b\//, '')
      const rel = path.startsWith(`${pkg}/`) ? path.slice(pkg.length + 1) : null
      current = rel && SOURCE_FILE.test(rel) ? rel : null
      if (current && !changed.has(current)) changed.set(current, new Set())
    } else if (current && line.startsWith('@@')) {
      // "@@ -a,b +c,d @@": the added range starts at c and spans d lines (1 when omitted).
      const match = line.match(/\+(\d+)(?:,(\d+))?/)
      if (!match) continue
      const start = Number(match[1])
      const length = match[2] === undefined ? 1 : Number(match[2])
      for (let n = start; n < start + length; n++) changed.get(current).add(n)
    }
  }
  // Vue SFCs: v8 attributes template expressions to the enclosing block, so rendered element lines
  // read as 0 hits. Only <script> lines are gated; templates are checked by rendering tests.
  for (const [file, lines] of changed) {
    if (!file.endsWith('.vue')) continue
    const source = readFileSync(join(root, pkg, file), 'utf8').split('\n')
    const open = source.findIndex((l) => /<script\b/.test(l)) + 1
    const close = source.findIndex((l, i) => i >= open && /<\/script>/.test(l)) + 1
    changed.set(file, new Set([...lines].filter((n) => open > 0 && n > open && (close === 0 || n < close))))
  }
  return changed
}

/** Hits per line per package-relative file, from the Cobertura report. */
function lineHits(report) {
  const xml = readFileSync(report, 'utf8')
  const hits = new Map()
  for (const [, file, body] of xml.matchAll(/<class\b[^>]*\bfilename="([^"]+)"[^>]*>([\s\S]*?)<\/class>/g)) {
    // Skip <methods>: their <line> entries repeat function declarations with call counts.
    const lines = body.replace(/<methods>[\s\S]*?<\/methods>/, '')
    const fileHits = new Map()
    for (const [, number, count] of lines.matchAll(/<line\b[^>]*\bnumber="(\d+)"[^>]*\bhits="(\d+)"/g)) {
      fileHits.set(Number(number), Number(count))
    }
    hits.set(file, fileHits)
  }
  return hits
}

let failed = false
for (const pkg of packages) {
  const report = join(root, pkg, 'coverage', 'cobertura-coverage.xml')
  const changed = changedLines(pkg)
  if (!existsSync(report)) {
    const manifest = JSON.parse(readFileSync(join(root, pkg, 'package.json'), 'utf8'))
    if (manifest.devDependencies?.['@vitest/coverage-v8']) {
      // Vitest writes no report when a test fails: never read that as "nothing to check".
      console.log(`✗ ${pkg} : couverture configurée mais aucun rapport (tests en échec, ou pas lancés ?)`)
      failed = true
      continue
    }
    const note = changed.size ? `, ${changed.size} fichier(s) source modifié(s) non contrôlé(s)` : ''
    console.log(`– ${pkg} : pas de couverture configurée, non contrôlé${note}`)
    continue
  }
  const hits = lineHits(report)
  let coverable = 0
  const missed = []
  for (const [file, lines] of changed) {
    // A file absent from the report is outside coverage.include (config, generated code…).
    const fileHits = hits.get(file)
    if (!fileHits) continue
    for (const n of [...lines].sort((a, b) => a - b)) {
      if (!fileHits.has(n)) continue // not executable: blank, comment, type
      coverable++
      if (fileHits.get(n) === 0) missed.push({ file: `${pkg}/${file}`, line: n })
    }
  }
  if (coverable === 0) {
    console.log(`✓ ${pkg} : aucune ligne exécutable modifiée depuis ${base}`)
    continue
  }
  const pct = ((coverable - missed.length) / coverable) * 100
  const ok = pct + 1e-9 >= min
  console.log(
    `${ok ? '✓' : '✗'} ${pkg} : ${coverable - missed.length}/${coverable} lignes modifiées couvertes = ${pct.toFixed(1)} % (minimum ${min} %)`,
  )
  for (const { file, line } of missed.slice(0, 50)) {
    console.log(inCi ? `::error file=${file},line=${line}::Ligne modifiée non couverte par les tests` : `    ${file}:${line}`)
  }
  if (missed.length > 50) console.log(`    … et ${missed.length - 50} autres`)
  if (!ok) failed = true
}

if (failed) {
  console.error(`✗ contrôle des lignes modifiées en échec (minimum ${min} % couvertes par les tests)`)
  process.exit(1)
}
