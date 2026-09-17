import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CarteIgn from '~/components/CarteIgn.vue'

// happy-dom has no WebGL: MapLibre is replaced by a recorder. What this checks is how the
// component drives MapLibre; whether the map actually draws is checked in a real browser.
const maplibre = vi.hoisted(() => {
  const maps: { options: Record<string, unknown>, controls: unknown[], remove: () => void }[] = []
  // MapLibre throws when the browser refuses WebGL.
  const refuseWebgl = { value: false }
  class Map {
    options: Record<string, unknown>
    controls: unknown[] = []
    remove = vi.fn()
    constructor(options: Record<string, unknown>) {
      if (refuseWebgl.value) throw new Error('WebGL creation failed')
      this.options = options
      maps.push(this)
    }

    addControl(control: unknown) {
      this.controls.push(control)
    }
  }
  class NavigationControl {
    constructor(public options: unknown) {}
  }
  class AttributionControl {
    constructor(public options: { compact?: boolean, customAttribution?: string }) {}
  }
  return { maps, refuseWebgl, Map, NavigationControl, AttributionControl, setWorkerUrl: vi.fn() }
})

vi.mock('maplibre-gl', () => maplibre)
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', () => ({ default: '/_nuxt/maplibre-gl-worker.js' }))

describe('CarteIgn', () => {
  beforeEach(() => {
    maplibre.maps.length = 0
    maplibre.refuseWebgl.value = false
  })

  it('opens the IGN plan on the Dévoluy, in the map region', async () => {
    const wrapper = await mountSuspended(CarteIgn)
    expect(maplibre.maps).toHaveLength(1)
    const { options } = maplibre.maps[0]!
    expect(options.container).toBe(wrapper.find('[role="region"]').element)
    expect(options).toMatchObject({
      style: 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json',
      center: [5.88, 44.72],
      zoom: 10.5,
      attributionControl: false,
    })
    expect(wrapper.find('[role="region"]').attributes('aria-label')).toBe('Carte du massif du Dévoluy')
  })

  it('credits IGN in the attribution, as its terms require', async () => {
    await mountSuspended(CarteIgn)
    const attribution = maplibre.maps[0]!.controls.find((c) => c instanceof maplibre.AttributionControl)
    expect(attribution?.options).toEqual({ compact: true, customAttribution: '© IGN – Géoplateforme' })
    expect(maplibre.maps[0]!.controls.some((c) => c instanceof maplibre.NavigationControl)).toBe(true)
  })

  it('points MapLibre at the worker bundled by Vite (without it the map stays blank)', async () => {
    maplibre.setWorkerUrl.mockClear()
    await mountSuspended(CarteIgn)
    expect(maplibre.setWorkerUrl).toHaveBeenCalledWith('/_nuxt/maplibre-gl-worker.js')
  })

  it('accepts another center and zoom', async () => {
    await mountSuspended(CarteIgn, { props: { center: [127.98, 37.51], zoom: 12 } })
    expect(maplibre.maps[0]!.options).toMatchObject({ center: [127.98, 37.51], zoom: 12 })
  })

  it('says so without breaking the page when the browser refuses WebGL', async () => {
    maplibre.refuseWebgl.value = true
    const wrapper = await mountSuspended(CarteIgn)
    expect(wrapper.text()).toContain('La carte a besoin de WebGL')
    expect(maplibre.maps).toHaveLength(0)
  })

  it('releases the map when it leaves the page', async () => {
    const wrapper = await mountSuspended(CarteIgn)
    const map = maplibre.maps[0]!
    wrapper.unmount()
    expect(map.remove).toHaveBeenCalledOnce()
  })
})
