<script setup lang="ts">
const { data: health } = await useFetch('/api/health', {
  server: false,
  default: () => null,
  ignoreResponseError: true,
})

const status = computed(() => {
  if (!health.value) return { label: 'Vérification…', ok: null }
  if (health.value.status === 'ok') return { label: 'Base de données connectée', ok: true }
  return { label: 'Base de données injoignable', ok: false }
})

useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <main class="page">
    <CarteIgn />
    <header class="panneau">
      <p class="surtitre">
        Phase 1 · fondations
      </p>
      <h1 class="titre">
        Obiou <span>Sommets</span>
      </h1>
      <p class="texte">
        Le carnet des sommets gravis dans les Alpes et en Corée du Sud arrive bientôt.
      </p>
      <p
        class="statut"
        :data-ok="status.ok"
        aria-live="polite"
      >
        <span class="pastille" />
        {{ status.label }}
      </p>
    </header>
  </main>
</template>

<style scoped>
.page {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.panneau {
  position: absolute;
  top: 16px;
  left: 16px;
  max-width: min(380px, calc(100% - 32px));
  padding: 18px 20px;
  border: 1px solid var(--trait);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: 0 2px 4px rgb(31 42 46 / 8%), 0 16px 40px rgb(31 42 46 / 16%);
}

.surtitre {
  margin: 0;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--pierre);
}

.titre {
  margin: 4px 0 8px;
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
}

.titre span {
  font-weight: 500;
  color: var(--pierre);
}

.texte {
  margin: 0 0 14px;
  font-size: 15px;
  line-height: 1.5;
}

.statut {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13.5px;
  color: var(--pierre);
}

.pastille {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--trait);
}

.statut[data-ok='true'] .pastille {
  background: var(--alpage);
}

.statut[data-ok='false'] .pastille {
  background: var(--alerte);
}
</style>
