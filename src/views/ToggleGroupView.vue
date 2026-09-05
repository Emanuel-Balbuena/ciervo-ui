<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import Toggle from '../components/Toggle/Toggle.vue';
import ToggleGroup from '../components/ToggleGroup/ToggleGroup.vue';
import { useTheme } from '../composables/useTheme';

const router = useRouter();
const { isDark, toggleTheme } = useTheme();

// 1. Snippet Copy State
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

// 2. Interactive Props Laboratory for ToggleGroup
type VariantType = 'solid' | 'framed' | 'soft' | 'ghost' | 'outline';
type SizeType = 'micro' | 'tiny' | 'small' | 'medium' | 'large';
type ShapeType = 'square' | 'round';
type ColorType = 'black' | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'cyan' | 'blue' | 'violet' | 'pink';

const playground = ref({
  orientation: 'horizontal' as 'horizontal' | 'vertical',
  attached: true,
  type: 'single' as 'single' | 'multiple',
  mandatory: true,
  variant: 'solid' as VariantType,
  color: 'orange' as ColorType,
  size: 'medium' as SizeType,
  shape: 'round' as ShapeType,
  iconFill: true,
  disabled: false,
  count: 3
});

// Reactive values for laboratory
const singleActive = ref('center');
const multipleActive = ref<string[]>(['bold', 'italic']);

// Showcase example states
const singleAlignShowcase = ref('left');
const multipleFormatShowcase = ref<string[]>(['bold', 'italic']);
const currentViewShowcase = ref('grid');

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

const toggleTextLabels = ['Left', 'Center', 'Right', 'Justify', 'Extra'];

const toggleIcons = [
  { value: 'left', name: 'format_align_left', path: 'M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z' },
  { value: 'center', name: 'format_align_center', path: 'M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z' },
  { value: 'right', name: 'format_align_right', path: 'M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z' },
  { value: 'justify', name: 'format_align_justify', path: 'M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z' },
  { value: 'bold', name: 'format_bold', path: 'M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z' }
];

const toggleComboItems = [
  { value: 'left', label: 'Left', path: 'M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z' },
  { value: 'center', label: 'Center', path: 'M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z' },
  { value: 'right', label: 'Right', path: 'M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z' },
  { value: 'justify', label: 'Justify', path: 'M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z' },
  { value: 'bold', label: 'Bold', path: 'M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z' }
];

// Vue Code Generator for ToggleGroup
const generatedToggleGroupCode = computed(() => {
  const isSingle = playground.value.type === 'single';
  const valBind = isSingle ? `v-model="activeOption"` : `v-model="selectedOptions"`;
  const typeProp = isSingle ? '' : ` type="multiple"`;
  const mandProp = isSingle && playground.value.mandatory ? ` :mandatory="true"` : '';
  const orientProp = playground.value.orientation !== 'horizontal' ? ` orientation="vertical"` : '';
  const attachProp = !playground.value.attached ? ` :attached="false"` : '';
  const fillProp = !playground.value.iconFill ? ` :icon-fill="false"` : '';
  const disProp = playground.value.disabled ? ` :disabled="true"` : '';

  const groupTag = `<ToggleGroup ${valBind}${typeProp}${mandProp}${orientProp}${attachProp}${fillProp}${disProp} variant="${playground.value.variant}" color="${playground.value.color}" size="${playground.value.size}" shape="${playground.value.shape}">`;
  
  let toggles = '';
  for (let i = 0; i < playground.value.count; i++) {
    const val = toggleIcons[i]?.value || `opt-${i + 1}`;
    const lbl = toggleTextLabels[i] || `Option ${i + 1}`;
    toggles += `  <Toggle value="${val}">${lbl}</Toggle>\n`;
  }

  return `${groupTag}\n${toggles}</ToggleGroup>`;
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
          <span>ToggleGroup</span>
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

      <!-- COMPONENT HERO -->
      <section class="hero-section">
        <h1 class="hero-title">toggle-group</h1>
        <p class="hero-desc">
          Contenedor de agrupación para botones conmutables. Soporta selección exclusiva (radio) y múltiple,
          orientación horizontal o vertical, acoplamiento geométrico con precisión de subpíxel y cascada contextual hacia los botones hijo.
        </p>
      </section>

      <!-- SHOWCASE USE CASES -->
      <section class="showcase-section">
        <h2 class="section-title">Casos de Uso en Patrones de UI</h2>
        <p class="section-text">
          Controladores de vista, alineación de párrafos y selectores de formato enriquecido:
        </p>
        
        <div class="showcase-row" style="flex-wrap: wrap; gap: 24px; align-items: flex-start;">
          
          <!-- Single Selection Align -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <span style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">Selección Única (Alineación)</span>
            <ToggleGroup v-model="singleAlignShowcase" type="single" :mandatory="true" variant="solid" color="orange" shape="round">
              <Toggle value="left" icon-only aria-label="Izquierda">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg>
              </Toggle>
              <Toggle value="center" icon-only aria-label="Centro">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>
              </Toggle>
              <Toggle value="right" icon-only aria-label="Derecha">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>
              </Toggle>
            </ToggleGroup>
          </div>

          <!-- Multiple Selection Formats -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <span style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">Selección Múltiple (Formato de Texto)</span>
            <ToggleGroup v-model="multipleFormatShowcase" type="multiple" variant="soft" color="blue" shape="round">
              <Toggle value="bold" icon-only aria-label="Negrita">
                <span style="font-weight: 700; font-size: 14px;">B</span>
              </Toggle>
              <Toggle value="italic" icon-only aria-label="Cursiva">
                <span style="font-style: italic; font-size: 14px;">I</span>
              </Toggle>
              <Toggle value="underline" icon-only aria-label="Subrayado">
                <span style="text-decoration: underline; font-size: 14px;">U</span>
              </Toggle>
            </ToggleGroup>
          </div>

          <!-- Dashboard View Switcher -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <span style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">Selector de Vistas de Dashboard</span>
            <ToggleGroup v-model="currentViewShowcase" type="single" :mandatory="true" variant="framed" color="orange" shape="square" size="small">
              <Toggle value="list">
                <template #icon>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                </template>
                Lista
              </Toggle>
              <Toggle value="grid">
                <template #icon>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                </template>
                Cuadrícula
              </Toggle>
            </ToggleGroup>
          </div>

        </div>
      </section>

      <!-- INTERACTIVE LABORATORY -->
      <section class="playground-section-container">
        <div class="section-header-wrap">
          <h2 class="section-title">Laboratorio Interactivo de ToggleGroup</h2>
          <p class="section-text">
            Configura el tipo de selección, orientación, acoplamiento y estilos visuales en tiempo real.
          </p>
        </div>

        <div class="stage-canvas-card" style="min-height: 280px; padding: 40px 24px;">
          <div class="stage-canvas-inner" style="gap: 32px; flex-wrap: wrap;">
            
            <!-- 1. TEXT GROUP -->
            <ToggleGroup
              v-if="playground.type === 'single'"
              v-model="singleActive"
              :type="'single'"
              :mandatory="playground.mandatory"
              :orientation="playground.orientation"
              :attached="playground.attached"
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :disabled="playground.disabled"
              :icon-fill="playground.iconFill"
            >
              <Toggle
                v-for="idx in playground.count"
                :key="'txt-' + idx"
                :value="toggleIcons[idx - 1]?.value || `item-${idx}`"
              >
                {{ toggleTextLabels[idx - 1] || `Item ${idx}` }}
              </Toggle>
            </ToggleGroup>

            <ToggleGroup
              v-else
              v-model="multipleActive"
              :type="'multiple'"
              :orientation="playground.orientation"
              :attached="playground.attached"
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :disabled="playground.disabled"
              :icon-fill="playground.iconFill"
            >
              <Toggle
                v-for="idx in playground.count"
                :key="'txt-multi-' + idx"
                :value="toggleIcons[idx - 1]?.value || `item-${idx}`"
              >
                {{ toggleTextLabels[idx - 1] || `Item ${idx}` }}
              </Toggle>
            </ToggleGroup>

            <!-- 2. ICON ONLY GROUP -->
            <ToggleGroup
              v-if="playground.type === 'single'"
              v-model="singleActive"
              :type="'single'"
              :mandatory="playground.mandatory"
              :orientation="playground.orientation"
              :attached="playground.attached"
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :disabled="playground.disabled"
              :icon-fill="playground.iconFill"
            >
              <Toggle
                v-for="(icon, idx) in toggleIcons.slice(0, playground.count)"
                :key="'ico-' + idx"
                :value="icon.value"
                :icon-only="true"
                :aria-label="icon.name"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path :d="icon.path" />
                </svg>
              </Toggle>
            </ToggleGroup>

            <ToggleGroup
              v-else
              v-model="multipleActive"
              :type="'multiple'"
              :orientation="playground.orientation"
              :attached="playground.attached"
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :disabled="playground.disabled"
              :icon-fill="playground.iconFill"
            >
              <Toggle
                v-for="(icon, idx) in toggleIcons.slice(0, playground.count)"
                :key="'ico-multi-' + idx"
                :value="icon.value"
                :icon-only="true"
                :aria-label="icon.name"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path :d="icon.path" />
                </svg>
              </Toggle>
            </ToggleGroup>

            <!-- 3. ICON + TEXT GROUP -->
            <ToggleGroup
              v-if="playground.type === 'single'"
              v-model="singleActive"
              :type="'single'"
              :mandatory="playground.mandatory"
              :orientation="playground.orientation"
              :attached="playground.attached"
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :disabled="playground.disabled"
              :icon-fill="playground.iconFill"
            >
              <Toggle
                v-for="(item, idx) in toggleComboItems.slice(0, playground.count)"
                :key="'combo-' + idx"
                :value="item.value"
              >
                <template #icon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path :d="item.path" />
                  </svg>
                </template>
                {{ item.label }}
              </Toggle>
            </ToggleGroup>

            <ToggleGroup
              v-else
              v-model="multipleActive"
              :type="'multiple'"
              :orientation="playground.orientation"
              :attached="playground.attached"
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :disabled="playground.disabled"
              :icon-fill="playground.iconFill"
            >
              <Toggle
                v-for="(item, idx) in toggleComboItems.slice(0, playground.count)"
                :key="'combo-multi-' + idx"
                :value="item.value"
              >
                <template #icon>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path :d="item.path" />
                  </svg>
                </template>
                {{ item.label }}
              </Toggle>
            </ToggleGroup>

          </div>
        </div>

        <!-- INSPECTOR CONTROLS -->
        <div class="props-inspector-list">
          
          <!-- TYPE -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">type</span>
              <span class="prop-type-signature">'single' | 'multiple'</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  :class="['segment-pill-btn', { active: playground.type === 'single' }]"
                  @click="playground.type = 'single'"
                >
                  single
                </button>
                <button
                  :class="['segment-pill-btn', { active: playground.type === 'multiple' }]"
                  @click="playground.type = 'multiple'"
                >
                  multiple
                </button>
              </div>
            </div>
          </div>

          <!-- ORIENTATION -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">orientation</span>
              <span class="prop-type-signature">'horizontal' | 'vertical'</span>
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
              <span class="prop-type-signature">boolean (fusión geométrica 1px)</span>
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

          <!-- MANDATORY (SINGLE MODE) -->
          <div v-if="playground.type === 'single'" class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">mandatory</span>
              <span class="prop-type-signature">boolean (requiere siempre 1 activo)</span>
            </div>
            <div class="prop-input-col">
              <button 
                class="sleek-checkbox"
                aria-label="Toggle mandatory state"
                :class="{ checked: playground.mandatory }"
                @click="playground.mandatory = !playground.mandatory"
                role="checkbox"
                :aria-checked="playground.mandatory"
              >
                <svg v-if="playground.mandatory" viewBox="0 0 24 24" class="check-svg">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- DISABLED -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">disabled</span>
              <span class="prop-type-signature">boolean (deshabilita todo el grupo)</span>
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

          <!-- ICON FILL (AUTOFILL) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">iconFill</span>
              <span class="prop-type-signature">boolean (relleno sólido inherente al activar)</span>
            </div>
            <div class="prop-input-col">
              <button 
                class="sleek-checkbox"
                aria-label="Toggle icon fill state"
                :class="{ checked: playground.iconFill }"
                @click="playground.iconFill = !playground.iconFill"
                role="checkbox"
                :aria-checked="playground.iconFill"
              >
                <svg v-if="playground.iconFill" viewBox="0 0 24 24" class="check-svg">
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
            <button class="snippet-copy-btn" @click="copyCode(generatedToggleGroupCode, 'toggle-group-code-gen')">
              <span v-if="copiedSnippet === 'toggle-group-code-gen'" class="copied-badge">Copiado</span>
              <span v-else class="copy-text">Copiar Código</span>
            </button>
          </div>
          <pre class="pre-block"><code>{{ generatedToggleGroupCode }}</code></pre>
        </div>
      </section>

      <!-- VISUAL MATRIX -->
      <section class="matrix-section">
        <div class="section-header-wrap">
          <h2 class="section-title">Matriz Visual de ToggleGroup</h2>
          <p class="section-text">
            Comprobación de estados activos e inactivos en los 10 colores del sistema:
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
                  <ToggleGroup :model-value="'uno'" type="single" :mandatory="true" style="margin-top: 8px;">
                    <Toggle value="uno" :variant="v" :color="c" shape="square" size="small">Uno</Toggle>
                    <Toggle value="dos" :variant="v" :color="c" shape="square" size="small">Dos</Toggle>
                  </ToggleGroup>
                  <ToggleGroup :model-value="['a', 'c']" type="multiple" style="margin-top: 8px;">
                    <Toggle value="a" :variant="v" :color="c" shape="round" size="small">A</Toggle>
                    <Toggle value="b" :variant="v" :color="c" shape="round" size="small">B</Toggle>
                    <Toggle value="c" :variant="v" :color="c" shape="round" size="small">C</Toggle>
                  </ToggleGroup>
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
