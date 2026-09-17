import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runtimeConfig } from './nitro'

const { postgres } = vi.hoisted(() => ({ postgres: vi.fn((url: string) => ({ url })) }))
vi.mock('postgres', () => ({ default: postgres }))

// useDb keeps its client in module state: each test gets a fresh copy of the module.
async function freshUseDb() {
  vi.resetModules()
  return (await import('../../server/utils/db')).useDb
}

describe('useDb', () => {
  beforeEach(() => postgres.mockClear())

  it('returns null without a database URL, so the site still renders without Docker', async () => {
    const useDb = await freshUseDb()
    expect(useDb()).toBeNull()
    expect(postgres).not.toHaveBeenCalled()
  })

  it('creates one pooled client from the configured URL', async () => {
    runtimeConfig.databaseUrl = 'postgres://obiou@timescaledb.railway.internal:5432/railway'
    const useDb = await freshUseDb()
    const client = useDb()
    expect(postgres).toHaveBeenCalledExactlyOnceWith(runtimeConfig.databaseUrl, {
      max: 5,
      idle_timeout: 30,
      connect_timeout: 10,
    })
    expect(useDb()).toBe(client)
    expect(postgres).toHaveBeenCalledOnce()
  })

  it('remembers the absence of a database instead of re-reading the config', async () => {
    const useDb = await freshUseDb()
    expect(useDb()).toBeNull()
    runtimeConfig.databaseUrl = 'postgres://late@localhost/db'
    expect(useDb()).toBeNull()
    expect(postgres).not.toHaveBeenCalled()
  })
})
