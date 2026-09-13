<script setup lang="ts">
import { AttributionControl, Map as MapLibreMap, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const props = withDefaults(defineProps<{
  center?: [number, number]
  zoom?: number
}>(), {
  // Massif du Dévoluy.
  center: () => [5.88, 44.72],
  zoom: 10.5,
})

const container = ref<HTMLDivElement | null>(null)
let map: MapLibreMap | null = null

onMounted(() => {
  if (!container.value) return
  map = new MapLibreMap({
    container: container.value,
    style: 'https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/standard.json',
    center: props.center,
    zoom: props.zoom,
    attributionControl: false,
  })
  map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right')
  map.addControl(new AttributionControl({ compact: true, customAttribution: '© IGN – Géoplateforme' }))
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div
    ref="container"
    class="carte"
    role="region"
    aria-label="Carte du massif du Dévoluy"
  />
</template>

<style scoped>
.carte {
  position: absolute;
  inset: 0;
}
</style>
