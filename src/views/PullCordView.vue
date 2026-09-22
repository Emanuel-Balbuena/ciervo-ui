<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import Slider from '../components/Slider/Slider.vue';
import PullCord from '../components/PullCord/PullCord.vue';
import { useTheme } from '../composables/useTheme';

const router = useRouter();
const { isDark } = useTheme();

// 1. Estado de copiado para snippets
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

// 2. Laboratorio interactivo de props
type ColorType = 'black' | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'cyan' | 'blue' | 'violet' | 'pink';
type CordVariant = 'solid' | 'membrane' | 'kinetic';

const playground = ref({
  variant: 'kinetic' as CordVariant,
  color: 'orange' as ColorType,
  size: 7,
  rope: 1.5,
  length: 140,
  sound: true
});

// Llave para rejugar el nacimiento (re-monta el cord y repite la caida)
const stageKey = ref(0);
const replayEntrance = () => stageKey.value++;

// Fisica compartida (los valores que ya trae el demo)
const config = reactive({
  gravity: 1250,
  damping: 0.94,
  iterations: 20,
  stretchMax: 26,
  stretchToggle: 20,
  maxVelocity: 22,
  sleepVelocity: 0.01,
  breakMultiplier: 2,
  surgeVelocity: 1800
});

const count = ref(0);
function onPull() {
  count.value++;
}

// Mapa de tinta real para la cuerda (preview de la futura prop `color`)
const inkMap: Record<ColorType, string> = {
  black: '#2b2b2e',
  red: '#ff0b0a',
  orange: '#ff4d00',
  yellow: '#eab308',
  lime: '#a3e635',
  green: '#22c55e',
  cyan: '#06b6d4',
  blue: '#4259f6',
  violet: '#8b5cf6',
  pink: '#ff1493'
};
const playgroundInk = computed(() => inkMap[playground.value.color]);

// Dots del selector (mismo lenguaje que SliderView)
const colorsList: ColorType[] = ['orange', 'blue', 'red', 'yellow', 'black', 'green', 'cyan', 'lime', 'violet', 'pink'];
const colorDotMap: Record<ColorType, string> = {
  orange: '#ff4d00',
  blue: '#4259f6',
  red: '#ff0b0a',
  yellow: '#ffb830',
  black: isDark.value ? '#ffffff' : '#000000',
  green: '#22c55e',
  cyan: '#06b6d4',
  lime: '#a3e635',
  violet: '#9333ea',
  pink: '#ff1493'
};
const variantsList: CordVariant[] = ['solid', 'membrane', 'kinetic'];

// Codigo Vue ejecutable con la API actual.
// `color` y `ropeSize` aun no existen como props: se previsualizan
// via `--pullcord-ink` y override CSS de `stroke-width`.
const generatedPlaygroundCode = computed(() => {
  const parts: string[] = ['<PullCord'];
  parts.push(`variant="${playground.value.variant}"`);
  parts.push(`:thumbRadius="${playground.value.size}"`);
  if (playground.value.rope !== 1.5) parts.push(`:ropeSize="${playground.value.rope}"`);
  if (playground.value.length !== 176) parts.push(`:cordLength="${playground.value.length}"`);
  parts.push(`:config="{ gravity: ${Math.round(config.gravity)}, damping: ${config.damping}, breakMultiplier: ${config.breakMultiplier}, surgeVelocity: ${Math.round(config.surgeVelocity)} }"`);
  parts.push(`style="--pullcord-ink: ${playgroundInk.value};"`);
  return parts.join(' ') + ' @pull="onPull" />';
});

// Filtro para la matriz visual de color
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
          <span>PullCord</span>
        </div>
      </header>

      <!-- =========================================
           2. HERO PRINCIPAL
           ========================================= -->
      <section class="hero-section">
        <h1 class="hero-title">pullcord</h1>
        <p class="hero-subtitle">
          Una cuerda con fisica real (integracion de Verlet dentro de motionLoop) que se jala para disparar acciones.
          Elige variante, color, tamaño y calibre de la cuerda, y ajusta la fisica en tiempo real.
        </p>

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
            Jala la borla hacia abajo hasta sentir el disparo, o arrastrala de lado para ver el latigo.
            Llevas {{ count }} pulls. Usa “Rejugar caida” para repetir el nacimiento cuantas veces quieras.
          </p>
        </div>

        <!-- LIENZO DE PREVIEW -->
        <div class="stage-canvas-card" style="position: relative; min-height: 280px; display: flex; align-items: stretch; justify-content: center; padding: 32px 24px 24px;">
          <Button 
            variant="soft" 
            color="black" 
            shape="square" 
            size="small" 
            iconOnly 
            @click="replayEntrance"
            style="position: absolute; top: 12px; right: 12px;"
            title="Rejugar caida"
            :sound="false"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
          </Button>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
            <div
              class="cord-stage rope-preview"
              :style="{ '--pullcord-ink': playgroundInk }"
            >
              <PullCord
                :key="stageKey"
                :variant="playground.variant"
                :thumbRadius="playground.size"
                :ropeSize="playground.rope"
                :cordLength="playground.length"
                :sound="playground.sound"
                :config="config"
                style="position: relative; right: auto; top: auto; left: auto;"
                @pull="onPull"
              />
            </div>
          </div>
        </div>

        <!-- FILAS DE CONTROL DE PROPS -->
        <div class="props-inspector-list">

          <h3 style="margin: 1rem 0 0.5rem; font-size: 1rem; font-weight: 600; text-transform: lowercase; letter-spacing: 0.02em; color: var(--cuelume-gray-500)">Apariencia</h3>

          <!-- PROP: VARIANT -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">variant</span>
              <span class="prop-type-signature">solid | membrane | kinetic</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  v-for="v in variantsList"
                  :key="v"
                  :class="['segment-pill-btn', { active: playground.variant === v }]"
                  @click="playground.variant = v"
                >
                  {{ v }}
                </button>
              </div>
            </div>
          </div>

          <!-- PROP: SOUND -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">sound</span>
              <span class="prop-type-signature">boolean</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  :class="['segment-pill-btn', { active: playground.sound === true }]"
                  @click="playground.sound = true"
                >
                  true
                </button>
                <button
                  :class="['segment-pill-btn', { active: playground.sound === false }]"
                  @click="playground.sound = false"
                >
                  false
                </button>
              </div>
            </div>
          </div>

          <!-- PROP: COLOR (preview via --pullcord-ink) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">color</span>
              <span class="prop-type-signature">10 temas cromaticos</span>
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

          <!-- PROP: TAMAÑO (thumbRadius) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">tamaño</span>
              <span class="prop-type-signature">number (4 - 32)</span>
            </div>
            <div class="prop-input-col">
              <div style="width: 280px; display: flex; flex-direction: column; gap: 12px;">
                <Slider v-model="playground.size" :min="4" :max="32" color="green" style="width: 60%; align-self: flex-end;" />
                <div style=" width: 60%; align-self: flex-end; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                  <span style="flex: 1; text-align: left;">4</span>
                  <span style="flex: 1; text-align: center; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: 12px;">{{ Math.round(playground.size) }}</span>
                  <span style="flex: 1; text-align: right;">32</span>
                </div>
              </div>
            </div>
          </div>

          <!-- PROP: CALIBRE DE LA CUERDA (preview CSS, prop propuesta ropeSize) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">cuerda</span>
              <span class="prop-type-signature">number (1 - 8) · prop propuesta</span>
            </div>
            <div class="prop-input-col">
              <div style="width: 280px; display: flex; flex-direction: column; gap: 12px;">
                <Slider v-model="playground.rope" :min="1" :max="8" :step="0.5" color="blue" style="width: 60%; align-self: flex-end;" />
                <div style=" width: 60%; align-self: flex-end; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                  <span style="flex: 1; text-align: left;">1</span>
                  <span style="flex: 1; text-align: center; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: 12px;">{{ playground.rope.toFixed(1) }}px</span>
                  <span style="flex: 1; text-align: right;">8</span>
                </div>
              </div>
            </div>
          </div>

          <!-- PROP: LONGITUD (cordLength) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">largo</span>
              <span class="prop-type-signature">number (64 - 300)</span>
            </div>
            <div class="prop-input-col">
              <div style="width: 280px; display: flex; flex-direction: column; gap: 12px;">
                <Slider v-model="playground.length" :min="64" :max="300" color="red" style="width: 60%; align-self: flex-end;" />
                <div style=" width: 60%; align-self: flex-end; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                  <span style="flex: 1; text-align: left;">64</span>
                  <span style="flex: 1; text-align: center; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: 12px;">{{ Math.round(playground.length) }}px</span>
                  <span style="flex: 1; text-align: right;">300</span>
                </div>
              </div>
            </div>
          </div>

          <h3 style="margin: 1.5rem 0 0.5rem; font-size: 1rem; font-weight: 600; text-transform: lowercase; letter-spacing: 0.02em; color: var(--cuelume-gray-500)">Fisica compartida</h3>

          <!-- GRAVITY -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">gravity</span>
              <span class="prop-type-signature">number (100 - 4000)</span>
            </div>
            <div class="prop-input-col">
              <div style="width: 280px; display: flex; flex-direction: column; gap: 12px;">
                <Slider v-model="config.gravity" :min="100" :max="4000" color="blue" style="width: 60%; align-self: flex-end;" />
                <div style=" width: 60%; align-self: flex-end; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                  <span style="flex: 1; text-align: left;">100</span>
                  <span style="flex: 1; text-align: center; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: 12px;">{{ Math.round(config.gravity) }}</span>
                  <span style="flex: 1; text-align: right;">4000</span>
                </div>
              </div>
            </div>
          </div>

          <!-- DAMPING -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">damping</span>
              <span class="prop-type-signature">number (0.50 - 0.99)</span>
            </div>
            <div class="prop-input-col">
              <div style="width: 280px; display: flex; flex-direction: column; gap: 12px;">
                <Slider v-model="config.damping" :min="0.5" :max="0.99" :step="0.01" color="violet" style="width: 60%; align-self: flex-end;" />
                <div style=" width: 60%; align-self: flex-end; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                  <span style="flex: 1; text-align: left;">0.50</span>
                  <span style="flex: 1; text-align: center; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: 12px;">{{ config.damping.toFixed(2) }}</span>
                  <span style="flex: 1; text-align: right;">0.99</span>
                </div>
              </div>
            </div>
          </div>

          <!-- MAX VELOCITY -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">maxVelocity</span>
              <span class="prop-type-signature">number (10 - 100)</span>
            </div>
            <div class="prop-input-col">
              <div style="width: 280px; display: flex; flex-direction: column; gap: 12px;">
                <Slider v-model="config.maxVelocity" :min="10" :max="100" color="orange" style="width: 60%; align-self: flex-end;" />
                <div style=" width: 60%; align-self: flex-end; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                  <span style="flex: 1; text-align: left;">10</span>
                  <span style="flex: 1; text-align: center; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: 12px;">{{ Math.round(config.maxVelocity) }}</span>
                  <span style="flex: 1; text-align: right;">100</span>
                </div>
              </div>
            </div>
          </div>
          
          <h3 style="margin: 1.5rem 0 0.5rem; font-size: 1rem; font-weight: 600; text-transform: lowercase; letter-spacing: 0.02em; color: var(--cuelume-gray-500)">Latigazo (Snap-through)</h3>

          <!-- BREAK MULTIPLIER -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">break Multiplier</span>
              <span class="prop-type-signature">number (1 - 10)</span>
            </div>
            <div class="prop-input-col">
              <div style="width: 280px; display: flex; flex-direction: column; gap: 12px;">
                <Slider v-model="config.breakMultiplier" :min="1" :max="10" color="orange" style="width: 60%; align-self: flex-end;" />
                <div style=" width: 60%; align-self: flex-end; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                  <span style="flex: 1; text-align: left;">1</span>
                  <span style="flex: 1; text-align: center; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: 12px;">{{ Math.round(config.breakMultiplier) }}x</span>
                  <span style="flex: 1; text-align: right;">10</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- SURGE VELOCITY -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">surge Velocity</span>
              <span class="prop-type-signature">number (0 - 4000)</span>
            </div>
            <div class="prop-input-col">
              <div style="width: 280px; display: flex; flex-direction: column; gap: 12px;">
                <Slider v-model="config.surgeVelocity" :min="0" :max="4000" color="orange" style="width: 60%; align-self: flex-end;" />
                <div style=" width: 60%; align-self: flex-end; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                  <span style="flex: 1; text-align: left;">0</span>
                  <span style="flex: 1; text-align: center; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: 12px;">{{ Math.round(config.surgeVelocity) }}</span>
                  <span style="flex: 1; text-align: right;">4000</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- GENERADOR DE CODIGO VUE DINAMICO -->
        <div class="code-card playground-code-card">
          <div class="snippet-top-bar">
            <span class="snippet-label">Codigo Vue Generado</span>
            <button class="snippet-copy-btn" @click="copyCode(generatedPlaygroundCode, 'playground-gen')">
              <span v-if="copiedSnippet === 'playground-gen'" class="copied-badge">Copiado</span>
              <span v-else class="copy-text">Copiar Codigo</span>
            </button>
          </div>
          <pre class="pre-block"><code>{{ generatedPlaygroundCode }}</code></pre>
        </div>
      </section>

      <!-- =========================================
           4. VARIANTES
           ========================================= -->
      <section class="story-section">
        <h2 class="section-title">Tres variantes, una sola fisica</h2>
        <p class="section-text">
          Las tres comparten el mismo motor de Verlet y la misma configuracion de arriba.
          Solid es la borla original, membrane funde cuerda y peso con filtro gooey,
          y kinetic estira el peso segun su velocidad real y deja estela.
        </p>
        <div class="showcase-row" style="padding: 60px 20px 40px; justify-content: space-around; align-items: flex-start;">
          
          <!-- SOLID -->
          <div class="cord-container rope-preview" :style="{ '--pullcord-ink': inkMap['orange'] }">
            <span class="variant-label">solid</span>
            <PullCord
              variant="solid"
              :thumbRadius="7.5"
              :ropeSize="1.5"
              :cordLength="176"
              style="position: absolute; top: 0; left: 0;"
              @pull="onPull"
            />
          </div>

          <!-- MEMBRANE -->
          <div class="cord-container rope-preview" :style="{ '--pullcord-ink': inkMap['orange'] }">
            <span class="variant-label">membrane</span>
            <PullCord
              variant="membrane"
              :thumbRadius="8"
              :ropeSize="1.5"
              :cordLength="176"
              style="position: absolute; top: 0; left: 0;"
              @pull="onPull"
              
            />
          </div>

          <!-- KINETIC -->
          <div class="cord-container rope-preview" :style="{ '--pullcord-ink': inkMap['orange'] }">
            <span class="variant-label">kinetic</span>
            <PullCord
              variant="kinetic"
              :thumbRadius="8"
              :ropeSize="1.5"
              :cordLength="176"
              style="position: absolute; top: 0; left: 0;"
              @pull="onPull"
            />
          </div>

        </div>
      </section>

      <!-- =========================================
           4.5 FRICCION TACTIL (SNAP-THROUGH)
           ========================================= -->
      <section class="story-section">
        <div class="section-header-wrap">
          <h2 class="section-title">Fricción Táctil (Snap-through)</h2>
          <p class="section-text">
            A diferencia de una interpolación lineal convencional, este componente implementa un comportamiento orgánico de <b>pandeo inverso (snap-through buckling)</b>.
            Durante la primera fase del arrastre, se inyecta un <b>70% de fricción física</b>; tu cursor baja libremente, pero la cuerda se resiste pesadamente. 
            Al superar el radio de holgura (la distancia real de la cuerda), la estructura virtual colapsa y la fricción se libera, causando que la bolita salte (snap) rápidamente hacia tu cursor, simulando a la perfección la sensación táctil de un interruptor físico real.
          </p>
        </div>

        <div style="position: relative; height: 260px; display: flex; justify-content: center; margin-top: 120px;">
          <div class="cord-container rope-preview" :style="{ '--pullcord-ink': inkMap['orange'] }" style="position: relative; width: 64px;">
            
            <!-- Circulo indicador de quiebre (snap-through) -->
            <div 
              style="position: absolute; top: 0; left: 32px; width: 200px; height: 200px; transform: translate(-50%, -50%); border: 2px dashed var(--orange-solid-base); opacity: 0.4; border-radius: 50%; pointer-events: none; box-sizing: border-box;"
            >
            </div>
            
            <!-- Circulo indicador de holgura -->
            <div 
              style="position: absolute; top: 0; left: 32px; width: 160px; height: 160px; transform: translate(-50%, -50%); border: 2px dashed var(--text-secondary); opacity: 0.3; border-radius: 50%; pointer-events: none; box-sizing: border-box;"
            >
            </div>
            
            <PullCord
              variant="solid"
              :thumbRadius="8"
              :ropeSize="1.5"
              :cordLength="80"
              style="position: absolute; top: 0; left: 0;"
              @pull="onPull"
            />
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
            La cuerda hereda su tinta de <code>--pullcord-ink</code>, asi que encaja con los 10 colores
            del sistema sin tocar el componente.
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
              <span class="dot-circle" style="background: linear-gradient(135deg, #ff4d00, #4259f6, #ff1493);"></span>
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
          <template v-for="c in colorsList" :key="c">
            <div v-if="selectedMatrixColor === 'all' || selectedMatrixColor === c" class="color-system-card">
              <div class="color-card-header" style="margin-bottom: 8px;">
                <span class="color-dot" :style="{ backgroundColor: colorDotMap[c] }"></span>
                <span class="color-title">{{ c.toUpperCase() }}</span>
              </div>
              <div
                class="cord-container rope-preview"
                :style="{ height: '360px', '--pullcord-ink': inkMap[c] }"
              >
                <PullCord
                  variant="kinetic"
                  :thumbRadius="8"
                  :ropeSize="1.5"
                  :cordLength="176"
                  style="position: absolute; top: 0; left: 0;"
                  @pull="onPull"
                />
              </div>
            </div>
          </template>
        </div>
      </section>

      <!-- =========================================
           6. PIE DE PAGINA
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
.cord-stage {
  position: relative;
  width: 120px;
  height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cord-container {
  position: relative;
  width: 64px;
  height: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.variant-label {
  position: absolute;
  top: -30px;
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
</style>
