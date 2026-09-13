/**
 * Liveness + database check. Railway uses it as the deploy healthcheck, so a
 * deploy that cannot reach Postgres never replaces a working one.
 */
export default defineEventHandler(async (event) => {
  const db = useDb()
  if (!db) {
    setResponseStatus(event, 503)
    return { status: 'error', database: 'not_configured' }
  }
  try {
    const [row] = await db<{ postgis: boolean }[]>`
      select exists (select 1 from pg_extension where extname = 'postgis') as postgis
    `
    return { status: 'ok', database: 'ok', postgis: row?.postgis ?? false }
  }
  catch {
    setResponseStatus(event, 503)
    return { status: 'error', database: 'unreachable' }
  }
})
