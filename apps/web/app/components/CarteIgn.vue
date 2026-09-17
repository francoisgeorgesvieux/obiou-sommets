<script setup lang="ts">
import { AttributionControl, Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl'
// MapLibre 6 computes its worker URL at runtime, so the bundler never emits the file.
// `?worker&url` makes Vite bundle the worker with its shared chunk and hand back its URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)

const props = withDefaults(defineProps<{
  center?: [number, number]
  zoom?: number
}>(), {
  // Massif du Dévoluy.
  center: () => [5.88, 44.72],
  zoom: 10.5,
})

const container = useTemplateRef<HTMLDivElement>('conteneur')
const indisponible = ref(false)
let map: MapLibreMap | null = null

onMounted(() => {
  if (!container.value) return
  try {
    map = new MapLibreMap({
      container: container.value,
      style: 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json',
      center: props.center,
      zoom: props.zoom,
      attributionControl: false,
    })
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right')
    map.addControl(new AttributionControl({ compact: true, customAttribution: '© IGN – Géoplateforme' }))
  }
  catch {
    // MapLibre throws when WebGL is refused (disabled in the browser, blocked GPU, headless
    // Firefox on Linux). Without this, the whole page became a Nuxt error page.
    map = null
    indisponible.value = true
  }
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div
    ref="conteneur"
    class="carte"
    role="region"
    aria-label="Carte du massif du Dévoluy"
  >
    <p
      v-if="indisponible"
      class="indisponible"
    >
      La carte a besoin de WebGL, que ce navigateur n'autorise pas. Le reste du site fonctionne.
    </p>
  </div>
</template>

<style scoped>
.carte {
  position: absolute;
  inset: 0;
}

.indisponible {
  position: absolute;
  right: 16px;
  bottom: 16px;
  left: 16px;
  margin: 0;
  text-align: center;
  font-size: 14px;
  color: var(--pierre);
}
</style>
