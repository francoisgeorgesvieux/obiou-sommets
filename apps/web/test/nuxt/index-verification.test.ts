import { mockComponent, mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import Index from '~/pages/index.vue'

// The check runs in the browser only (server: false): the server-rendered page, and the page
// until hydration, have no answer yet. A client-side mount awaits the fetch, so that state is
// reproduced here with a fetch that has not answered.
mockNuxtImport('useFetch', () => async () => {
  const { ref } = await import('vue')
  return { data: ref(null) }
})

mockComponent('CarteIgn', async () => {
  const { defineComponent, h } = await import('vue')
  return defineComponent({ render: () => h('div') })
})

describe('home page before the health check answers', () => {
  it('says the check is running, with a neutral status dot', async () => {
    const wrapper = await mountSuspended(Index)
    expect(wrapper.find('.statut').text()).toBe('Vérification…')
    expect(wrapper.find('.statut').attributes('data-ok')).toBeUndefined()
  })
})
