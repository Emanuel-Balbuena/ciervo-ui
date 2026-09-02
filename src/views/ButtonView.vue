<script setup lang="ts">
import { ref, computed } from 'vue';
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
  sound: true,
  as: 'button' as 'button' | 'a'
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
  const parts: string[] = ['<Button'];
  if (playground.value.as !== 'button') parts.push(`as="${playground.value.as}"`);
  if (playground.value.variant !== 'solid') parts.push(`variant="${playground.value.variant}"`);
  if (playground.value.color !== 'black') parts.push(`color="${playground.value.color}"`);
  if (playground.value.size !== 'medium') parts.push(`size="${playground.value.size}"`);
  if (playground.value.shape !== 'square') parts.push(`shape="${playground.value.shape}"`);
  if (playground.value.loading) parts.push(`:loading="true"`);
  if (playground.value.disabled) parts.push(`:disabled="true"`);
  if (!playground.value.sound) parts.push(`:sound="false"`);
  if (playground.value.as === 'a') parts.push('href="#"');

  const tagHeader = parts.join(' ');
  const textButtonCode = `${tagHeader}>\n  ${playground.value.label || 'Button'}\n</Button>`;
  const iconButtonCode = `${tagHeader} :icon-only="true" aria-label="${selectedIconName.value}">\n  <svg viewBox="0 0 24 24" fill="currentColor">\n    <path d="..." />\n  </svg>\n</Button>`;
  const iconTextButtonCode = `${tagHeader}>\n  <template #icon>\n    <svg viewBox="0 0 24 24" fill="currentColor">\n      <path d="..." />\n    </svg>\n  </template>\n  ${playground.value.label || 'Button'}\n</Button>`;

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
           3. HISTORIA & CARACTERÍSTICAS TÉCNICAS
           ========================================= -->

      <!-- Característica 1: Físicas de Resorte -->
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

      <!-- Característica 2: Morfismo de Iconos Zero-Shift -->
      <section class="story-section">
        <h2 class="section-title">Zero Layout Shift: Morfismo de Icono a Spinner</h2>
        <p class="section-text">
          El estándar en la industria suele sustituir los botones por textos de carga o deshabilitarlos toscamente. En Ciervo UI, cuando un botón de icono o de texto entra en estado <code class="inline-code">loading</code>, el icono rota y escala hacia cero mediante una cuadrícula de transformación CSS mientras el spinner ocupa su lugar con perfecta simetría geométrica y cero desplazamiento visual.
        </p>
        <div class="showcase-row">
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

          <Button 
            variant="solid" 
            color="orange" 
            shape="square" 
            size="medium"
            :loading="morphLoading"
            @click="triggerMorphLoading"
          >
            Guardar Cambios
          </Button>
        </div>
      </section>

      <!-- Característica 3: Feedback Acústico -->
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

      <!-- Característica 4: Variantes Visuales -->
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

      <!-- =========================================
           4. LABORATORIO INTERACTIVO DE PROPS
           ========================================= -->
      <section class="playground-section-container">
        <div class="section-header-wrap">
          <h2 class="section-title">Laboratorio Interactivo</h2>
          <p class="section-text">
            Experimenta con todas las props del componente en tiempo real. Modifica el estado, variante, tamaño, color y forma mientras observas el botón de texto, el botón de icono y el botón de icono + texto.
          </p>
        </div>

        <!-- LIENZO DE PREVIEW DEL LABORATORIO -->
        <div class="stage-canvas-card">
          <div class="stage-canvas-inner">
            
            <!-- 1. BOTÓN DE TEXTO PRINCIPAL -->
            <Button
              :as="playground.as"
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :loading="playground.loading"
              :disabled="playground.disabled"
              :sound="playground.sound"
            >
              {{ playground.label }}
            </Button>

            <!-- 2. BOTÓN DE ICONO (MATERIAL ICON CON MORPHING A SPINNER) -->
            <Button
              :as="playground.as"
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

            <!-- 3. BOTÓN DE ICONO + TEXTO (MORPHING DE ICONO A SPINNER CON TEXTO FIJO) -->
            <Button
              :as="playground.as"
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :loading="playground.loading"
              :disabled="playground.disabled"
              :sound="playground.sound"
            >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path :d="currentIconPath" />
                </svg>
              </template>
              {{ playground.label }}
            </Button>

          </div>
        </div>

        <!-- FILAS DE CONTROL DE PROPS -->
        <div class="props-inspector-list">
          
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

          <!-- PROP: MATERIAL ICON (PARA EL BOTÓN DE ICONO) -->
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

          <!-- PROP: LOADING -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">loading</span>
              <span class="prop-type-signature">boolean</span>
            </div>
            <div class="prop-input-col">
              <button 
                class="sleek-checkbox"
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

          <!-- PROP: AS (POLIMORFISMO) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">as</span>
              <span class="prop-type-signature">'button' | 'a' | Component</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  :class="['segment-pill-btn', { active: playground.as === 'button' }]"
                  @click="playground.as = 'button'"
                >
                  button
                </button>
                <button
                  :class="['segment-pill-btn', { active: playground.as === 'a' }]"
                  @click="playground.as = 'a'"
                >
                  a (link)
                </button>
              </div>
            </div>
          </div>

          <!-- PROP: SLOT LABEL -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">slot</span>
              <span class="prop-type-signature">default label content</span>
            </div>
            <div class="prop-input-col">
              <input 
                type="text" 
                v-model="playground.label" 
                class="sleek-text-input" 
                placeholder="Texto del botón..."
              />
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
           5. MATRIZ SISTEMÁTICA DE COLOR
           ========================================= -->
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
           6. PIE DE PÁGINA
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
