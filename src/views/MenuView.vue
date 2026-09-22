<script setup lang="ts">
import { ref } from 'vue';
import Button from '../components/Button/Button.vue';
import Menu from '../components/Menu/Menu.vue';
import Slider from '../components/Slider/Slider.vue';

const isMenuOpen = ref(false);
const triggerOrigin = ref<HTMLElement | null>(null);

const config = ref({
  blur: 50,
  noiseOpacity: 0.25,
  noiseFrequency: 0.7,
  blobCount: 6,
  blobMinSize: 40,
  blobMaxSize: 100,
  blobSpeed: 0.15,
});

const handleOpen = (e: Event) => {
  triggerOrigin.value = e.currentTarget as HTMLElement;
  isMenuOpen.value = true;
};
</script>

<template>
  <div class="menu-view">
    <header class="top-nav">
      <Button variant="ghost" color="black" shape="round" size="small" @click="$router.push('/')">
        <template #icon>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </template>
      </Button>
    </header>

    <main class="content-area">
      <h1 class="page-title">Menú Ambiental</h1>
      <p class="page-subtitle">Ajusta los parámetros y abre el menú para ver el resultado en tiempo real.</p>
      
      <div class="controls-grid">
        <div class="control-group">
          <label>Difuminado (Blur): {{ config.blur }}px</label>
          <Slider v-model="config.blur" :min="0" :max="100" color="blue" />
        </div>
        <div class="control-group">
          <label>Opacidad del Ruido: {{ config.noiseOpacity.toFixed(2) }}</label>
          <Slider v-model="config.noiseOpacity" :min="0" :max="1" :step="0.05" color="orange" />
        </div>
        <div class="control-group">
          <label>Frecuencia de Ruido: {{ config.noiseFrequency.toFixed(2) }}</label>
          <Slider v-model="config.noiseFrequency" :min="0.1" :max="5" :step="0.1" color="orange" />
        </div>
        <div class="control-group">
          <label>Cantidad de Gotas: {{ config.blobCount }}</label>
          <Slider v-model="config.blobCount" :min="1" :max="20" :step="1" color="pink" />
        </div>
        <div class="control-group">
          <label>Velocidad de Gotas: {{ config.blobSpeed.toFixed(2) }}</label>
          <Slider v-model="config.blobSpeed" :min="0.01" :max="1" :step="0.01" color="green" />
        </div>
        <div class="control-group">
          <label>Tamaño Mínimo: {{ config.blobMinSize }}px</label>
          <Slider v-model="config.blobMinSize" :min="10" :max="100" color="violet" />
        </div>
        <div class="control-group">
          <label>Tamaño Máximo: {{ config.blobMaxSize }}px</label>
          <Slider v-model="config.blobMaxSize" :min="50" :max="300" color="violet" />
        </div>
      </div>

      <div style="margin-top: 3rem; text-align: center;">
        <Button variant="solid" color="black" shape="round" size="large" @click="handleOpen">
          <template #icon>
            <span data-morph-icon="menu-icon" style="display: inline-flex; align-items: center; justify-content: center; line-height: 1;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>
            </span>
          </template>
          <span data-morph-split="menu-title">Abrir Menú</span>
        </Button>
      </div>
    </main>

    <Menu 
      v-model:open="isMenuOpen" 
      :origin="triggerOrigin" 
      :blur="config.blur"
      :noiseOpacity="config.noiseOpacity"
      :noiseFrequency="config.noiseFrequency"
      :blobCount="config.blobCount"
      :blobMinSize="config.blobMinSize"
      :blobMaxSize="config.blobMaxSize"
      :blobSpeed="config.blobSpeed"
    />
  </div>
</template>

<style scoped>
.menu-view {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  padding: 2rem;
  font-family: 'Instrument Sans', sans-serif;
}
.top-nav {
  margin-bottom: 3rem;
}
.content-area {
  max-width: 800px;
  margin: 0 auto;
  text-align: left;
  padding-top: 4vh;
}
.page-title {
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  margin-bottom: 1rem;
}
.page-subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-bottom: 3rem;
}
.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  background: var(--bg-secondary, rgba(0,0,0,0.02));
  padding: 2rem;
  border-radius: 16px;
}
:root.dark .controls-grid {
  background: rgba(255,255,255,0.02);
}
.control-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}
</style>
