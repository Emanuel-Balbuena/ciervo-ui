<script setup lang="ts">
import { onMounted } from 'vue';
import { bind } from 'cuelume';
import GlimmOverlay from './components/Glimm/GlimmOverlay.vue';
import PullCord from './components/PullCord/PullCord.vue';
import { useTheme } from './composables/useTheme';

const { toggleTheme, accent } = useTheme();

onMounted(() => {
  try {
    const isMobileOrTouch = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    if (!isMobileOrTouch) {
      bind();
    }
  } catch (e) {
    console.warn('Cuelume bind:', e);
  }
});
</script>

<template>
  <div id="app-content" style="background-color: var(--page-bg); min-height: 100vh; overflow-x: hidden; position: relative; z-index: 1;">
    <main>
      <RouterView />
    </main>
    <GlimmOverlay />
  </div>
  <PullCord
    variant="kinetic"
    :sound="true"
    :style="{ '--pullcord-ink': accent.hex, '--pullcord-right': 'calc(2rem + var(--apr-scrollbar-compensation, 0px))' }"
    @pull="toggleTheme"
  />
</template>