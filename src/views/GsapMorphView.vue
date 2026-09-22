<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import Modal from '../components/Modal/Modal.vue';
import Select from '../components/Select/Select.vue';
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

// 2. Laboratorio Interactivo
const isModalOpen = ref(false);
const activeOrigin = ref<HTMLElement | null>(null);

const playground = ref({
  mode: 'gsap' as 'gsap' | 'transform' | 'travel' | 'simple',
  placement: 'center' as string,
  physics: 'both' as 'both' | '2d' | '3d' | 'none',
  size: 'md' as 'sm' | 'md' | 'lg' | 'xl' | 'full',
  color: 'orange' as ColorType,
  activeTrigger: 'solid' as 'solid' | 'framed' | 'ghost' | 'soft' | 'outline' | 'matrix'
});

const openMorphModal = async (event: MouseEvent, triggerType: 'solid' | 'framed' | 'ghost' | 'soft' | 'outline' | 'matrix' = 'solid') => {
  activeOrigin.value = event.currentTarget as HTMLElement;
  playground.value.activeTrigger = triggerType;
  
  if (isModalOpen.value) {
    isModalOpen.value = false;
    await nextTick();
  }

  isModalOpen.value = true;
};

// Generador de código Vue en tiempo real
const generatedPlaygroundCode = computed(() => {
  const parts: string[] = ['<Modal'];
  parts.push(`  v-model:open="isOpen"`);
  parts.push(`  :origin="triggerElement"`);
  
  if (playground.value.mode !== 'gsap') parts.push(`  mode="${playground.value.mode}"`);
  if (playground.value.placement !== 'center') parts.push(`  placement="${playground.value.placement}"`);
  if (playground.value.physics !== 'both') parts.push(`  physics="${playground.value.physics}"`);
  if (playground.value.size !== 'md') parts.push(`  size="${playground.value.size}"`);
  if (playground.value.color) parts.push(`  color="${playground.value.color}"`);
  
  return parts.join('\n') + '\n>\n  <!-- Contenido del modal -->\n</Modal>';
});

// 2. Colores del sistema (mismo orden que la demo de Select)
type ColorType = 'black' | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'cyan' | 'blue' | 'violet' | 'pink';
const colorsList: ColorType[] = ['orange', 'blue', 'red', 'yellow', 'black', 'green', 'cyan', 'lime', 'violet', 'pink'];

// Dots del selector de color
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

const selectedMatrixColor = ref<string>('all');

const openMatrixModal = async (event: MouseEvent, c: ColorType) => {
  playground.value.color = c;
  playground.value.mode = 'gsap';
  await openMorphModal(event, 'matrix');
};

const placements = [
  { label: 'center', value: 'center' },
  { label: 'anchor', value: 'anchor' },
  { label: 'bottom', value: 'bottom' },
  { label: 'inplace', value: 'inplace' },
  { label: 'inplace-tl', value: 'inplace-tl' },
  { label: 'inplace-t', value: 'inplace-t' },
  { label: 'inplace-tr', value: 'inplace-tr' },
  { label: 'inplace-l', value: 'inplace-l' },
  { label: 'inplace-r', value: 'inplace-r' },
  { label: 'inplace-bl', value: 'inplace-bl' },
  { label: 'inplace-b', value: 'inplace-b' },
  { label: 'inplace-br', value: 'inplace-br' }
];

const placementSelectDemo = ref({
  open: false,
  origin: null as HTMLElement | null
});
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
          <span>Modal GSAP Morph</span>
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
        <h1 class="hero-title">modal gsap</h1>
        <p class="hero-subtitle">
          Un modal orgánico y fluido impulsado por GSAP Flip y SplitText. Presenta morphing ininterrumpido desde su origen, retención de inercia y físicas 2D/3D interactivas para un feel premium.
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
            Haz clic en el trigger para abrir el modal. Observa cómo el contenido se transforma de manera fluida utilizando la técnica FLIP. Modifica las props para ver los cambios de física y posicionamiento.
          </p>
        </div>

        <!-- LIENZO DE PREVIEW DEL LABORATORIO -->
        <div class="stage-canvas-card" style="min-height: 380px; display: flex; align-items: center; justify-content: center; padding: 48px 24px;">
          
          <div class="triggers-container" style="gap: 16px; flex-wrap: wrap;">
            <Button variant="solid" @click="(e) => openMorphModal(e, 'solid')">
              <span data-morph-icon="icon-1">🚀</span>
              <span data-morph-split="title-1">Solid</span>
            </Button>
            <Button variant="framed" @click="(e) => openMorphModal(e, 'framed')">
              <span data-morph-icon="icon-2">💫</span>
              <span data-morph-split="title-2">Framed</span>
            </Button>
            <Button variant="ghost" @click="(e) => openMorphModal(e, 'ghost')">
              <span data-morph-icon="icon-3">👻</span>
              <span data-morph-split="title-3">Ghost</span>
            </Button>
            <Button variant="soft" @click="(e) => openMorphModal(e, 'soft')">
              <span data-morph-icon="icon-4">☁️</span>
              <span data-morph-split="title-4">Soft</span>
            </Button>
            <Button variant="outline" @click="(e) => openMorphModal(e, 'outline')">
              <span data-morph-icon="icon-5">✏️</span>
              <span data-morph-split="title-5">Outline</span>
            </Button>
          </div>

        </div>
        
        <!-- FILAS DE CONTROL DE PROPS -->
        <div class="props-inspector-list">
          
          <h3 style="margin: 1rem 0 0.5rem; font-size: 1rem; font-weight: 600; text-transform: lowercase; letter-spacing: 0.02em; color: var(--cuelume-gray-500)">Comportamiento</h3>

          <!-- PROP: MODE -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">mode</span>
              <span class="prop-type-signature">Modo de animación</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  :class="['segment-pill-btn', { active: playground.mode === 'gsap' }]"
                  @click="playground.mode = 'gsap'"
                >
                  gsap
                </button>
                <button
                  :class="['segment-pill-btn', { active: playground.mode === 'transform' }]"
                  @click="playground.mode = 'transform'"
                >
                  transform
                </button>
                <button
                  :class="['segment-pill-btn', { active: playground.mode === 'travel' }]"
                  @click="playground.mode = 'travel'"
                >
                  travel
                </button>
                <button
                  :class="['segment-pill-btn', { active: playground.mode === 'simple' }]"
                  @click="playground.mode = 'simple'"
                >
                  simple
                </button>
              </div>
            </div>
          </div>

          <!-- PROP: PLACEMENT -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">placement</span>
              <span class="prop-type-signature">Posición final del modal</span>
            </div>
            <div class="prop-input-col" style="justify-content: flex-end;">
              <Select class="trigger-select"
                v-model:open="placementSelectDemo.open"
                v-model="playground.placement"
                :options="placements"
                :origin="placementSelectDemo.origin"
                mode="gsap"
                placement="inplace-b"
              >
              </Select>
            </div>
          </div>

          <h3 style="margin: 1.5rem 0 0.5rem; font-size: 1rem; font-weight: 600; text-transform: lowercase; letter-spacing: 0.02em; color: var(--cuelume-gray-500)">Físicas y Estilo</h3>

          <!-- PROP: PHYSICS -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">physics</span>
              <span class="prop-type-signature">Efectos de arrastre</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button :class="['segment-pill-btn', { active: playground.physics === 'both' }]" @click="playground.physics = 'both'">both</button>
                <button :class="['segment-pill-btn', { active: playground.physics === '2d' }]" @click="playground.physics = '2d'">2d</button>
                <button :class="['segment-pill-btn', { active: playground.physics === '3d' }]" @click="playground.physics = '3d'">3d</button>
                <button :class="['segment-pill-btn', { active: playground.physics === 'none' }]" @click="playground.physics = 'none'">none</button>
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
                  <span class="dot-circle" :style="{ backgroundColor: colorDotMap[c] }"></span>
                </button>
              </div>
            </div>
          </div>

          <!-- PROP: SIZE -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">size</span>
              <span class="prop-type-signature">Tamaño del contenido</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button :class="['segment-pill-btn', { active: playground.size === 'sm' }]" @click="playground.size = 'sm'">sm</button>
                <button :class="['segment-pill-btn', { active: playground.size === 'md' }]" @click="playground.size = 'md'">md</button>
                <button :class="['segment-pill-btn', { active: playground.size === 'lg' }]" @click="playground.size = 'lg'">lg</button>
                <button :class="['segment-pill-btn', { active: playground.size === 'xl' }]" @click="playground.size = 'xl'">xl</button>
                <button :class="['segment-pill-btn', { active: playground.size === 'full' }]" @click="playground.size = 'full'">full</button>
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
           5. DISEÑO E INGENIERÍA
           ========================================= -->
      
      <!-- =========================================
           4. MATRIZ VISUAL DE COLOR
           ========================================= -->
      <section class="matrix-section">
        <div class="section-header-wrap">
          <h2 class="section-title">Matriz Visual de Color</h2>
          <p class="section-text">
            El modal habla los 10 colores del sistema. La caja hereda el acento sin perder
            legibilidad en claro ni en oscuro.
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
              <div class="color-card-header" style="margin-bottom: 24px;">
                <span class="color-dot" :style="{ backgroundColor: colorDotMap[c] }"></span>
                <span class="color-title">{{ c.toUpperCase() }}</span>
              </div>
              <div style="width: 100%; display: flex; align-items: center; justify-content: center; padding: 20px 0 32px;">
                <Button variant="solid" :color="c" @click="(e) => openMatrixModal(e, c)">
                  <span data-morph-split="matrix-title">Modal {{ c }}</span>
                </Button>
              </div>
            </div>
          </template>
        </div>
      </section>

      <section class="story-section">
        <h2 class="section-title">Shapes & Morphing</h2>
        <p class="section-text">
          El modal puede originarse de cualquier forma: un botón pastilla, un círculo o una tarjeta. El engine de Flip mapea las posiciones relativas (usando atributos `data-morph-icon` y `data-morph-split`) y transiciona independientemente los nodos hacia su estado final expandido.
        </p>
        <div class="showcase-row" style="padding: 60px 20px; justify-content: center; gap: 16px; flex-wrap: wrap;">
            <Button variant="solid" @click="(e) => openMorphModal(e, 'solid')">
              <span data-morph-icon="icon-1">🚀</span>
              <span data-morph-split="title-1">Solid</span>
            </Button>
            
            <Button variant="ghost" @click="(e) => openMorphModal(e, 'ghost')">
              <span data-morph-icon="icon-3">👻</span>
              <span data-morph-split="title-3">Ghost</span>
            </Button>
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

    <!-- =========================================
         EL MODAL RENDEREADO
         ========================================= -->
    <Modal 
      v-model:open="isModalOpen" 
      :origin="activeOrigin" 
      :mode="playground.mode"
      :placement="playground.placement"
      :physics="playground.physics"
      :size="playground.size"
      :color="playground.color"
    >
      <div class="morph-modal-content">
        
        <!-- Trigger 1: Solid -->
        <template v-if="playground.activeTrigger === 'solid'">
          <div class="modal-header">
            <span class="modal-icon" data-morph-icon="icon-1">🚀</span>
            <h2 class="modal-title" data-morph-split="title-1">Solid</h2>
          </div>
          <div class="modal-body">
            <p>Variante solid del botón. El modal emerge directamente del botón sólido.</p>
          </div>
        </template>

        <!-- Trigger 2: Framed -->
        <template v-if="playground.activeTrigger === 'framed'">
          <div class="modal-header column center">
            <span class="modal-icon large" data-morph-icon="icon-2">💫</span>
            <h2 class="modal-title center" data-morph-split="title-2">Framed</h2>
          </div>
          <div class="modal-body" style="text-align: center;">
            <p>Variante framed del botón, mapeando su origen de forma limpia.</p>
          </div>
        </template>

        <!-- Trigger 3: Ghost -->
        <template v-if="playground.activeTrigger === 'ghost'">
          <div class="modal-header column">
            <span class="modal-icon xl" data-morph-icon="icon-3">👻</span>
            <h2 class="modal-title" data-morph-split="title-3">Ghost</h2>
          </div>
          <div class="modal-body">
            <p>Variante ghost del botón. Suave y sin bordes iniciales.</p>
          </div>
        </template>
        
        <!-- Trigger 4: Soft -->
        <template v-if="playground.activeTrigger === 'soft'">
          <div class="modal-header column">
            <span class="modal-icon xl" data-morph-icon="icon-4">☁️</span>
            <h2 class="modal-title" data-morph-split="title-4">Soft</h2>
          </div>
          <div class="modal-body">
            <p>Variante soft del botón.</p>
          </div>
        </template>
        
        <!-- Trigger 5: Outline -->
        <template v-if="playground.activeTrigger === 'outline'">
          <div class="modal-header column">
            <span class="modal-icon xl" data-morph-icon="icon-5">✏️</span>
            <h2 class="modal-title" data-morph-split="title-5">Outline</h2>
          </div>
          <div class="modal-body">
            <p>Variante outline del botón.</p>
          </div>
        </template>
        
        <!-- Trigger matriz: contenido generico con el acento activo -->
        <template v-if="playground.activeTrigger === 'matrix'">
          <div class="modal-header">
            <span class="color-dot" data-morph-icon="matrix-icon" :style="{ backgroundColor: colorDotMap[playground.color] }"></span>
            <h2 class="modal-title" data-morph-split="matrix-title">Modal {{ playground.color }}</h2>
          </div>
          <div class="modal-body">
            <p>La caja usa el fondo neutro del tema; solo los detalles (borde y botones) llevan el acento {{ playground.color }}.</p>
          </div>
        </template>

        <div class="modal-actions">
          <Button color="black" @click="isModalOpen = false">Close</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
/* =========================================================
   TRIGGERS STYLES
   ========================================================= */
.triggers-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* =========================================================
   MODAL CONTENT STYLES
   ========================================================= */
.morph-modal-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
}
.modal-header.column {
  flex-direction: column;
  align-items: flex-start;
}
.modal-header.column.center {
  align-items: center;
}

.modal-icon {
  font-size: 2rem;
}
.modal-icon.large {
  font-size: 3rem;
  margin: 0 auto;
}
.modal-icon.xl {
  font-size: 4rem;
}

.modal-title {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary, #000);
}
.modal-title.center {
  text-align: center;
  width: 100%;
}

.modal-body {
  color: var(--text-secondary, #666);
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* Sleek Select for Placement */
.sleek-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, #e5e7eb);
  background: var(--surface-default, #fff);
  color: var(--text-primary, #000);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  min-width: 140px;
}
.sleek-select:focus {
  border-color: var(--text-primary, #000);
}

:deep(.trigger-select) {
  width: 180px;
  gap: 8px;
}
</style>

<style>
html body .slt-shell {
  --slt-radius: 12px;
}
</style>
