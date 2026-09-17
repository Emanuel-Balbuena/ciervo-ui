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
        <h1 class="hero-title home-title" style="display: flex; justify-content: center; margin-bottom: 1rem;">
          <svg width="492" height="96" viewBox="0 0 492 96" fill="none" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; height: auto;">
            <path d="M471.41 94.72V29.44H490.61V94.72H471.41Z" fill="currentColor"/>
            <path d="M422.275 96C417.667 96 413.699 95.0187 410.371 93.056C407.128 91.008 404.654 88.32 402.947 84.992C401.24 81.5787 400.387 77.7813 400.387 73.6V29.44H419.587V69.888C419.587 73.472 420.483 76.16 422.275 77.952C424.067 79.744 426.584 80.64 429.827 80.64C432.728 80.64 435.288 79.9573 437.507 78.592C439.726 77.2267 441.475 75.3493 442.755 72.96C444.12 70.4853 444.803 67.6693 444.803 64.512L446.467 80.256C444.334 84.9493 441.219 88.7467 437.123 91.648C433.027 94.5493 428.078 96 422.275 96ZM445.187 94.72V79.36H444.803V29.44H464.003V94.72H445.187Z" fill="currentColor"/>
            <path d="M348.775 67.584V52.224H395.623V67.584H348.775Z" fill="currentColor"/>
            <path d="M309.746 96C302.578 96 296.263 94.592 290.802 91.776C285.426 88.8747 281.202 84.864 278.13 79.744C275.143 74.5387 273.65 68.5653 273.65 61.824C273.65 55.0827 275.143 49.1947 278.13 44.16C281.202 39.1253 285.426 35.2 290.802 32.384C296.263 29.568 302.578 28.16 309.746 28.16C316.999 28.16 323.314 29.568 328.69 32.384C334.151 35.2 338.375 39.1253 341.362 44.16C344.349 49.1947 345.842 55.0827 345.842 61.824C345.842 68.5653 344.306 74.5387 341.234 79.744C338.247 84.864 334.023 88.8747 328.562 91.776C323.186 94.592 316.914 96 309.746 96ZM309.746 80.896C312.733 80.896 315.421 80.128 317.81 78.592C320.285 77.056 322.247 74.88 323.698 72.064C325.149 69.1627 325.874 65.7067 325.874 61.696C325.874 55.808 324.295 51.2853 321.138 48.128C318.066 44.8853 314.269 43.264 309.746 43.264C305.223 43.264 301.383 44.8853 298.226 48.128C295.154 51.3707 293.618 55.8933 293.618 61.696C293.618 65.7067 294.343 69.1627 295.794 72.064C297.245 74.88 299.165 77.056 301.554 78.592C304.029 80.128 306.759 80.896 309.746 80.896Z" fill="currentColor"/>
            <path d="M234.182 94.72L208.454 29.44H229.062L249.158 90.368H238.406L258.374 29.44H278.47L252.742 94.72H234.182Z" fill="currentColor"/>
            <path d="M168.135 94.72V29.44H186.951V44.8H187.335V94.72H168.135ZM187.335 60.672L185.671 45.184C187.207 39.6373 189.724 35.4133 193.223 32.512C196.722 29.6107 201.074 28.16 206.279 28.16C207.9 28.16 209.095 28.3307 209.863 28.672V46.592C209.436 46.4213 208.839 46.336 208.071 46.336C207.303 46.2507 206.364 46.208 205.255 46.208C199.111 46.208 194.588 47.3173 191.687 49.536C188.786 51.6693 187.335 55.3813 187.335 60.672Z" fill="currentColor"/>
            <path d="M130.475 96C123.222 96 116.907 94.592 111.531 91.776C106.155 88.8747 101.974 84.864 98.987 79.744C96.0857 74.624 94.635 68.736 94.635 62.08C94.635 55.3387 96.0857 49.4507 98.987 44.416C101.974 39.296 106.112 35.328 111.403 32.512C116.694 29.6107 122.838 28.16 129.835 28.16C136.576 28.16 142.422 29.5253 147.371 32.256C152.32 34.9867 156.16 38.784 158.891 43.648C161.622 48.512 162.987 54.2293 162.987 60.8C162.987 62.1653 162.944 63.4453 162.859 64.64C162.774 65.7493 162.646 66.816 162.475 67.84H105.899V55.168H146.987L143.659 57.472C143.659 52.1813 142.379 48.2987 139.819 45.824C137.344 43.264 133.931 41.984 129.579 41.984C124.544 41.984 120.619 43.6907 117.803 47.104C115.072 50.5173 113.707 55.6373 113.707 62.464C113.707 69.12 115.072 74.0693 117.803 77.312C120.619 80.5547 124.8 82.176 130.347 82.176C133.419 82.176 136.064 81.664 138.283 80.64C140.502 79.616 142.166 77.952 143.275 75.648H161.323C159.19 81.9627 155.52 86.9547 150.315 90.624C145.195 94.208 138.582 96 130.475 96Z" fill="currentColor"/>
            <path d="M70.625 94.72V29.44H89.825V94.72H70.625Z" fill="currentColor"/>
            <path d="M34.688 96C27.8613 96 21.8453 94.5493 16.64 91.648C11.4347 88.7467 7.33867 84.736 4.352 79.616C1.45067 74.496 0 68.6507 0 62.08C0 55.5093 1.45067 49.664 4.352 44.544C7.33867 39.424 11.4347 35.4133 16.64 32.512C21.8453 29.6107 27.8613 28.16 34.688 28.16C40.4053 28.16 45.5253 29.2267 50.048 31.36C54.656 33.408 58.4107 36.2667 61.312 39.936C64.2987 43.6053 66.2187 47.9147 67.072 52.864H48.512C47.5733 49.7067 45.8667 47.3173 43.392 45.696C41.0027 44.0747 38.1867 43.264 34.944 43.264C31.872 43.264 29.184 44.032 26.88 45.568C24.6613 47.104 22.9547 49.28 21.76 52.096C20.5653 54.912 19.968 58.24 19.968 62.08C19.968 65.92 20.5653 69.248 21.76 72.064C22.9547 74.88 24.6613 77.056 26.88 78.592C29.184 80.128 31.872 80.896 34.944 80.896C38.1867 80.896 41.0027 80.0853 43.392 78.464C45.8667 76.8427 47.5733 74.4533 48.512 71.296H67.072C66.2187 76.2453 64.2987 80.5547 61.312 84.224C58.4107 87.8933 54.656 90.7947 50.048 92.928C45.5253 94.976 40.4053 96 34.688 96Z" fill="currentColor"/>
            <path d="M470.77 0V20.736H491.25V0H470.77Z" fill="#FF4D00"/>
            <path d="M69.985 0V20.736H90.465V0H69.985Z" fill="#FF4D00"/>
          </svg>
        </h1>
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
