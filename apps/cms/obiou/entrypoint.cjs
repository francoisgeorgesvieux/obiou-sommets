#!/usr/bin/env node
'use strict';

/**
 * Obiou Sommets entrypoint, wrapping the stock Directus boot
 * (node_modules/../docker-entrypoint.cjs in the base image):
 *
 *   1. make sure the PostGIS extension exists (geometry fields need it);
 *   2. `directus bootstrap` — install/migrate the database, create the first admin;
 *   3. apply the versioned schema snapshot, when one is committed;
 *   4. hand off to pm2-runtime, exactly like the stock image.
 *
 * Any failing step exits non-zero so Railway keeps the previous deployment.
 */

const { spawnSync, spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { existsSync, realpathSync } = require('node:fs');

const node = process.execPath;
const cwd = '/directus';
const api = realpathSync(require.resolve('/directus/node_modules/@directus/api/package.json'));
const apiRequire = createRequire(api);

function run(label, args) {
  console.log(`[obiou] ${label}`);
  const result = spawnSync(node, args, { stdio: 'inherit', cwd });
  if (result.status !== 0) {
    console.error(`[obiou] ${label} failed (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
}

async function ensurePostgis() {
  if (process.env.DB_CLIENT !== 'pg') return;
  const { Client } = apiRequire('pg');
  const client = new Client({ connectionString: process.env.DB_CONNECTION_STRING });
  await client.connect();
  try {
    await client.query('create extension if not exists postgis');
    const { rows } = await client.query("select extversion from pg_extension where extname = 'postgis'");
    console.log(`[obiou] PostGIS ${rows[0]?.extversion ?? 'missing'}`);
  } finally {
    await client.end();
  }
}

async function main() {
  await ensurePostgis();
  run('bootstrap', ['cli.js', 'bootstrap']);

  const snapshot = '/directus/snapshots/schema.yaml';
  if (existsSync(snapshot)) {
    run('schema apply', ['cli.js', 'schema', 'apply', '--yes', snapshot]);
  } else {
    console.log('[obiou] no schema snapshot committed yet, skipping schema apply');
  }

  const pm2Runtime = apiRequire.resolve('pm2/bin/pm2-runtime');
  const pm2 = spawn(node, [pm2Runtime, 'start', 'ecosystem.config.cjs'], { stdio: 'inherit', cwd });
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT']) {
    process.on(signal, () => pm2.kill(signal));
  }
  pm2.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
  pm2.on('error', (err) => {
    console.error('[obiou] failed to start pm2-runtime:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('[obiou] startup failed:', err.message);
  process.exit(1);
});
