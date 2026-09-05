<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
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

// 2. Estados interactivos para Demos de Hero y Secciones
const heroLoading = ref(false);
const triggerHeroLoading = () => {
  heroLoading.value = true;
  setTimeout(() => {
    heroLoading.value = false;
  }, 2000);
};

const morphLoading = ref(false);
const triggerMorphLoading = () => {
  morphLoading.value = true;
  setTimeout(() => {
    morphLoading.value = false;
  }, 2200);
};

const downloadState = ref('Descargar');
const triggerDownload = () => {
  if (downloadState.value !== 'Descargar') return;
  downloadState.value = 'Iniciando conexión...';
  setTimeout(() => { downloadState.value = 'Descargando (12%)'; }, 800);
  setTimeout(() => { downloadState.value = 'Descargando (45%)'; }, 1600);
  setTimeout(() => { downloadState.value = 'Descargando (89%)'; }, 2200);
  setTimeout(() => { downloadState.value = '¡Completado!'; }, 2800);
  setTimeout(() => { downloadState.value = 'Descargar'; }, 5000);
};

const payState = ref('Pagar $15.00');
const triggerPay = () => {
  if (payState.value !== 'Pagar $15.00') return;
  payState.value = 'Procesando pago seguro...';
  setTimeout(() => { payState.value = '✓ Pago Aprobado'; }, 2000);
  setTimeout(() => { payState.value = 'Pagar $15.00'; }, 4500);
};

// 3. Laboratorio Interactivo de Props
type VariantType = 'solid' | 'framed' | 'soft' | 'ghost' | 'outline';
type SizeType = 'micro' | 'tiny' | 'small' | 'medium' | 'large';
type ShapeType = 'square' | 'round';
type ColorType = 'black' | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'cyan' | 'blue' | 'violet' | 'pink';

const playground = ref({
  label: 'Compose',
  variant: 'framed' as VariantType,
  color: 'orange' as ColorType,
  size: 'medium' as SizeType,
  shape: 'square' as ShapeType,
  loading: false,
  disabled: false,
  sound: true
});

const playgroundMode = ref<'normal' | 'stateful'>('normal');
const statefulTexts = ref(['Descargar', 'Procesando...', '¡Completado!']);
const currentStateIndex = ref(0);
const statefulSpeed = ref(1500);
let cycleInterval: number | null = null;

const startCycle = () => {
  if (cycleInterval) clearInterval(cycleInterval);
  cycleInterval = window.setInterval(() => {
    currentStateIndex.value = (currentStateIndex.value + 1) % statefulTexts.value.length;
  }, statefulSpeed.value);
};

const stopCycle = () => {
  if (cycleInterval) clearInterval(cycleInterval);
  cycleInterval = null;
};

watch([playgroundMode, statefulSpeed], () => {
  if (playgroundMode.value === 'stateful') startCycle();
  else stopCycle();
}, { immediate: true });

onUnmounted(stopCycle);

const addStatefulText = () => { if (statefulTexts.value.length < 5) statefulTexts.value.push('Nuevo Estado'); };
const removeStatefulText = (idx: number) => { if (statefulTexts.value.length > 2) statefulTexts.value.splice(idx, 1); };

const currentPlaygroundLabel = computed(() => {
  if (playgroundMode.value === 'stateful') return statefulTexts.value[currentStateIndex.value] || 'Compose';
  return playground.value.label;
});

const computedSlotName = computed(() => {
  return playgroundMode.value === 'stateful' ? currentPlaygroundLabel.value : 'default';
});

// Íconos clásicos de Material Icons para el botón de icono
const materialIcons = [
  {
    name: 'settings',
    path: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'
  },
  {
    name: 'bookmark',
    path: 'M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z'
  },
  {
    name: 'send',
    path: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'
  },
  {
    name: 'favorite',
    path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
  },
  {
    name: 'add',
    path: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'
  }
];

const selectedIconName = ref('settings');
const currentIconPath = computed(() => {
  const found = materialIcons.find(i => i.name === selectedIconName.value);
  return found ? found.path : materialIcons[0].path;
});

// Listas de tokens y opciones
const variantsList: VariantType[] = ['solid', 'framed', 'soft', 'ghost', 'outline'];
const sizesList: SizeType[] = ['micro', 'tiny', 'small', 'medium', 'large'];
const shapesList: ShapeType[] = ['square', 'round'];
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

// Generador de código Vue en tiempo real para el Playground
const generatedPlaygroundCode = computed(() => {
  const isStateful = playgroundMode.value === 'stateful';
  const parts: string[] = ['<Button'];
  if (playground.value.variant !== 'solid') parts.push(`variant="${playground.value.variant}"`);
  if (playground.value.color !== 'black') parts.push(`color="${playground.value.color}"`);
  if (playground.value.size !== 'medium') parts.push(`size="${playground.value.size}"`);
  if (playground.value.shape !== 'square') parts.push(`shape="${playground.value.shape}"`);
  if (playground.value.loading) parts.push(`:loading="true"`);
  if (playground.value.disabled) parts.push(`:disabled="true"`);
  if (!playground.value.sound) parts.push(`:sound="false"`);
  if (isStateful) parts.push(`:state="currentText"`);

  const tagHeader = parts.join(' ');
  let statefulSlots = '';
  if (isStateful) {
    statefulSlots = statefulTexts.value.map(txt => `  <template #${txt.replace(/\\s+/g, '\\ ')}>${txt}</template>`).join('\n');
  }

  const textButtonCode = `${tagHeader}>\n${isStateful ? statefulSlots : `  ${playground.value.label || 'Button'}`}\n</Button>`;
  const iconButtonCode = `${tagHeader} :icon-only="true" aria-label="${selectedIconName.value}">\n  <svg viewBox="0 0 24 24" fill="currentColor">\n    <path d="..." />\n  </svg>\n</Button>`;
  const iconTextButtonCode = `${tagHeader}>\n  <template #icon>\n    <svg viewBox="0 0 24 24" fill="currentColor">\n      <path d="..." />\n    </svg>\n  </template>\n${isStateful ? statefulSlots : `  ${playground.value.label || 'Button'}`}\n</Button>`;

  return `${textButtonCode}\n\n${iconButtonCode}\n\n${iconTextButtonCode}`;
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
          <span>Button</span>
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
           2. HERO PRINCIPAL (PROPÓSITO CENTRAL)
           ========================================= -->
      <section class="hero-section">
        <h1 class="hero-title">button</h1>
        <p class="hero-subtitle">
          Un componente nacido de la exploración artística y la necesidad de tener 10 temas dinámicos con sonido integrado desde el primer día. No es una librería genérica diseñada para complacer a todo el mundo; tiene un estilo muy personal. No pretendo que le sirva a todos, pero si te gusta mi trabajo, el código es tuyo.
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

        <div class="hero-actions">
          <Button 
            variant="solid" 
            color="orange" 
            shape="round" 
            size="large"
            :loading="heroLoading"
            @click="triggerHeroLoading"
          >
            Probar Interacción
          </Button>

          <Button 
            variant="soft" 
            color="orange" 
            shape="round" 
            size="large"
            as="a"
            href="https://github.com/Emanuel-Balbuena/ciervo-ui"
            target="_blank"
          >
            GitHub
          </Button>
        </div>
      </section>

      <!-- =========================================
           3. LABORATORIO INTERACTIVO DE PROPS
           ========================================= -->
      <section class="playground-section-container">
        <div class="section-header-wrap">
          <h2 class="section-title">Laboratorio Interactivo</h2>
          <p class="section-text">
            Experimenta con todas las props del componente en tiempo real. Configura el botón y obtén el código exacto que necesitas.
          </p>
        </div>

        <!-- PESTAÑAS DE MODO (TABS) -->
        <div class="playground-mode-tabs" style="display: flex; justify-content: flex-start; margin-bottom: 2rem;">
          <div class="segmented-pill-group" style="display: inline-flex;">
            <button
              :class="['segment-pill-btn', { active: playgroundMode === 'normal' }]"
              @click="playgroundMode = 'normal'"
            >
              Normal
            </button>
            <button
              :class="['segment-pill-btn', { active: playgroundMode === 'stateful' }]"
              @click="playgroundMode = 'stateful'"
            >
              Stateful
            </button>
          </div>
        </div>

        <!-- LIENZO DE PREVIEW DEL LABORATORIO -->
        <div class="stage-canvas-card">
          <div class="stage-canvas-inner">
            
            <!-- 1. BOTÓN DE TEXTO PRINCIPAL -->
            <Button
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :loading="playground.loading"
              :disabled="playground.disabled"
              :sound="playground.sound"
              :state="playgroundMode === 'stateful' ? currentPlaygroundLabel : undefined"
            >
              <template v-if="playgroundMode !== 'stateful'">{{ currentPlaygroundLabel }}</template>
            </Button>

            <!-- 2. BOTÓN DE ICONO -->
            <Button
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :loading="playground.loading"
              :disabled="playground.disabled"
              :sound="playground.sound"
              :icon-only="true"
              :aria-label="selectedIconName"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path :d="currentIconPath" />
              </svg>
            </Button>

            <!-- 3. BOTÓN DE ICONO + TEXTO -->
            <Button
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :loading="playground.loading"
              :disabled="playground.disabled"
              :sound="playground.sound"
              :state="playgroundMode === 'stateful' ? currentPlaygroundLabel : undefined"
            >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path :d="currentIconPath" />
                </svg>
              </template>
              <template #[computedSlotName]>{{ currentPlaygroundLabel }}</template>
            </Button>

          </div>
        </div>

        <!-- FILAS DE CONTROL DE PROPS -->
        <div class="props-inspector-list">
          
          <h3 style="margin: 1rem 0 0.5rem; font-size: 1rem; font-weight: 600; text-transform: lowercase; letter-spacing: 0.02em; color: var(--cuelume-gray-500)">Contenido</h3>
          
          <!-- PROP: SLOT LABEL O MÚLTIPLES ESTADOS -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">{{ playgroundMode === 'stateful' ? 'stateful texts' : 'slot' }}</span>
              <span class="prop-type-signature">{{ playgroundMode === 'stateful' ? 'array of strings (morphing)' : 'default label content' }}</span>
            </div>
            <div class="prop-input-col" style="flex-direction: column; gap: 0.5rem; align-items: stretch;">
              <template v-if="playgroundMode === 'normal'">
                <input 
                  type="text" 
                  v-model="playground.label" 
                  class="sleek-text-input" 
                  placeholder="Texto del botón..."
                />
              </template>
              <template v-else>
                <div v-for="(_, idx) in statefulTexts" :key="idx" style="display: flex; gap: 0.5rem;">
                  <input 
                    type="text" 
                    v-model="statefulTexts[idx]" 
                    class="sleek-text-input" 
                    placeholder="Texto de estado..."
                  />
                  <button v-if="statefulTexts.length > 2" @click="removeStatefulText(idx)" class="segment-pill-btn" style="padding: 0 0.75rem; flex: none;">-</button>
                </div>
                <button v-if="statefulTexts.length < 5" @click="addStatefulText" class="segment-pill-btn" style="margin-top: 0.5rem;">+ Agregar estado</button>
                
                <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                  <span style="font-size: 0.8rem; color: var(--cuelume-gray-500); font-weight: 500;">Velocidad: {{ statefulSpeed }}ms</span>
                  <input type="range" v-model.number="statefulSpeed" min="500" max="4000" step="100" style="width: 100%; accent-color: var(--cuelume-gray-500);" />
                </div>
              </template>
            </div>
          </div>

          <!-- PROP: MATERIAL ICON -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">icon (material)</span>
              <span class="prop-type-signature">settings | bookmark | send | favorite | add</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  v-for="ic in materialIcons"
                  :key="ic.name"
                  :class="['segment-pill-btn', { active: selectedIconName === ic.name }]"
                  @click="selectedIconName = ic.name"
                >
                  {{ ic.name }}
                </button>
              </div>
            </div>
          </div>

          <h3 style="margin: 1.5rem 0 0.5rem; font-size: 1rem; font-weight: 600; text-transform: lowercase; letter-spacing: 0.02em; color: var(--cuelume-gray-500)">Apariencia</h3>

          <!-- PROP: VARIANT -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">variant</span>
              <span class="prop-type-signature">solid | framed | soft | ghost | outline</span>
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
                  <span 
                    class="dot-circle" 
                    :style="{ backgroundColor: colorDotMap[c] }"
                  ></span>
                </button>
              </div>
            </div>
          </div>

          <!-- PROP: SHAPE -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">shape</span>
              <span class="prop-type-signature">square | round</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  v-for="sh in shapesList"
                  :key="sh"
                  :class="['segment-pill-btn', { active: playground.shape === sh }]"
                  @click="playground.shape = sh"
                >
                  {{ sh }}
                </button>
              </div>
            </div>
          </div>

          <!-- PROP: SIZE -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">size</span>
              <span class="prop-type-signature">micro | tiny | small | medium | large</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  v-for="s in sizesList"
                  :key="s"
                  :class="['segment-pill-btn', { active: playground.size === s }]"
                  @click="playground.size = s"
                >
                  {{ s }}
                </button>
              </div>
            </div>
          </div>

          <h3 style="margin: 1.5rem 0 0.5rem; font-size: 1rem; font-weight: 600; text-transform: lowercase; letter-spacing: 0.02em; color: var(--cuelume-gray-500)">Estados & Comportamiento</h3>

          <!-- PROP: LOADING -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">loading</span>
              <span class="prop-type-signature">boolean</span>
            </div>
            <div class="prop-input-col">
              <button 
                class="sleek-checkbox"
                aria-label="Toggle loading state"
                :class="{ checked: playground.loading }"
                @click="playground.loading = !playground.loading"
                role="checkbox"
                :aria-checked="playground.loading"
              >
                <svg v-if="playground.loading" viewBox="0 0 24 24" class="check-svg">
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
              <span class="prop-type-signature">boolean (cuelume audio engine)</span>
            </div>
            <div class="prop-input-col">
              <button 
                class="sleek-checkbox"
                aria-label="Toggle sound state"
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
           4. ANATOMÍA Y FÍSICAS (CORE)
           ========================================= -->
      
      <!-- Físicas de Resorte -->
      <section class="story-section">
        <h2 class="section-title">La Física del Resorte (Zero-Friction Spring)</h2>
        <p class="section-text">
          Los botones tradicionales usan transiciones lineales o cúbicas rígidas. En Ciervo UI, cada interacción está calculada con una función de resorte basada en física de 390ms inspirada en las micro-interacciones de Vercel/Rauno. El botón se hunde con suavidad al presionar y rebota con amortiguación orgánica al soltar.
        </p>
        <div class="showcase-row">
          <Button variant="solid" color="black" shape="square">Solid Press</Button>
          <Button variant="framed" color="orange" shape="square">Framed Click</Button>
          <Button variant="soft" color="blue" shape="square">Soft Touch</Button>
          <Button variant="outline" color="violet" shape="square">Outline Feedback</Button>
        </div>
      </section>

      <!-- Feedback Acústico -->
      <section class="story-section">
        <h2 class="section-title">Feedback Acústico Espacial (Motor Cuelume)</h2>
        <p class="section-text">
          El sonido en la web no debe ser ruidoso ni artificial. Ciervo UI integra de forma nativa la librería de síntesis Web Audio <code class="inline-code">cuelume</code>, asignando un perfil acústico personalizado a cada peso visual: las variantes sólidas percuten con un chirp firme (<code class="inline-code">press</code>), las variantes suaves marcan tres tonos rápidos (<code class="inline-code">tick</code>), y las siluetas emiten un click mecánico (<code class="inline-code">release</code>).
        </p>
        <div class="showcase-row">
          <Button variant="solid" color="pink" shape="round">Solid (Press)</Button>
          <Button variant="soft" color="green" shape="round">Soft (Tick)</Button>
          <Button variant="outline" color="cyan" shape="round">Outline (Release)</Button>
          <Button variant="ghost" color="lime" shape="round">Ghost (Whisper)</Button>
        </div>
      </section>

      <!-- =========================================
           5. GUÍA DE PROPS
           ========================================= -->

      <!-- Tallas -->
      <section class="story-section">
        <h2 class="section-title">Tallas (Sizes)</h2>
        <p class="section-text">
          El componente cuenta con 5 tamaños calibrados matemáticamente para adaptarse a cualquier contexto: <code class="inline-code">micro</code>, <code class="inline-code">tiny</code>, <code class="inline-code">small</code>, <code class="inline-code">medium</code> y <code class="inline-code">large</code>. Cada talla ajusta automáticamente padding, fuente, y los radios de los bordes.
        </p>
        <div class="showcase-row">
          <Button variant="solid" color="black" shape="round" size="micro">Micro</Button>
          <Button variant="solid" color="black" shape="round" size="tiny">Tiny</Button>
          <Button variant="solid" color="black" shape="round" size="small">Small</Button>
          <Button variant="solid" color="black" shape="round" size="medium">Medium</Button>
          <Button variant="solid" color="black" shape="round" size="large">Large</Button>
        </div>
      </section>

      <!-- Formas -->
      <section class="story-section">
        <h2 class="section-title">Formas (Shapes)</h2>
        <p class="section-text">
          Soporte nativo para dos paradigmas visuales de interfaz: <code class="inline-code">square</code> (cajas con bordes suavizados para diseño corporativo o técnico) y <code class="inline-code">round</code> (píldoras completas para marketing y llamadas a la acción amigables).
        </p>
        <div class="showcase-row">
          <Button variant="solid" color="blue" shape="square">Square Design</Button>
          <Button variant="solid" color="blue" shape="round">Round Design</Button>
        </div>
      </section>

      <!-- Iconos -->
      <section class="story-section">
        <h2 class="section-title">Íconos y Slots (Icons)</h2>
        <p class="section-text">
          El botón permite colocar íconos utilizando los slots <code class="inline-code">#icon</code> (para íconos iniciales) y <code class="inline-code">#trailingIcon</code> (para íconos finales). También puedes crear botones puramente visuales activando <code class="inline-code">icon-only</code>.
        </p>
        <div class="showcase-row">
          <Button variant="soft" color="orange" shape="square" :icon-only="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path :d="materialIcons[0].path" />
            </svg>
          </Button>
          <Button variant="soft" color="orange" shape="square">
            <template #icon>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path :d="materialIcons[1].path" />
              </svg>
            </template>
            Start Icon
          </Button>
          <Button variant="soft" color="orange" shape="square">
            Trailing Icon
            <template #trailingIcon>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path :d="materialIcons[2].path" />
              </svg>
            </template>
          </Button>
        </div>
      </section>

      <!-- Polimorfismo -->
      <section class="story-section">
        <h2 class="section-title">Polimorfismo (As)</h2>
        <p class="section-text">
          Usando la propiedad <code class="inline-code">as</code>, puedes renderizar el botón como una etiqueta nativa <code class="inline-code">&lt;a&gt;</code> para navegación semántica o SEO, conservando exactamente la misma física, estilo y eventos, permitiéndole convivir con cualquier enrutador como Vue Router o Nuxt Link.
        </p>
        <div class="showcase-row">
          <Button as="a" href="#" variant="outline" color="cyan" shape="round">
            Esto es un enlace &lt;a&gt;
            <template #trailingIcon>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </template>
          </Button>
        </div>
      </section>

      <!-- =========================================
           6. ESTADOS Y ZERO LAYOUT SHIFT
           ========================================= -->

      <section class="demo-section">
        <h2 class="section-title">Zero Layout Shift Morphing (Loading & Stateful)</h2>
        <div class="demo-card">
          <p class="demo-description">
            Al pasarle la propiedad <code>state</code>, el botón integra un motor de físicas en su interior. Renderiza los estados entrante y saliente en contenedores superpuestos y anima su anchura utilizando <strong>físicas de resortes (Spring)</strong>, garantizando cero desplazamiento abrupto del DOM y permitiendo un morphing orgánico. El mismo principio de <strong>Zero Shift</strong> se aplica a la animación de carga de íconos.
          </p>
          <div class="showcase-row" style="margin-top: 1.5rem;">
            
            <Button 
              variant="solid" 
              color="orange" 
              shape="round" 
              size="medium"
              :state="downloadState"
              :loading="downloadState.includes('Descargando') || downloadState.includes('Iniciando')"
              @click="triggerDownload"
            >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                </svg>
              </template>
            </Button>

            <Button 
              variant="framed" 
              color="blue" 
              shape="round" 
              size="medium"
              :state="payState"
              :loading="payState.includes('Procesando')"
              @click="triggerPay"
            />

            <Button 
              variant="solid" 
              color="black" 
              shape="square" 
              size="medium"
              :icon-only="true"
              :loading="morphLoading"
              @click="triggerMorphLoading"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
              </svg>
            </Button>
            
          </div>
        </div>
      </section>

      <!-- Desactivado -->
      <section class="story-section">
        <h2 class="section-title">Estado de Desactivación (Disabled)</h2>
        <p class="section-text">
          El botón deshabilita las interacciones, silencia el motor acústico, transiciona a una opacidad tenue y bloquea los eventos pointer y focus en CSS para evitar que se desencadenen interacciones accidentales.
        </p>
        <div class="showcase-row">
          <Button variant="solid" color="black" shape="round" disabled>Solid Disabled</Button>
          <Button variant="soft" color="black" shape="round" disabled>Soft Disabled</Button>
          <Button variant="outline" color="black" shape="round" disabled>Outline Disabled</Button>
        </div>
      </section>

      <!-- =========================================
           7. MATRIZ SISTEMÁTICA DE COLOR
           ========================================= -->

      <!-- Variantes -->
      <section class="story-section">
        <h2 class="section-title">Las 5 Variantes de Jerarquía</h2>
        <p class="section-text">
          Estructuradas para cubrir cualquier nivel de prominencia en tu interfaz: <code class="inline-code">solid</code> para acciones primarias definitivas, <code class="inline-code">framed</code> para acentos con borde exterior, <code class="inline-code">soft</code> para acciones secundarias con fondo al 10%, <code class="inline-code">outline</code> para botones con contorno y <code class="inline-code">ghost</code> para navegación sutil.
        </p>
        <div class="showcase-row">
          <Button variant="solid" color="black" shape="round">Solid</Button>
          <Button variant="framed" color="black" shape="round">Framed</Button>
          <Button variant="soft" color="black" shape="round">Soft</Button>
          <Button variant="outline" color="black" shape="round">Outline</Button>
          <Button variant="ghost" color="black" shape="round">Ghost</Button>
        </div>
      </section>

      <!-- Matriz Visual -->
      <section class="matrix-section">
        <div class="section-header-wrap">
          <h2 class="section-title">Matriz Visual de Color</h2>
          <p class="section-text">
            Explora las 5 variantes a través de los 10 temas cromáticos. Cada variante utiliza fórmulas de canal alfa calibradas para integrarse armónicamente sobre fondos claros y oscuros.
          </p>
        </div>

        <!-- Barra de Filtro Rápido de Color -->
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

        <!-- Rejilla de Tarjetas de Color -->
        <div class="matrix-grid-container">
          <template v-for="c in colorsList" :key="c">
            <div v-if="selectedMatrixColor === 'all' || selectedMatrixColor === c" class="color-system-card">
              <div class="color-card-header">
                <span class="color-dot" :style="{ backgroundColor: colorDotMap[c] }"></span>
                <span class="color-title">{{ c.toUpperCase() }}</span>
              </div>

              <div class="color-variants-grid">
                <div v-for="v in variantsList" :key="v" class="variant-column">
                  <span class="variant-name">{{ v }}</span>
                  <div class="variant-duo">
                    <Button :variant="v" :color="c" shape="square" size="small">{{ c }}</Button>
                    <Button :variant="v" :color="c" shape="round" size="small">{{ c }}</Button>
                  </div>
                </div>
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
