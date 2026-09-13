#!/usr/bin/env node
'use strict';

/**
 * Obiou Sommets entrypoint, wrapping the stock Directus boot
 * (node_modules/../docker-entrypoint.cjs in the base image):
 *
 *   1. check the settings that fail silently, and make sure the PostGIS
 *      extension exists (geometry fields need it);
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

function fail(message) {
  console.error(`[obiou] ${message}`);
  process.exit(1);
}

/**
 * Refuse to boot with settings that fail silently:
 * - no SECRET: Directus invents one per boot and every session dies on redeploy;
 * - fresh database without ADMIN_EMAIL/ADMIN_PASSWORD: bootstrap creates a default
 *   admin with a generated password written to the logs.
 */
async function checkDatabaseAndConfig() {
  if (!process.env.SECRET) fail('SECRET is not set; refusing to start.');
  if (process.env.DB_CLIENT !== 'pg') return;

  const { Client } = apiRequire('pg');
  const client = new Client({ connectionString: process.env.DB_CONNECTION_STRING });
  await client.connect();
  try {
    await client.query('create extension if not exists postgis');
    const { rows } = await client.query("select extversion from pg_extension where extname = 'postgis'");
    console.log(`[obiou] PostGIS ${rows[0]?.extversion ?? 'missing'}`);

    // Two queries: Postgres resolves table names at parse time, even inside a CASE branch.
    const table = await client.query("select to_regclass('public.directus_users') is not null as present");
    let fresh = !table.rows[0].present;
    if (!fresh) {
      const users = await client.query('select count(*) as n from directus_users');
      fresh = Number(users.rows[0].n) === 0;
    }
    if (fresh && !(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)) {
      fail('fresh database: set ADMIN_EMAIL and ADMIN_PASSWORD before the first boot; refusing to start.');
    }
  } finally {
    await client.end();
  }

  if (!process.env.LICENSE_KEY && !process.env.LICENSE_TOKEN) {
    console.warn('[obiou] WARNING: no Directus license key. Core tier ignores custom permission rules;');
    console.warn('[obiou]          the AI agent role must not be enabled until a license is active.');
  }
}

async function main() {
  await checkDatabaseAndConfig();
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
