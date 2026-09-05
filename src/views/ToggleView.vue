<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import Toggle from '../components/Toggle/Toggle.vue';
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

const heroLoading = ref(false);
const triggerHeroLoading = () => {
  heroLoading.value = true;
  setTimeout(() => heroLoading.value = false, 2000);
};

const playgroundMode = ref<'normal' | 'stateful'>('normal');

// 2. Interactive Props Laboratory for Toggle
type VariantType = 'solid' | 'framed' | 'soft' | 'ghost' | 'outline';
type SizeType = 'micro' | 'tiny' | 'small' | 'medium' | 'large';
type ShapeType = 'square' | 'round';
type ColorType = 'black' | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'cyan' | 'blue' | 'violet' | 'pink';

const playground = ref({
  variant: 'solid' as VariantType,
  color: 'orange' as ColorType,
  size: 'medium' as SizeType,
  shape: 'round' as ShapeType,
  iconPosition: 'start' as 'start' | 'end',
  iconFill: true,
  disabled: false,
  sound: true
});

// Reactive states for laboratory toggles
const labToggleText = ref(true);
const labToggleIcon = ref(true);
const labToggleCombo = ref(true);

// Showcase example states
const fav1 = ref(true);
const pin1 = ref(false);
const mute1 = ref(false);
const bell1 = ref(true);
const bookmark1 = ref(false);

const demoToggle1 = ref(true);
const demoToggle2 = ref(true);
const demoToggle3 = ref(false);

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

// Vue Code Generator for Toggle
const generatedToggleCode = computed(() => {
  const posProp = playground.value.iconPosition !== 'start' ? ` icon-position="${playground.value.iconPosition}"` : '';
  const fillProp = !playground.value.iconFill ? ` :icon-fill="false"` : '';
  const disProp = playground.value.disabled ? ` :disabled="true"` : '';
  const sndProp = !playground.value.sound ? ` :sound="false"` : '';
  const stateProp = playgroundMode.value === 'stateful' ? ` :state="isPressed ? 'Activado' : 'Desactivado'"` : '';

  return `<Toggle
  v-model="isPressed"
  variant="${playground.value.variant}"
  color="${playground.value.color}"
  size="${playground.value.size}"
  shape="${playground.value.shape}"${posProp}${fillProp}${disProp}${sndProp}${stateProp}
>
  <template #icon>
    <StarIcon />
  </template>
${playgroundMode.value === 'stateful' ? '' : `  {{ isPressed ? 'Activado' : 'Desactivado' }}\n`}</Toggle>`;
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
          <span>v0.1.0</span>
          <span class="meta-divider">·</span>
          <span>Toggle</span>
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
        <h1 class="hero-title">toggle</h1>
        <p class="hero-subtitle">
          Botón conmutable de dos estados (Activo / Inactivo) con sincronización acústica mecánica mediante Cuelume,
          gestión inherente de relleno de iconos, acoplamiento geométrico sin desalineación y compatibilidad con los 10 colores del sistema.
        </p>

      </section>

      <!-- CONTROLES DE ESTADO EN LA INTERFAZ -->
      <section class="showcase-section">
        <h2 class="section-title">Casos de Uso Comunes</h2>
        <p class="section-text">
          Diseñado para botones de acción conmutable de alta frecuencia como marcadores, alertas, pines y estados multimedia:
        </p>
        
        <div class="showcase-row" style="flex-wrap: wrap; gap: 16px; align-items: center;">
          <!-- Star / Favorite -->
          <Toggle v-model="fav1" variant="solid" color="yellow" shape="round" :state="fav1 ? 'Favorito' : 'Guardar'">
            <template #icon>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </template>
          </Toggle>

          <!-- Pin -->
          <Toggle v-model="pin1" variant="framed" color="orange" shape="square" :state="pin1 ? 'Fijado' : 'Fijar'">
            <template #icon>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="17" x2="12" y2="22"></line>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </template>
          </Toggle>

          <!-- Mute -->
          <Toggle v-model="mute1" variant="soft" color="red" shape="round" icon-only aria-label="Silenciar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z"/>
              <line v-if="mute1" x1="23" y1="9" x2="17" y2="15"></line>
              <line v-if="mute1" x1="17" y1="9" x2="23" y2="15"></line>
              <path v-else d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          </Toggle>

          <!-- Notifications Bell -->
          <Toggle v-model="bell1" variant="outline" color="blue" shape="round">
            <template #icon>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </template>
            Notificaciones
          </Toggle>

          <!-- Bookmark -->
          <Toggle v-model="bookmark1" variant="ghost" color="violet" shape="round" icon-only aria-label="Guardar marcador">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
          </Toggle>
        </div>
      </section>

      <!-- LABORATORIO INTERACTIVO -->
      <section class="playground-section-container">
        <div class="section-header-wrap">
          <h2 class="section-title">Laboratorio Interactivo de Toggle</h2>
          <p class="section-text">
            Prueba la respuesta háptica táctil y visual al presionar los tres tipos de presentación de Toggle:
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

        <div class="stage-canvas-card" style="min-height: 260px; padding: 40px 24px;">
          <div class="stage-canvas-inner" style="gap: 28px; flex-wrap: wrap;">
            
            <!-- 1. TEXT TOGGLE -->
            <Toggle
              v-model="labToggleText"
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :disabled="playground.disabled"
              :sound="playground.sound"
              :state="playgroundMode === 'stateful' ? (labToggleText ? 'Activado' : 'Desactivado') : undefined"
            >
              <template v-if="playgroundMode !== 'stateful'">{{ labToggleText ? 'Activado' : 'Desactivado' }}</template>
            </Toggle>

            <!-- 2. ICON ONLY TOGGLE -->
            <Toggle
              v-model="labToggleIcon"
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :disabled="playground.disabled"
              :sound="playground.sound"
              :icon-fill="playground.iconFill"
              :icon-only="true"
              aria-label="Favorito"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </Toggle>

            <!-- 3. ICON + TEXT TOGGLE -->
            <Toggle
              v-model="labToggleCombo"
              :variant="playground.variant"
              :color="playground.color"
              :size="playground.size"
              :shape="playground.shape"
              :disabled="playground.disabled"
              :sound="playground.sound"
              :icon-position="playground.iconPosition"
              :icon-fill="playground.iconFill"
              :state="playgroundMode === 'stateful' ? (labToggleCombo ? 'Favorito' : 'Marcar Favorito') : undefined"
            >
              <template #icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </template>
              <template v-if="playgroundMode !== 'stateful'">{{ labToggleCombo ? 'Favorito' : 'Marcar Favorito' }}</template>
            </Toggle>

          </div>
        </div>

        <!-- CONTROLES DEL INSPECTOR -->
        <div class="props-inspector-list">
          
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

          <!-- ICON POSITION -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">iconPosition</span>
              <span class="prop-type-signature">'start' | 'end'</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  :class="['segment-pill-btn', { active: playground.iconPosition === 'start' }]"
                  @click="playground.iconPosition = 'start'"
                >
                  start
                </button>
                <button
                  :class="['segment-pill-btn', { active: playground.iconPosition === 'end' }]"
                  @click="playground.iconPosition = 'end'"
                >
                  end
                </button>
              </div>
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

          <!-- DISABLED -->
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

          <!-- SOUND (CUELUME) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">sound</span>
              <span class="prop-type-signature">boolean (motor acústico mecánico Cuelume)</span>
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

        <!-- CODE SNIPPET -->
        <div class="code-card playground-code-card">
          <div class="snippet-top-bar">
            <span class="snippet-label">Código Vue Generado</span>
            <button class="snippet-copy-btn" @click="copyCode(generatedToggleCode, 'toggle-code-gen')">
              <span v-if="copiedSnippet === 'toggle-code-gen'" class="copied-badge">Copiado</span>
              <span v-else class="copy-text">Copiar Código</span>
            </button>
          </div>
          <pre class="pre-block"><code>{{ generatedToggleCode }}</code></pre>
        </div>
      </section>

      <!-- =========================================
           5. ESTADOS Y ZERO LAYOUT SHIFT (STATEFUL)
           ========================================= -->
      <section class="demo-section">
        <h2 class="section-title">Zero Layout Shift Morphing (Stateful)</h2>
        <div class="demo-card">
          <p class="demo-description">
            Al pasarle la propiedad <code>state</code>, el toggle integra un motor de físicas en su interior. Renderiza los estados entrante y saliente en contenedores superpuestos y anima su anchura utilizando <strong>físicas de resortes (Spring)</strong>, garantizando cero desplazamiento abrupto del DOM y permitiendo un morphing orgánico.
          </p>
          <div class="showcase-row" style="margin-top: 1.5rem;">
            
            <Toggle 
              v-model="demoToggle1"
              variant="solid" 
              color="orange" 
              shape="round" 
              size="medium"
              :state="demoToggle1 ? 'Modo Desarrollador' : 'Usuario Normal'"
            >
              <template #icon>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                </svg>
              </template>
            </Toggle>

            <Toggle 
              v-model="demoToggle2"
              variant="framed" 
              color="blue" 
              shape="round" 
              size="medium"
              :state="demoToggle2 ? 'Conectado (Online)' : 'Desconectado'"
            />

            <Toggle 
              v-model="demoToggle3"
              variant="soft" 
              color="pink" 
              shape="square" 
              size="medium"
              :state="demoToggle3 ? 'Silenciado' : 'Sonido Activado'"
            >
               <template #icon>
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                   <path v-if="!demoToggle3" d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                   <line v-if="demoToggle3" x1="23" y1="9" x2="17" y2="15"/>
                   <line v-if="demoToggle3" x1="17" y1="9" x2="23" y2="15"/>
                 </svg>
               </template>
            </Toggle>
            
          </div>
        </div>
      </section>

      <!-- MATRIZ VISUAL DE TOGGLES -->
      <section class="matrix-section">
        <div class="section-header-wrap">
          <h2 class="section-title">Matriz Visual de Toggle</h2>
          <p class="section-text">
            Comprobación de estados Activo (ON) e Inactivo (OFF) en los 10 colores del sistema:
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
                  <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <Toggle :model-value="true" :variant="v" :color="c" shape="square" size="small">On</Toggle>
                    <Toggle :model-value="false" :variant="v" :color="c" shape="square" size="small">Off</Toggle>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <Toggle :model-value="true" :variant="v" :color="c" shape="round" size="small" icon-only aria-label="On">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </Toggle>
                    <Toggle :model-value="false" :variant="v" :color="c" shape="round" size="small" icon-only aria-label="Off">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </Toggle>
                  </div>
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
