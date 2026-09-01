<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Button } from './components/Button';
import { bind } from 'cuelume';

// 1. Estado y Control de Temas con View Transitions API (Efecto Polygon-Gradient)
const isDark = ref(true);

const applyTheme = (dark: boolean) => {
  if (dark) {
    document.documentElement.classList.add('dark', 'theme-dark');
    document.documentElement.classList.remove('theme-light');
  } else {
    document.documentElement.classList.remove('dark', 'theme-dark');
    document.documentElement.classList.add('theme-light');
  }
};

onMounted(() => {
  try {
    // Desactivar motor de audio en móvil / pantallas táctiles para no pausar música o contenido de fondo
    const isMobileOrTouch = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    if (!isMobileOrTouch) {
      bind();
    }
  } catch (e) {
    console.warn('Cuelume bind:', e);
  }
  // Sincronizar clase en <html> para View Transitions y temas de botones
  applyTheme(isDark.value);
});

const toggleTheme = () => {
  const switchTheme = () => {
    isDark.value = !isDark.value;
    applyTheme(isDark.value);
  };

  if (!(document as any).startViewTransition) {
    switchTheme();
    return;
  }
  (document as any).startViewTransition(switchTheme);
};

// 2. Estado de Copiado para Snippets
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

// 3. Estados interactivos para Demos de Hero y Secciones
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

// 4. Laboratorio Interactivo de Props
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

  return `${textButtonCode}\n\n${iconButtonCode}`;
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
          <span>v0.1.0</span>
          <span class="meta-divider">·</span>
          <span>MIT</span>
          <span class="meta-divider">·</span>
          <span>Cuelume Sound Engine</span>
        </div>
        
        <div class="theme-toggle">
          <Button 
            variant="soft" 
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
        <h1 class="hero-title">ciervo-ui-button</h1>
        <p class="hero-subtitle">
          Un componente nacido de la exploración artística y la necesidad de tener 10 temas dinámicos con sonido integrado desde el primer día. No es una librería genérica diseñada para complacer a todo el mundo; tiene un estilo muy personal. No pretendo que le sirva a todos, pero si te gusta mi trabajo, el código es tuyo.
        </p>

        <!-- COMANDO DE INSTALACIÓN -->
        <div class="install-card">
          <code class="install-code">npm install ciervo-ui</code>
          <button 
            class="copy-btn" 
            @click="copyCode('npm install ciervo-ui', 'install')"
            :title="copiedSnippet === 'install' ? 'Copiado!' : 'Copiar comando'"
          >
            <svg v-if="copiedSnippet !== 'install'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>

        <!-- BOTONES DE ACCIÓN HERO -->
        <div class="hero-actions">
          <Button variant="solid" color="black" shape="round" size="medium">
            Press me
          </Button>
          <Button variant="soft" color="black" shape="round" size="medium">
            And me, over there
          </Button>
          <Button 
            variant="outline" 
            color="black" 
            shape="round" 
            size="medium"
            :loading="heroLoading"
            @click="triggerHeroLoading"
          >
            Carga con resorte
          </Button>
        </div>
      </section>

      <!-- =========================================
           3. HISTORIA: LA FÍSICA Y EL RESORTE (FÍSICAS Y ACÚSTICA)
           ========================================= -->
      <section class="story-section">
        <h2 class="section-title">La física y el resorte</h2>
        <p class="section-text">
          No busco la textura exagerada de un teclado mecánico, sino la respuesta rápida y precisa de la tecla de una laptop. Este no es un experimento; es la base sólida que planeo usar en mis proyectos durante los próximos años.
        </p>

        <div class="showcase-row">
          <Button variant="solid" color="black" shape="round">Pill / Round</Button>
          <Button variant="solid" color="black" shape="square">Square</Button>
          <Button variant="soft" color="black" shape="round">Tactile Soft</Button>
          <Button variant="framed" color="blue" shape="round">Framed Blue</Button>
          <Button variant="solid" color="black" shape="round" :disabled="true">Disabled</Button>
        </div>

        <div class="code-card">
          <pre v-pre><code>&lt;Button variant="solid" color="black" shape="round" :sound="true"&gt;
  Press me
&lt;/Button&gt;</code></pre>
          <button class="copy-btn snippet-copy" @click="copyCode('<Button variant=&quot;solid&quot; color=&quot;black&quot; shape=&quot;round&quot; :sound=&quot;true&quot;>\n  Press me\n</Button>', 'physics')">
            <span v-if="copiedSnippet === 'physics'" class="copied-badge">Copiado</span>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </section>

      <!-- =========================================
           4. HISTORIA: EL MORPH (EL FLUJO DE CARGA)
           ========================================= -->
      <section class="story-section">
        <h2 class="section-title">La transición</h2>
        <p class="section-text">
          Odio presionar "Guardar" y ver cómo el botón se pone gris y la interfaz entera cambia, engañando al cerebro haciéndole creer que hay un proceso técnico hipercomplejo de fondo. Un botón vivo que solo bloquea el cursor es mil veces menos pesado a nivel cognitivo. Además, decidí evitar el cambio de texto dinámico durante la carga; el spinner expansivo hace todo el trabajo visual, manteniendo el diseño intacto y la implementación limpia.
        </p>

        <div class="showcase-row">
          <Button 
            variant="solid" 
            color="black" 
            shape="round" 
            :loading="morphLoading"
            @click="triggerMorphLoading"
          >
            Confirmar compra
          </Button>
          <Button variant="soft" color="orange" shape="round" :loading="true">Guardar cambios</Button>
          <Button variant="outline" color="green" shape="square" :loading="true">Publicar proyecto</Button>
          <Button variant="framed" color="pink" shape="round" :loading="true">Enviar mensaje</Button>
        </div>
      </section>

      <!-- =========================================
           5. HISTORIA: VARIANTES (ARQUITECTURA VISUAL)
           ========================================= -->
      <section class="story-section">
        <h2 class="section-title">Variantes</h2>
        <p class="section-text">
          Solid y Framed son variantes gemelas con una presencia visual extremadamente fuerte (usa Framed en modo oscuro siempre que puedas para acciones principales). Para el resto de la interfaz, la jerarquía es tuya: recomiendo Soft para modales y confirmaciones, Outline para acciones secundarias, y Ghost queda increíble integrado en íconos o secciones limpias como el footer.
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
           6. HISTORIA: RETROALIMENTACIÓN ACÚSTICA CUELUME
           ========================================= -->
      <section class="story-section">
        <h2 class="section-title">Feedback háptico (Cuelume)</h2>
        <p class="section-text">
           El motor de Cuelume no es un adorno: el sonido nos hace interactuar usando la mayor cantidad de sentidos posibles (vista, tacto, oído) para que se sienta como un botón REAL. ¿No lo necesitas en un caso específico? Se silencia con un solo prop. 
        </p>

        <div class="showcase-row">
          <Button variant="solid" color="violet" shape="round">press (Solid)</Button>
          <Button variant="soft" color="violet" shape="round">tick (Soft)</Button>
          <Button variant="outline" color="violet" shape="round">release (Outline)</Button>
          <Button variant="ghost" color="violet" shape="round">whisper (Ghost)</Button>
          <Button variant="solid" color="violet" shape="round" :sound="false">Muted (:sound="false")</Button>
        </div>
      </section>

      <!-- =========================================================
           7. LABORATORIO INTERACTIVO DE PROPS (TEXTO + ICON BUTTON)
           ========================================================= -->
      <section class="story-section playground-section-container">
        <div class="section-header-wrap">
          <h2 class="section-title">Laboratorio interactivo de props</h2>
          <p class="section-text">
            Prueba todas las combinaciones de props que ofrece button. 
          </p>
        </div>

        <!-- LIENZO DE PREVIEW (CANVAS CON AMBOS BOTONES) -->
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
              <span class="prop-type-signature">orange | blue | red | yellow | black | green | cyan | lime | violet | pink</span>
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
            <span class="snippet-label">Generated Template</span>
            <button class="copy-btn snippet-copy-btn" @click="copyCode(generatedPlaygroundCode, 'playground')">
              <span v-if="copiedSnippet === 'playground'" class="copied-badge">Copiado</span>
              <span v-else class="copy-text">Copiar</span>
            </button>
          </div>
          <pre class="pre-block"><code>{{ generatedPlaygroundCode }}</code></pre>
        </div>
      </section>

      <!-- =========================================
           8. MATRIZ SISTEMÁTICA DE COLOR
           ========================================= -->
      <section class="story-section matrix-section">
        <h2 class="section-title">Color System Matrix</h2>
        <p class="section-text">
          Explora la armonía visual de los 10 tonos cromáticos a través de las 5 variantes y ambas geometrías en {{ isDark ? 'Modo Oscuro' : 'Modo Claro' }}.
        </p>

        <!-- Selector rápido de color integrado -->
        <div class="matrix-filter-bar">
          <span class="matrix-filter-label">Filtrar color:</span>
          <div class="segmented-pill-group color-dots-pill-group">
            <button
              :class="['segment-pill-btn', { active: selectedMatrixColor === 'all' }]"
              @click="selectedMatrixColor = 'all'"
            >
              Todos (10)
            </button>
            <button
              v-for="c in colorsList"
              :key="c"
              :class="['color-dot-item', { active: selectedMatrixColor === c }]"
              :title="c"
              @click="selectedMatrixColor = c"
            >
              <span 
                class="dot-circle" 
                :style="{ backgroundColor: colorDotMap[c] }"
              ></span>
            </button>
          </div>
        </div>

        <div class="matrix-grid-container">
          <div 
            v-for="color in (selectedMatrixColor === 'all' ? colorsList : [selectedMatrixColor as ColorType])" 
            :key="color" 
            class="color-system-card"
          >
            <div class="color-card-header">
              <span class="color-dot" :style="{ backgroundColor: colorDotMap[color] }"></span>
              <span class="color-title">{{ color.toUpperCase() }}</span>
            </div>

            <div class="color-variants-grid">
              <div v-for="variant in variantsList" :key="variant" class="variant-column">
                <span class="variant-name">{{ variant }}</span>
                <div class="variant-duo">
                  <Button :variant="variant" :color="color" shape="square" size="small">
                    Square
                  </Button>
                  <Button :variant="variant" :color="color" shape="round" size="small">
                    Round
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- =========================================
           9. PIE DE PÁGINA
           ========================================= -->
      <footer class="demo-footer">
        <div class="footer-content">
          <span>ciervo-ui · Crafted with Instrumental Sans & Cuelume</span>
          <Button 
            variant="ghost" 
            color="black" 
            shape="round" 
            size="small"
            as="a"
            href="https://github.com"
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
/* =========================================
   1. CONTENEDOR DE DEMO Y ESTRUCTURA
   ========================================= */
.demo-wrapper {
  min-height: 100vh;
  width: 100%;
  font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  justify-content: center;
  padding: 40px 20px 80px 20px;
  box-sizing: border-box;
  background-color: var(--page-bg);
  color: var(--text-primary);
}

.demo-container {
  width: 100%;
  max-width: 820px;
  display: flex;
  flex-direction: column;
  gap: 56px;
}

/* =========================================
   2. BARRA SUPERIOR
   ========================================= */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--card-border-subtle);
}

.meta-tag {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.meta-divider {
  color: var(--text-tertiary);
}

/* =========================================
   3. HERO SECTION
   ========================================= */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: -0.04em;
  margin: 0;
  color: var(--text-primary);
  line-height: 1.1;
}

.hero-subtitle {
  font-size: 16.5px;
  line-height: 1.65;
  color: var(--text-secondary);
  margin: 0;
  max-width: 720px;
  font-weight: 400;
  letter-spacing: -0.01em;
}

/* Tarjeta de instalación npm */
.install-card {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background-color: var(--code-bg);
  border: 1px solid var(--code-border);
  padding: 8px 14px;
  border-radius: 10px;
  margin-top: 6px;
  margin-bottom: 6px;
}

.install-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--text-primary);
  user-select: all;
}

.copy-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.copy-btn:hover {
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.08);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 10px;
}

/* =========================================
   4. SECCIONES DE HISTORIA Y CARACTERÍSTICAS
   ========================================= */
.story-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-top: 12px;
  border-top: 1px solid var(--card-border-subtle);
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.03em;
  margin: 0;
  color: var(--text-primary);
}

.section-text {
  font-size: 15px;
  line-height: 1.68;
  color: var(--text-secondary);
  margin: 0;
  letter-spacing: -0.01em;
}

.inline-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  background-color: var(--pill-bg);
  border: 1px solid var(--pill-border);
  padding: 2px 6px;
  border-radius: 6px;
  color: var(--text-primary);
}

.showcase-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 16px 0 4px 0;
}

/* Tarjetas de Código con botón de copia */
.code-card {
  position: relative;
  background-color: var(--code-bg);
  border: 1px solid var(--code-border);
  border-radius: 12px;
  padding: 16px 20px;
  overflow-x: auto;
}

.code-card pre {
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-primary);
}

.snippet-copy {
  position: absolute;
  top: 12px;
  right: 12px;
  background-color: var(--pill-bg);
  border: 1px solid var(--pill-border);
  padding: 6px 10px;
}

.copied-badge {
  font-size: 12px;
  font-weight: 500;
  color: #22c55e;
  font-family: 'Instrument Sans', sans-serif;
}

/* =========================================================
   5. LABORATORIO DE PROPS (TEXTO + ICON BUTTON)
   ========================================================= */
.playground-section-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Lienzo de Preview con ambos botones centrados */
.stage-canvas-card {
  background-color: var(--canvas-bg);
  border: 1px solid var(--canvas-border);
  border-radius: 16px;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.stage-canvas-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  transform: scale(1.05);
}

/* Filas del Inspector de Props */
.props-inspector-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 8px 0;
}

.prop-control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 38px;
}

.prop-info-col {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.prop-name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.prop-type-signature {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: var(--text-secondary);
}

/* Grupo Segmentado estilo Cápsula/Pill */
.segmented-pill-group {
  display: inline-flex;
  align-items: center;
  background-color: var(--pill-bg);
  border: 1px solid var(--pill-border);
  border-radius: 9999px;
  padding: 3px;
  gap: 2px;
}

.segment-pill-btn {
  background: transparent;
  border: none;
  color: var(--pill-text);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 5px 13px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.segment-pill-btn:hover:not(.active) {
  color: var(--pill-hover-text);
}

.segment-pill-btn.active {
  background-color: var(--pill-active-bg);
  color: var(--pill-active-text);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Selector de Dots de Color */
.color-dots-pill-group {
  padding: 5px 12px;
  gap: 12px;
}

.color-dot-item {
  background: transparent;
  border: none;
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: transform 0.15s ease;
}

.color-dot-item:hover {
  transform: scale(1.2);
}

.dot-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: block;
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.5);
  transition: all 0.15s ease;
}

.color-dot-item.active .dot-circle {
  outline: 2px solid var(--text-primary);
  outline-offset: 2px;
  transform: scale(1.15);
}

/* Checkbox Toggle */
.sleek-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background-color: transparent;
  border: 2px solid var(--checkbox-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s ease;
}

.sleek-checkbox:hover {
  border-color: var(--text-secondary);
}

.sleek-checkbox.checked {
  background-color: var(--checkbox-checked);
  border-color: var(--checkbox-checked);
}

.check-svg {
  width: 14px;
  height: 14px;
  color: #ffffff;
}

/* Input minimalista para slot */
.sleek-text-input {
  background-color: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 8px;
  outline: none;
  min-width: 160px;
  transition: border-color 0.2s;
}

.sleek-text-input:focus {
  border-color: var(--input-focus);
}

/* Snippet de código del Playground */
.playground-code-card {
  padding: 0;
}

.snippet-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--code-border);
  background-color: rgba(255, 255, 255, 0.02);
}

.snippet-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}

.snippet-copy-btn {
  background: transparent;
  border: 1px solid var(--code-border);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.snippet-copy-btn:hover {
  color: var(--text-primary);
  border-color: var(--text-secondary);
}

.copy-text {
  font-size: 12px;
}

.pre-block {
  margin: 0;
  padding: 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  overflow-x: auto;
}

/* =========================================
   6. MATRIZ SISTEMÁTICA DE COLOR
   ========================================= */
.matrix-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.matrix-filter-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 4px;
  margin-bottom: 6px;
}

.matrix-filter-label {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.matrix-grid-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.color-system-card {
  background-color: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.color-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.color-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-primary);
}

.color-variants-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.variant-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--card-border-subtle);
  border-radius: 12px;
  padding: 12px 10px;
}

.variant-name {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
}

.variant-duo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.variant-duo .btn {
  width: 100%;
  justify-content: center;
  font-size: 13px;
}

/* =========================================
   7. PIE DE PÁGINA
   ========================================= */
.demo-footer {
  border-top: 1px solid var(--card-border-subtle);
  padding-top: 24px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);
}

/* =========================================
   8. RESPONSIVE MOBILE & TABLET (MEDIA QUERIES)
   ========================================= */
@media (max-width: 768px) {
  .demo-wrapper {
    padding: 20px 14px 70px 14px;
  }

  .demo-container {
    gap: 36px;
  }

  /* Top Navigation */
  .top-nav {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 14px;
  }

  .meta-tag {
    font-size: 11px;
    gap: 6px;
  }

  /* Hero */
  .hero-section {
    gap: 14px;
  }

  .hero-title {
    font-size: clamp(32px, 8.5vw, 42px);
    letter-spacing: -0.04em;
    line-height: 1.08;
  }

  .hero-subtitle {
    font-size: 14.5px;
    line-height: 1.62;
  }

  .install-card {
    width: 100%;
    justify-content: space-between;
    box-sizing: border-box;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
  }

  /* Story Showcase Rows */
  .story-section {
    gap: 14px;
    padding-top: 10px;
  }

  .section-title {
    font-size: 21px;
  }

  .section-text {
    font-size: 14px;
    line-height: 1.65;
  }

  .showcase-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }

  /* Playground Canvas */
  .stage-canvas-card {
    height: 200px;
    border-radius: 14px;
  }

  .stage-canvas-inner {
    gap: 16px;
  }

  /* Inspector Rows */
  .props-inspector-list {
    gap: 16px;
  }

  .prop-control-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    min-height: auto;
  }

  .prop-info-col {
    width: 100%;
  }

  .prop-input-col {
    width: 100%;
  }

  .segmented-pill-group {
    display: inline-flex;
    flex-wrap: wrap;
    width: 100%;
    gap: 4px;
    padding: 4px;
    box-sizing: border-box;
  }

  .segment-pill-btn {
    padding: 6px 10px;
    font-size: 12px;
    flex: 1 1 auto;
    text-align: center;
    min-height: 34px;
  }

  .color-dots-pill-group {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px 12px;
    justify-content: flex-start;
  }

  .sleek-text-input {
    width: 100%;
    box-sizing: border-box;
  }

  /* Code Cards */
  .code-card {
    padding: 12px 14px;
    border-radius: 10px;
  }

  .code-card pre {
    font-size: 12px;
  }

  /* Matrix Section (Formato en cuadrícula espaciosa de 2 columnas) */
  .matrix-filter-bar {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
  }

  .matrix-filter-bar .color-dots-pill-group {
    width: 100%;
    box-sizing: border-box;
  }

  .color-system-card {
    padding: 16px;
    border-radius: 14px;
    gap: 16px;
  }

  .color-variants-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    width: 100%;
  }

  .variant-column {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: rgba(255, 255, 255, 0.02);
    padding: 10px;
    border-radius: 10px;
    border: 1px solid var(--card-border-subtle);
  }

  .variant-column:last-child:nth-child(odd) {
    grid-column: span 2;
  }

  .variant-name {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .variant-duo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    width: 100%;
  }

  .variant-duo .btn {
    width: 100%;
    justify-content: center;
    font-size: 12px;
    padding-left: 8px;
    padding-right: 8px;
  }

  /* Footer */
  .footer-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .meta-tag {
    display: none;
  }

  .top-nav {
    justify-content: flex-end;
  }

  .variant-duo {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>