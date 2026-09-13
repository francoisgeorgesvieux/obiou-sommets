import postgres from 'postgres'

let client: postgres.Sql | null | undefined

/**
 * Shared Postgres client, or null when no database is configured
 * (local UI work without Docker). Created lazily on first use.
 */
export function useDb(): postgres.Sql | null {
  if (client !== undefined) return client
  const url = useRuntimeConfig().databaseUrl
  client = url ? postgres(url, { max: 5, idle_timeout: 30, connect_timeout: 10 }) : null
  return client
}
