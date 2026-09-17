import { mockComponent, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { setResponseStatus } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearNuxtData } from '#app'
import App from '~/app.vue'
import Index from '~/pages/index.vue'

// The real map needs WebGL; the page only has to place it.
mockComponent('CarteIgn', async () => {
  const { defineComponent, h } = await import('vue')
  return defineComponent({ render: () => h('div', { 'data-test': 'carte' }) })
})

// Each test decides what /api/health answers, and when.
let answer: () => Promise<{ status: number, body: unknown }>
registerEndpoint('/api/health', async (event) => {
  const { status, body } = await answer()
  setResponseStatus(event, status)
  return body
})

async function mountWith(status: number, body: unknown) {
  answer = async () => ({ status, body })
  const wrapper = await mountSuspended(Index)
  return wrapper
}

describe('home page', () => {
  afterEach(() => clearNuxtData())

  it('says the database is connected', async () => {
    const wrapper = await mountWith(200, { status: 'ok', database: 'ok', postgis: true })
    await vi.waitFor(() => expect(wrapper.find('.statut').text()).toBe('Base de données connectée'))
    expect(wrapper.find('.statut').attributes('data-ok')).toBe('true')
  })

  it('says the database is unreachable when the health check fails', async () => {
    const wrapper = await mountWith(503, { status: 'error', database: 'unreachable' })
    await vi.waitFor(() => expect(wrapper.find('.statut').text()).toBe('Base de données injoignable'))
    expect(wrapper.find('.statut').attributes('data-ok')).toBe('false')
  })

  it('is the page served at the root of the site', async () => {
    answer = async () => ({ status: 200, body: { status: 'ok', database: 'ok', postgis: true } })
    const wrapper = await mountSuspended(App, { route: '/' })
    expect(wrapper.find('h1').text()).toBe('Obiou Sommets')
  })

  it('places the map and keeps this placeholder page out of search engines', async () => {
    const wrapper = await mountWith(200, { status: 'ok', database: 'ok', postgis: true })
    await vi.waitFor(() => expect(wrapper.find('[data-test="carte"]').exists()).toBe(true))
    await vi.waitFor(() =>
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow'),
    )
  })
})
