<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import ButtonGroup from '../components/ButtonGroup/ButtonGroup.vue';
import ButtonGroupText from '../components/ButtonGroup/ButtonGroupText.vue';
import ButtonGroupInput from '../components/ButtonGroup/ButtonGroupInput.vue';
import { useTheme } from '../composables/useTheme';

const router = useRouter();
const { isDark, toggleTheme } = useTheme();

const domainInput = ref('ciervo.design');
const searchInput = ref('');

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

// 2. Laboratorio Interactivo de Props para ButtonGroup
type VariantType = 'solid' | 'framed' | 'soft' | 'ghost' | 'outline';
type SizeType = 'micro' | 'tiny' | 'small' | 'medium' | 'large';
type ShapeType = 'square' | 'round';
type ColorType = 'black' | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'cyan' | 'blue' | 'violet' | 'pink';

const playground = ref({
  orientation: 'horizontal' as 'horizontal' | 'vertical',
  attached: true,
  variant: 'solid' as VariantType,
  color: 'orange' as ColorType,
  size: 'medium' as SizeType,
  shape: 'round' as ShapeType,
  count: 3,
  loadingChild: null as number | null
});

const variantsList: VariantType[] = ['solid', 'framed', 'soft', 'ghost', 'outline'];
const sizesList: SizeType[] = ['micro', 'tiny', 'small', 'medium', 'large'];
const shapesList: ShapeType[] = ['square', 'round'];
const colorsList: ColorType[] = ['orange', 'blue', 'red', 'yellow', 'black', 'green', 'cyan', 'lime', 'violet', 'pink'];

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

const buttonLabels = ['Previous', 'Current', 'Next', 'Option 4', 'Option 5'];

const groupActionIcons = [
  { name: 'format_align_left', path: 'M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z' },
  { name: 'format_align_center', path: 'M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z' },
  { name: 'format_align_right', path: 'M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z' },
  { name: 'format_bold', path: 'M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z' },
  { name: 'format_italic', path: 'M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z' }
];

const groupActionItems = [
  { label: 'Left', path: 'M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z' },
  { label: 'Center', path: 'M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z' },
  { label: 'Right', path: 'M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z' },
  { label: 'Bold', path: 'M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z' },
  { label: 'Italic', path: 'M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z' }
];

const loadingTextChild = ref<number | null>(null);
const loadingIconChild = ref<number | null>(null);
const loadingComboChild = ref<number | null>(null);

// Generador de código Vue para ButtonGroup
const generatedGroupCode = computed(() => {
  const groupProps: string[] = ['<ButtonGroup'];
  if (playground.value.orientation !== 'horizontal') groupProps.push(`orientation="${playground.value.orientation}"`);
  if (!playground.value.attached) groupProps.push(`:attached="false"`);
  const groupTag = groupProps.join(' ') + '>';

  const btnProps = `variant="${playground.value.variant}" color="${playground.value.color}" size="${playground.value.size}" shape="${playground.value.shape}"`;
  
  let buttons = '';
  for (let i = 0; i < playground.value.count; i++) {
    buttons += `  <Button ${btnProps}>${buttonLabels[i] || `Button ${i + 1}`}</Button>\n`;
  }

  return `${groupTag}\n${buttons}</ButtonGroup>`;
});

const selectedMatrixColor = ref<string>('all');
</script>

<template>
  <div class="demo-wrapper" :class="isDark ? 'theme-dark' : 'theme-light'">
    <div class="demo-container">
      
      <!-- TOP NAV -->
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
          <span>ButtonGroup</span>
          <span class="meta-divider">·</span>
          <span>v0.1.0</span>
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

      <!-- HERO SECTION -->
      <section class="hero-section">
        <h1 class="hero-title">button-group</h1>
        <p class="hero-subtitle">
          Contenedor estructurado para agrupar botones contiguos. Aplica fusión geométrica matemática para eliminar radios internos y proyecta divisores de 1px con contraste calibrado sin alterar las físicas ni los sonidos individuales de cada botón.
        </p>

        <div class="install-card">
          <code class="install-code">import { Button, ButtonGroup } from 'ciervo-ui'</code>
          <button class="copy-btn" @click="copyCode(`import { Button, ButtonGroup } from 'ciervo-ui'`, 'import-group')" title="Copiar import">
            <span v-if="copiedSnippet === 'import-group'" class="copied-badge">Copiado</span>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </section>

      <!-- SECCIÓN: FUSIÓN GEOMÉTRICA & DIVISORES -->
      <section class="story-section">
        <h2 class="section-title">Fusión Geométrica y Divisores de 1px</h2>
        <p class="section-text">
          A diferencia del solapamiento tosco de componentes, ButtonGroup neutraliza los radios de esquina interiores de cada botón y proyecta un divisor de 1px adaptado a la variante visual:
        </p>
        
        <div class="showcase-row" style="flex-direction: column; align-items: flex-start; gap: 16px;">
          <!-- Solid Group -->
          <ButtonGroup>
            <Button variant="outline" color="orange" shape="round">Left</Button>
            <Button variant="solid" color="orange" shape="round">Center</Button>
            <Button variant="ghost" color="orange" shape="round">Right</Button>
          </ButtonGroup>

          <ButtonGroup>
            <Button variant="framed" color="orange" shape="round">Left</Button>
            <Button variant="framed" color="orange" shape="round">Center</Button>
            <Button variant="framed" color="orange" shape="round">Right</Button>
          </ButtonGroup>

          <!-- Soft Group -->
          <ButtonGroup>
            <Button variant="soft" color="orange" shape="round">First</Button>
            <Button variant="soft" color="orange" shape="round">Second</Button>
            <Button variant="soft" color="orange" shape="round">Third</Button>
          </ButtonGroup>

          <!-- Ghost Group -->
          <ButtonGroup>
            <Button variant="ghost" color="orange" shape="round">Profile</Button>
            <Button variant="ghost" color="orange" shape="round">Settings</Button>
            <Button variant="ghost" color="orange" shape="round">Billing</Button>
          </ButtonGroup>

          <!-- Outline Group -->
          <ButtonGroup>
            <Button variant="outline" color="orange" shape="round">Day</Button>
            <Button variant="outline" color="orange" shape="round">Week</Button>
            <Button variant="outline" color="orange" shape="round">Month</Button>
          </ButtonGroup>
        </div>
      </section>

      <!-- SECCIÓN: HERENCIA DE PROPS (CASCADING CONTEXT) -->
      <section class="story-section">
        <h2 class="section-title">Herencia de Props en Cascada (Cascading Context)</h2>
        <p class="section-text">
          Define la variante, color, tamaño o estado en el contenedor principal <code>&lt;ButtonGroup&gt;</code> y todos los botones hijos se sincronizarán automáticamente sin necesidad de repetir props:
        </p>

        <div class="showcase-row" style="flex-wrap: wrap; gap: 20px;">
          <!-- Cascaded Small Outline Blue -->
          <ButtonGroup variant="outline" color="blue" size="small" shape="square">
            <Button>Copiar</Button>
            <Button>Cortar</Button>
            <Button>Pegar</Button>
          </ButtonGroup>

          <!-- Cascaded Medium Soft Violet -->
          <ButtonGroup variant="soft" color="violet" size="medium" shape="round">
            <Button>Anterior</Button>
            <Button>Siguiente</Button>
          </ButtonGroup>

          <!-- Cascaded Large Framed Emerald -->
          <ButtonGroup variant="framed" color="green" size="small" shape="round">
            <Button>Aceptar</Button>
            <Button>Rechazar</Button>
          </ButtonGroup>
        </div>
      </section>

      <!-- SECCIÓN: SPLIT BUTTONS & COMPOSICIÓN -->
      <section class="story-section">
        <h2 class="section-title">Split Buttons y Fusión con Texto (Composition)</h2>
        <p class="section-text">
          Crea botoneras divididas con menú desplegable (Split Buttons) o acopla etiquetas y prefijos con <code>&lt;ButtonGroupText&gt;</code>:
        </p>

        <div class="showcase-row" style="flex-wrap: wrap; gap: 20px; align-items: center;">
          <!-- Split Button Solid Orange -->
          <ButtonGroup variant="solid" color="orange" shape="round">
            <Button>Publicar Cambios</Button>
            <Button icon-only aria-label="Más opciones">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </Button>
          </ButtonGroup>

          <!-- Split Button Framed Blue -->
          <ButtonGroup variant="framed" color="blue" shape="square">
            <Button>Crear Pull Request</Button>
            <Button icon-only aria-label="Opciones de merge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </Button>
          </ButtonGroup>

          <!-- Real Text & Input Fusion -->
          <ButtonGroup shape="round">
            <ButtonGroupText>https://</ButtonGroupText>
            <ButtonGroupInput v-model="domainInput" placeholder="tu-dominio.com" />
            <Button variant="solid" color="orange">Conectar</Button>
          </ButtonGroup>

          <!-- Search Input Fusion -->
          <ButtonGroup shape="square" size="small">
            <ButtonGroupInput v-model="searchInput" placeholder="Buscar componente..." />
            <Button variant="outline" color="black" icon-only aria-label="Buscar">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
            </Button>
          </ButtonGroup>
        </div>
      </section>

      <!-- LABORATORIO INTERACTIVO -->
      <section class="playground-section-container">
        <div class="section-header-wrap">
          <h2 class="section-title">Laboratorio Interactivo de ButtonGroup</h2>
          <p class="section-text">
            Controla la orientación, acoplamiento, cantidad de botones y estilos del grupo en tiempo real.
          </p>
        </div>

        <div class="stage-canvas-card" style="min-height: 280px; padding: 40px 24px;">
          <div class="stage-canvas-inner" style="gap: 32px; flex-wrap: wrap;">
            
            <!-- 1. GRUPO DE TEXTO -->
            <ButtonGroup
              :orientation="playground.orientation"
              :attached="playground.attached"
            >
              <Button
                v-for="idx in playground.count"
                :key="'txt-' + idx"
                :variant="playground.variant"
                :color="playground.color"
                :size="playground.size"
                :shape="playground.shape"
                :loading="loadingTextChild === idx"
                @click="loadingTextChild = loadingTextChild === idx ? null : idx"
              >
                {{ buttonLabels[idx - 1] || `Item ${idx}` }}
              </Button>
            </ButtonGroup>

            <!-- 2. GRUPO DE ICON ONLY -->
            <ButtonGroup
              :orientation="playground.orientation"
              :attached="playground.attached"
            >
              <Button
                v-for="(icon, idx) in groupActionIcons.slice(0, playground.count)"
                :key="'ico-' + idx"
                :variant="playground.variant"
                :color="playground.color"
                :size="playground.size"
                :shape="playground.shape"
                :icon-only="true"
                :aria-label="icon.name"
                :loading="loadingIconChild === (idx + 1)"
                @click="loadingIconChild = loadingIconChild === (idx + 1) ? null : (idx + 1)"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path :d="icon.path" />
                </svg>
              </Button>
            </ButtonGroup>

            <!-- 3. GRUPO DE ICON + TEXTO -->
            <ButtonGroup
              :orientation="playground.orientation"
              :attached="playground.attached"
            >
              <Button
                v-for="(item, idx) in groupActionItems.slice(0, playground.count)"
                :key="'combo-' + idx"
                :variant="playground.variant"
                :color="playground.color"
                :size="playground.size"
                :shape="playground.shape"
                :loading="loadingComboChild === (idx + 1)"
                @click="loadingComboChild = loadingComboChild === (idx + 1) ? null : (idx + 1)"
              >
                <template #icon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path :d="item.path" />
                  </svg>
                </template>
                {{ item.label }}
              </Button>
            </ButtonGroup>

          </div>
        </div>

        <!-- CONTROLES DEL INSPECTOR -->
        <div class="props-inspector-list">
          
          <!-- ORIENTATION -->
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

          <!-- ATTACHED -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">attached</span>
              <span class="prop-type-signature">boolean (fusión de radios y bordes)</span>
            </div>
            <div class="prop-input-col">
              <button 
                class="sleek-checkbox"
                aria-label="Toggle attached state"
                :class="{ checked: playground.attached }"
                @click="playground.attached = !playground.attached"
                role="checkbox"
                :aria-checked="playground.attached"
              >
                <svg v-if="playground.attached" viewBox="0 0 24 24" class="check-svg">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- BUTTON COUNT -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">children count</span>
              <span class="prop-type-signature">2 | 3 | 4 | 5 botones</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  v-for="cnt in [2, 3, 4, 5]"
                  :key="cnt"
                  :class="['segment-pill-btn', { active: playground.count === cnt }]"
                  @click="playground.count = cnt"
                >
                  {{ cnt }}
                </button>
              </div>
            </div>
          </div>

          <!-- VARIANT -->
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

          <!-- SIZE -->
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

          <!-- COLOR -->
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

          <!-- SHAPE -->
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

        </div>

        <!-- CODE SNIPPET -->
        <div class="code-card playground-code-card">
          <div class="snippet-top-bar">
            <span class="snippet-label">Código Vue Generado</span>
            <button class="snippet-copy-btn" @click="copyCode(generatedGroupCode, 'group-code-gen')">
              <span v-if="copiedSnippet === 'group-code-gen'" class="copied-badge">Copiado</span>
              <span v-else class="copy-text">Copiar Código</span>
            </button>
          </div>
          <pre class="pre-block"><code>{{ generatedGroupCode }}</code></pre>
        </div>
      </section>

      <!-- MATRIZ VISUAL DE BUTTON GROUPS -->
      <section class="matrix-section">
        <div class="section-header-wrap">
          <h2 class="section-title">Matriz Visual de ButtonGroup</h2>
          <p class="section-text">
            Comprobación de divisores y esquinas matemáticas en los 10 colores del sistema:
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
          <template v-for="c in colorsList" :key="c">
            <div v-if="selectedMatrixColor === 'all' || selectedMatrixColor === c" class="color-system-card">
              <div class="color-card-header">
                <span class="color-dot" :style="{ backgroundColor: colorDotMap[c] }"></span>
                <span class="color-title">{{ c.toUpperCase() }}</span>
              </div>

              <div class="color-variants-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                <div v-for="v in variantsList" :key="v" class="variant-column" style="padding: 14px;">
                  <span class="variant-name">{{ v }}</span>
                  <ButtonGroup style="margin-top: 8px;">
                    <Button :variant="v" :color="c" shape="square" size="small">Uno</Button>
                    <Button :variant="v" :color="c" shape="square" size="small">Dos</Button>
                  </ButtonGroup>
                  <ButtonGroup style="margin-top: 8px;">
                    <Button :variant="v" :color="c" shape="round" size="small">A</Button>
                    <Button :variant="v" :color="c" shape="round" size="small">B</Button>
                    <Button :variant="v" :color="c" shape="round" size="small">C</Button>
                  </ButtonGroup>
                </div>
              </div>
            </div>
          </template>
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
