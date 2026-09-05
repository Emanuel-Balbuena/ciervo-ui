<script setup lang="ts">
import { onMounted } from 'vue';
import { bind } from 'cuelume';
import GlimmOverlay from './components/Glimm/GlimmOverlay.vue';

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
  <main>
    <RouterView />
  </main>
  <GlimmOverlay />
</template>