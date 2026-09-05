<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import Slider from '../components/Slider/Slider.vue';
import { useTheme } from '../composables/useTheme';

const router = useRouter();
const { isDark, toggleTheme } = useTheme();

// 1. Estado de Copiado para Snippets
const copiedSnippet = ref<string | null>(null);
const copyCode = async (code: string, id: string) => {
  try {
    await navigator.clipboard.writeText(code);
    copiedSnippet.value = id;
    setTimeout(() => {
      if (copiedSnippet.value === id) copiedSnippet.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
  }
};

// 2. Laboratorio Interactivo de Props
type ColorType = 'black' | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'cyan' | 'blue' | 'violet' | 'pink';
type OrientationType = 'horizontal' | 'vertical';

const playground = ref({
  value: 50 as number | number[],
  color: 'orange' as ColorType,
  orientation: 'horizontal' as OrientationType,
  disabled: false,
  step: 0,
  mode: 'single' as 'single' | 'range' | 'multiple',
  independentThumbs: false,
  coloredTrack: false,
  sound: true
});

watch(() => playground.value.mode, (newMode) => {
  if (newMode === 'single') playground.value.value = 50;
  else if (newMode === 'range') playground.value.value = [25, 75];
  else if (newMode === 'multiple') playground.value.value = [20, 50, 80];
});

// Valores independientes para las secciones de historias (showcase-row)
const brightnessValue = ref(60);

// --- KINETIC FOLLOW DEMO ---
const kineticContainerRef = ref<HTMLElement | null>(null);
const kineticValue = ref(50);

function handleKineticWrapperHover(e: MouseEvent) {
  if (!kineticContainerRef.value) return;
  const rect = kineticContainerRef.value.getBoundingClientRect();
  const rawPos = e.clientX - rect.left;
  const percent = (rawPos / rect.width) * 100;
  kineticValue.value = percent;
}

// --- WALL COLLISIONS DEMO ---
const wallContainerRef = ref<HTMLElement | null>(null);
const wallValue = ref(50);

function handleWallWrapperHover(e: MouseEvent) {
  if (!wallContainerRef.value) return;
  const rect = wallContainerRef.value.getBoundingClientRect();
  const rawPos = e.clientX - rect.left;
  const percent = (rawPos / rect.width) * 100;
  wallValue.value = percent;
}

// Valores independientes para la Matriz Visual
const matrixValues = ref([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);

// Listas de tokens
const colorsList: ColorType[] = ['orange', 'blue', 'red', 'yellow', 'black', 'green', 'cyan', 'lime', 'violet', 'pink'];

// Mapeo visual de dots de color para el selector
const colorDotMap: Record<ColorType, string> = {
  orange: '#f97316',
  blue: '#3b82f6',
  red: '#ef4444',
  yellow: '#facc15',
  black: '#ffffff',
  green: '#22c55e',
  cyan: '#06b6d4',
  lime: '#84cc16',
  violet: '#a855f7',
  pink: '#ec4899'
};

// Generador de código Vue en tiempo real
const generatedPlaygroundCode = computed(() => {
  const parts: string[] = ['<Slider'];
  if (Array.isArray(playground.value.value)) {
    const formattedArray = `[${playground.value.value.map(v => Math.round(v)).join(', ')}]`;
    parts.push(`:modelValue="${formattedArray}"`);
  } else {
    parts.push(`v-model="sliderValue"`);
  }
  if (playground.value.color !== 'orange') parts.push(`color="${playground.value.color}"`);
  if (playground.value.orientation !== 'horizontal') parts.push(`orientation="${playground.value.orientation}"`);
  
  if (playground.value.step > 0) parts.push(`:step="${Math.round(playground.value.step)}"`);
  if (playground.value.disabled) parts.push(`disabled`);
  if (playground.value.independentThumbs && playground.value.mode !== 'single') parts.push(`independentThumbs`);
  if (playground.value.coloredTrack) parts.push(`coloredTrack`);
  if (playground.value.sound) parts.push(`sound`);
  
  return parts.join(' ') + ' />';
});

// Filtro para matriz visual completa
const selectedMatrixColor = ref<string>('all');
</script>

<template>
  <div class="demo-wrapper" :class="isDark ? 'theme-dark' : 'theme-light'">
    <div class="demo-container">
      
      <!-- =========================================
           1. BARRA SUPERIOR DE METADATOS Y TEMA
           ========================================= -->
      <header class="top-nav">
        <div class="meta-tag">
          <Button 
            variant="ghost" 
            color="black" 
            shape="round" 
            size="small"
            @click="router.push('/')"
          >
            ← Volver a componentes
          </Button>
          <span class="meta-divider">·</span>
          <span>v0.1.0</span>
          <span class="meta-divider">·</span>
          <span>Slider</span>
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

      <!-- =========================================
           2. HERO PRINCIPAL
           ========================================= -->
      <section class="hero-section">
        <h1 class="hero-title">slider</h1>
        <p class="hero-subtitle">
          Un slider orgánico y fluido impulsado por físicas de resortes (spring engine de sbt) y filtros SVG gooey. 
          Presenta zero layout shift, estiramiento cinético y aplastamiento por colisión en los bordes.
        </p>

        <!-- Tarjeta de Instalación Rápida -->
        <div class="install-card">
          <code class="install-code">npm install ciervo-ui</code>
          <button class="copy-btn" @click="copyCode('npm install ciervo-ui', 'install')" title="Copiar comando">
            <span v-if="copiedSnippet === 'install'" class="copied-badge">Copiado</span>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </section>

      <!-- =========================================
           3. LABORATORIO INTERACTIVO DE PROPS
           ========================================= -->
      <section class="playground-section-container">
        <div class="section-header-wrap">
          <h2 class="section-title">Laboratorio Interactivo</h2>
          <p class="section-text">
            Arrastra el control de forma agresiva para observar el estiramiento cinético, o lánzalo contra los bordes para desencadenar la colisión elástica. Modifica las props para ver los cambios en tiempo real.
          </p>
        </div>

        <!-- LIENZO DE PREVIEW DEL LABORATORIO -->
        <div class="stage-canvas-card" style="min-height: 380px; display: flex; align-items: center; justify-content: center; padding: 48px 24px;">
          
          <!-- LAYOUT HORIZONTAL -->
          <div v-if="playground.orientation === 'horizontal'" style="width: 100%; max-width: 500px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 28px; font-weight: 500; font-size: 14px; opacity: 0.6; font-variant-numeric: tabular-nums;">
              <span>Valor Actual</span>
              <span>{{ Array.isArray(playground.value) ? `[${playground.value.map(v => Math.round(v)).join(', ')}]` : Math.round(playground.value as number) }}%</span>
            </div>
            <!-- Bloque puro sin restricciones flex -->
            <div style="width: 100%;">
              <Slider 
                v-model="playground.value"
                :color="playground.color"
                orientation="horizontal"
                :step="Math.round(playground.step)"
                :disabled="playground.disabled"
                :independentThumbs="playground.independentThumbs"
                :coloredTrack="playground.coloredTrack"
                :sound="playground.sound"
              />
            </div>
          </div>

          <!-- LAYOUT VERTICAL -->
          <div v-else style="width: 140px; display: flex; flex-direction: column; align-items: center;">
            <div style="margin-bottom: 28px; font-weight: 500; font-size: 14px; opacity: 0.6; font-variant-numeric: tabular-nums;">
              Valor: {{ Array.isArray(playground.value) ? `[${playground.value.map(v => Math.round(v)).join(', ')}]` : Math.round(playground.value as number) }}%
            </div>
            <!-- Contenedor estricto con altura fija -->
            <div style="height: 180px; display: flex; justify-content: center; width: 100%;">
              <Slider 
                v-model="playground.value"
                :color="playground.color"
                orientation="vertical"
                :step="Math.round(playground.step)"
                :disabled="playground.disabled"
                :independentThumbs="playground.independentThumbs"
                :coloredTrack="playground.coloredTrack"
                :sound="playground.sound"
              />
            </div>
          </div>

        </div>
        
        <!-- FILAS DE CONTROL DE PROPS -->
        <div class="props-inspector-list">
          
          <h3 style="margin: 1rem 0 0.5rem; font-size: 1rem; font-weight: 600; text-transform: lowercase; letter-spacing: 0.02em; color: var(--cuelume-gray-500)">Apariencia</h3>

          <!-- PROP: COLOR -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">color</span>
              <span class="prop-type-signature">10 temas cromáticos</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group color-dots-pill-group">
                <button
                  v-for="c in colorsList"
                  :key="c"
                  :class="['color-dot-item', { active: playground.color === c }]"
                  :title="c"
                  @click="playground.color = c"
                >
                  <span class="dot-circle" :style="{ backgroundColor: colorDotMap[c] }"></span>
                </button>
              </div>
            </div>
          </div>

          <!-- PROP: ORIENTATION -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">orientation</span>
              <span class="prop-type-signature">horizontal | vertical</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  :class="['segment-pill-btn', { active: playground.orientation === 'horizontal' }]"
                  @click="playground.orientation = 'horizontal'"
                >
                  horizontal
                </button>
                <button
                  :class="['segment-pill-btn', { active: playground.orientation === 'vertical' }]"
                  @click="playground.orientation = 'vertical'"
                >
                  vertical
                </button>
              </div>
            </div>
          </div>

          <h3 style="margin: 1.5rem 0 0.5rem; font-size: 1rem; font-weight: 600; text-transform: lowercase; letter-spacing: 0.02em; color: var(--cuelume-gray-500)">Estados & Valor</h3>

          <!-- PROP: MODE -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">API Mode</span>
              <span class="prop-type-signature">Single | Range | Multi</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  :class="['segment-pill-btn', { active: playground.mode === 'single' }]"
                  @click="playground.mode = 'single'"
                >
                  Single
                </button>
                <button
                  :class="['segment-pill-btn', { active: playground.mode === 'range' }]"
                  @click="playground.mode = 'range'"
                >
                  Range
                </button>
                <button
                  :class="['segment-pill-btn', { active: playground.mode === 'multiple' }]"
                  @click="playground.mode = 'multiple'"
                >
                  Multi
                </button>
              </div>
            </div>
          </div>

          <!-- PROP: INDEPENDENT THUMBS -->
          <div class="prop-control-row" :style="{ opacity: playground.mode === 'single' ? 0.5 : 1, pointerEvents: playground.mode === 'single' ? 'none' : 'auto' }">
            <div class="prop-info-col">
              <span class="prop-name">independentThumbs</span>
              <span class="prop-type-signature">Boolean</span>
            </div>
            <div class="prop-input-col" style="justify-content: flex-end;">
              <button 
                class="sleek-checkbox"
                aria-label="Toggle independent thumbs"
                :class="{ checked: playground.independentThumbs }"
                @click="playground.independentThumbs = !playground.independentThumbs"
                role="checkbox"
                :aria-checked="playground.independentThumbs"
              >
                <svg v-if="playground.independentThumbs" viewBox="0 0 24 24" class="check-svg">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- PROP: COLORED TRACK -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">coloredTrack</span>
              <span class="prop-type-signature">Boolean</span>
            </div>
            <div class="prop-input-col" style="justify-content: flex-end;">
              <button 
                class="sleek-checkbox"
                aria-label="Toggle colored track"
                :class="{ checked: playground.coloredTrack }"
                @click="playground.coloredTrack = !playground.coloredTrack"
                role="checkbox"
                :aria-checked="playground.coloredTrack"
              >
                <svg v-if="playground.coloredTrack" viewBox="0 0 24 24" class="check-svg">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- PROP: DISABLED -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">disabled</span>
              <span class="prop-type-signature">boolean</span>
            </div>
            <div class="prop-input-col">
              <button 
                class="sleek-checkbox"
                aria-label="Toggle disabled state"
                :class="{ checked: playground.disabled }"
                @click="playground.disabled = !playground.disabled"
                role="checkbox"
                :aria-checked="playground.disabled"
              >
                <svg v-if="playground.disabled" viewBox="0 0 24 24" class="check-svg">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- PROP: SOUND -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">sound</span>
              <span class="prop-type-signature">Boolean</span>
            </div>
            <div class="prop-input-col" style="justify-content: flex-end;">
              <button 
                class="sleek-checkbox"
                aria-label="Toggle sound"
                :class="{ checked: playground.sound }"
                @click="playground.sound = !playground.sound"
                role="checkbox"
                :aria-checked="playground.sound"
              >
                <svg v-if="playground.sound" viewBox="0 0 24 24" class="check-svg">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- PROP: STEP -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">step</span>
              <span class="prop-type-signature">number (0 = continuous)</span>
            </div>
            <div class="prop-input-col">
              <div style="width: 280px; display: flex; flex-direction: column; gap: 12px;">
                <Slider v-model="playground.step" :min="0" :max="25" color="blue" style="width: 60%; align-self: flex-end;" />
                <div style=" width: 60%; align-self: flex-end; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                  <span style="flex: 1; text-align: left;">0</span>
                  <span style="flex: 1; text-align: center; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: 12px;">{{ Math.round(playground.step) }}</span>
                  <span style="flex: 1; text-align: right;">25</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- GENERADOR DE CÓDIGO VUE DINÁMICO -->
        <div class="code-card playground-code-card">
          <div class="snippet-top-bar">
            <span class="snippet-label">Código Vue Generado</span>
            <button class="snippet-copy-btn" @click="copyCode(generatedPlaygroundCode, 'playground-gen')">
              <span v-if="copiedSnippet === 'playground-gen'" class="copied-badge">Copiado</span>
              <span v-else class="copy-text">Copiar Código</span>
            </button>
          </div>
          <pre class="pre-block"><code>{{ generatedPlaygroundCode }}</code></pre>
        </div>
      </section>

      <!-- =========================================
           4. DISEÑO E INGENIERÍA
           ========================================= -->
      
      <!-- Estiramiento Cinético -->
      <section class="story-section">
        <h2 class="section-title">Estiramiento Cinético (Kinetic Stretch)</h2>
        <p class="section-text">
          El círculo principal (thumb) se deforma dinámicamente en un óvalo basándose en su velocidad real. A medida que arrastras más rápido, se estira a lo largo del eje de movimiento y se aplasta perpendicularmente para conservar su volumen visual, emulando perfectamente una gota de líquido cortando el aire.
        </p>
        <div 
          class="showcase-row" 
          style="padding: 60px 20px; justify-content: center; cursor: crosshair;"
          @mousemove="handleKineticWrapperHover"
          @mouseleave="kineticValue = 50"
        >
          <div 
            class="demo-no-track"
            ref="kineticContainerRef"
            style="width: 100%; padding: 20px 0;"
          >
            <Slider v-model="kineticValue" color="blue" style="width: 100%; pointer-events: none;" />
          </div>
        </div>
      </section>

      <!-- Colisiones Elásticas -->
      <section class="story-section">
        <h2 class="section-title">Colisiones Elásticas (Wall Collisions)</h2>
        <p class="section-text">
          Al lanzarlo contra los límites del 0% o 100%, el slider no solo se detiene. Convierte la inercia física restante en un coeficiente de aplastamiento, aplanando agresivamente el pulgar contra la pared mientras mantiene el borde exterior perfectamente alineado con el límite de la pista.
        </p>
        <div 
          class="showcase-row" 
          style="padding: 60px 20px; justify-content: center; cursor: crosshair;"
          @mousemove="handleWallWrapperHover"
          @mouseleave="wallValue = 50"
        >
          <div 
            class="demo-no-track demo-walls"
            ref="wallContainerRef"
            style="width: 100%; max-width: 250px; padding: 20px 0; position: relative;"
          >
            <!-- Las paredes -->
            <div class="wall-line wall-left"></div>
            <div class="wall-line wall-right"></div>
            <Slider v-model="wallValue" color="pink" sound style="width: 100%; pointer-events: none;" />
          </div>
        </div>
      </section>

      <!-- Range y Múltiples -->
      <section class="story-section">
        <h2 class="section-title">Múltiples Thumbs</h2>
        <p class="section-text">
          Pasa un arreglo a <code>modelValue</code> o <code>defaultValue</code> para activar instantáneamente el modo Range. Los thumbs compartirán la misma malla SVG generada por el filtro Gooey, por lo que si los acercas demasiado, ¡se fusionarán como gotas de agua! Pruébalo arrastrando los extremos.
        </p>
        <div class="showcase-row" style="padding: 40px 20px; justify-content: center;">
          <Slider :defaultValue="[20, 80]" color="green" style="width: 100%; max-width: 400px;" />
        </div>
      </section>

      <!-- Offset Inteligente -->
      <section class="story-section">
        <h2 class="section-title">Offset Inteligente</h2>
        <p class="section-text">
          Para mantener el centro geométrico exactamente en el extremo de la pista, la mitad del círculo sobresale. Un mecanismo inteligente memoriza dónde hiciste clic en esa protuberancia para garantizar un movimiento 1:1 inmediato, eliminando las "zonas muertas" al arrastrar hacia el interior.
        </p>
        <div class="showcase-row" style="padding: 60px 20px; justify-content: center;">
          <div class="demo-hitbox" style="width: 100%; max-width: 400px; display: flex; justify-content: center;">
            <Slider v-model="brightnessValue" color="orange" style="width: 100%;" />
          </div>
        </div>
      </section>

      <!-- =========================================
           5. MATRIZ VISUAL DE COLOR
           ========================================= -->
      <section class="matrix-section">
        <div class="section-header-wrap">
          <h2 class="section-title">Matriz Visual de Color</h2>
          <p class="section-text">
            El slider es totalmente compatible con los 10 colores del sistema. La pista y el relleno mantienen un gris minimalista unificado para asegurar que el componente líquido brillante siga siendo el punto focal de la interacción.
          </p>
        </div>

        <div class="matrix-filter-bar">
          <span class="matrix-filter-label">Filtrar Color:</span>
          <div class="color-dots-pill-group">
            <button 
              :class="['color-dot-item', { active: selectedMatrixColor === 'all' }]"
              title="Todos los colores"
              @click="selectedMatrixColor = 'all'"
            >
              <span class="dot-circle" style="background: linear-gradient(135deg, #f97316, #3b82f6, #ec4899);"></span>
            </button>
            <button
              v-for="c in colorsList"
              :key="c"
              :class="['color-dot-item', { active: selectedMatrixColor === c }]"
              :title="c"
              @click="selectedMatrixColor = c"
            >
              <span class="dot-circle" :style="{ backgroundColor: colorDotMap[c] }"></span>
            </button>
          </div>
        </div>

        <div class="matrix-grid-container">
          <template v-for="(c, index) in colorsList" :key="c">
            <div v-if="selectedMatrixColor === 'all' || selectedMatrixColor === c" class="color-system-card">
              <div class="color-card-header" style="margin-bottom: 24px;">
                <span class="color-dot" :style="{ backgroundColor: colorDotMap[c] }"></span>
                <span class="color-title">{{ c.toUpperCase() }}</span>
              </div>
              <div style="width: 100%; display: flex; align-items: center; justify-content: center; padding: 20px 0;">
                <Slider v-model="matrixValues[index]" :color="c" style="width: 100%;" />
              </div>
            </div>
          </template>
        </div>
      </section>

      <!-- =========================================
           8. PIE DE PÁGINA
           ========================================= -->
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
/* =========================================================
   DEMO: KINETIC HOVER (NO TRACK)
   ========================================================= */
.demo-no-track :deep(.slider-track) {
  background: transparent !important;
}
.demo-no-track :deep(.slider-fill) {
  display: none !important;
}

/* =========================================================
   DEMO: WALL COLLISIONS
   ========================================================= */
.demo-walls .wall-line {
  position: absolute;
  top: 50%;
  width: 3px;
  height: 32px;
  background: var(--surface-highest, #E7E7E7);
  border-radius: 4px;
}
.demo-walls .wall-left {
  left: -8px;
  transform: translate(-50%, -50%);
}
.demo-walls .wall-right {
  right: -8px;
  transform: translate(50%, -50%);
}

/* =========================================================
   DEMO: SMART HIT-BOX
   ========================================================= */
.demo-hitbox :deep(.ciervo-slider::before) {
  background-color: rgba(255, 165, 0, 0.1) !important;
  border: 1px dashed rgba(255, 165, 0, 0.5) !important;
}
</style>