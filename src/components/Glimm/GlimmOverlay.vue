<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useGlimm } from '../../composables/useGlimm';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { registerCanvas, unregisterCanvas } = useGlimm();

onMounted(() => {
  if (canvasRef.value) {
    registerCanvas(canvasRef.value);
  }
});

onUnmounted(() => {
  unregisterCanvas();
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="glimm-fullscreen-canvas"
    aria-hidden="true"
  />
</template>

<style scoped>
.glimm-fullscreen-canvas {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 99999;
}
</style>
