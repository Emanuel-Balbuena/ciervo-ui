<script setup lang="ts">
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import { useTheme } from '../composables/useTheme';

const router = useRouter();
const { isDark, toggleTheme } = useTheme();

function navigateTo(path: string) {
  router.push(path);
}
</script>

<template>
  <div class="demo-wrapper" :class="isDark ? 'theme-dark' : 'theme-light'">
    <div class="demo-container home-container">
      
      <!-- TOP NAV -->
      <header class="top-nav">
        <div class="meta-tag">
          <span>ciervo-ui</span>
          <span class="meta-divider">·</span>
          <span>v0.1.0</span>
          <span class="meta-divider">·</span>
          <span>MIT</span>
        </div>
        
        <div class="theme-toggle">
          <Button 
            variant="ghost" 
            color="black" 
            shape="round" 
            size="small"
            @click="toggleTheme"
          >
            {{ isDark ? 'Light' : 'Dark' }}
          </Button>
        </div>
      </header>

      <!-- HERO CENTRAL -->
      <section class="home-hero">
        <h1 class="hero-title home-title">ciervo-ui</h1>
        <p class="hero-subtitle home-subtitle">
          Una suite de componentes nacida de la exploración física, acústica y tipográfica. Selecciona un componente para abrir su laboratorio interactivo y explorar su matriz de diseño.
        </p>

        <!-- LOS DOS BOTONES PRINCIPALES SOLID -->
        <div class="home-components-grid">
          <Button
            variant="solid"
            color="black"
            size="large"
            shape="round"
            class="home-component-btn"
            @click="navigateTo('/button')"
          >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="6" width="18" height="12" rx="4"></rect>
                <circle cx="9" cy="12" r="1.5" fill="currentColor"></circle>
              </svg>
            </template>
            Button
          </Button>

          <Button
            variant="solid"
            color="orange"
            size="large"
            shape="round"
            class="home-component-btn"
            @click="navigateTo('/button-group')"
          >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="6" width="9" height="12" rx="3"></rect>
                <rect x="13" y="6" width="9" height="12" rx="3"></rect>
              </svg>
            </template>
            ButtonGroup
          </Button>

          <Button
            variant="solid"
            color="blue"
            size="large"
            shape="round"
            class="home-component-btn"
            @click="navigateTo('/toggle')"
          >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="6" width="20" height="12" rx="6"></rect>
                <circle cx="8" cy="12" r="3" fill="currentColor"></circle>
              </svg>
            </template>
            Toggle
          </Button>

          <Button
            variant="solid"
            color="violet"
            size="large"
            shape="round"
            class="home-component-btn"
            @click="navigateTo('/toggle-group')"
          >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 6h16M4 12h10M4 18h14"></path>
                <circle cx="18" cy="12" r="2" fill="currentColor"></circle>
              </svg>
            </template>
            ToggleGroup
          </Button>

          <Button
            variant="solid"
            color="pink"
            size="large"
            shape="round"
            class="home-component-btn"
            @click="navigateTo('/slider')"
          >
            <template #icon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12h18"></path>
                <circle cx="15" cy="12" r="4" fill="currentColor"></circle>
              </svg>
            </template>
            Slider
          </Button>
        </div>

        <!-- EXPERIMENTAL LABS -->
        <div style="margin-top: 40px; border-top: 1px solid var(--card-border, rgba(255, 255, 255, 0.08)); padding-top: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <h3 style="font-size: 14px; font-weight: 600; margin: 0; color: var(--text-primary);">Laboratorio Experimental WebGL</h3>
            <p style="font-size: 12px; color: var(--text-secondary); margin: 3px 0 0 0;">Transiciones cinemáticas shader (Glimm)</p>
          </div>
          <Button
            variant="soft"
            color="orange"
            size="small"
            shape="round"
            @click="navigateTo('/glimm-lab')"
          >
            Abrir Glimm Lab →
          </Button>
        </div>
      </section>

      <!-- FOOTER -->
      <footer class="demo-footer">
        <div class="footer-content">
          <span>ciervo-ui · Crafted with Instrument Sans & Cuelume</span>
          <Button 
            variant="ghost" 
            color="black" 
            shape="round" 
            size="small"
            as="a"
            href="https://github.com/Emanuel-Balbuena/ciervo-ui"
            target="_blank"
          >
            GitHub
          </Button>
        </div>
      </footer>

    </div>
  </div>
</template>

<style scoped>
.home-container {
  min-height: 80vh;
  justify-content: space-between;
}

.home-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 24px;
  padding: 40px 0;
}

.home-badge {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-tertiary);
  background: var(--pill-bg);
  border: 1px solid var(--pill-border);
  padding: 4px 12px;
  border-radius: 9999px;
}

.home-title {
  font-size: clamp(48px, 9vw, 72px);
  letter-spacing: -0.05em;
  margin: 0;
}

.home-subtitle {
  max-width: 580px;
  margin: 0 auto;
}

.home-components-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin-top: 16px;
}

.home-component-btn {
  min-width: 180px;
  height: 48px !important;
  font-size: 16px !important;
}
</style>
