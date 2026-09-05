<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import { useGlimm } from '../composables/useGlimm';
import { useTheme } from '../composables/useTheme';
import { createSolidPalette, type SweepDirection } from '../utils/glimm/glimmEngine';

const router = useRouter();
const { isDark, toggleTheme } = useTheme();
const { triggerSweep, isSweeping } = useGlimm();

// 1. Inspector Configuration State
const config = ref({
  palette: 'prism',
  direction: 'ltr' as SweepDirection,
  easing: 'easeInOutCubic',
  sweepMs: 850,
  outroMs: 400,
  midpoint: 0.52,
  bandTight: 14,
  waveAmount: 0,
  rippleAmount: 1,
  swellAmount: 0.55,
  brightness: 1,
  customSolidHex: '#f97316'
});

// 2. Simulated Moments States (Best Practices)
const publishState = ref<'draft' | 'published'>('draft');
const zenMode = ref(false);
const confirmedState = ref(false);

// Palettes list
const paletteOptions = [
  { key: 'prism', name: 'Prism (Glimm)', color: 'linear-gradient(135deg, #00C0E8, #6155F5, #CB30E0)' },
  { key: 'berry', name: 'Berry', color: 'linear-gradient(135deg, #FF2D55, #CB30E0)' },
  { key: 'lagoon', name: 'Lagoon', color: 'linear-gradient(135deg, #0088FF, #34C759)' },
  { key: 'citrus', name: 'Citrus', color: 'linear-gradient(135deg, #34C759, #FFCC00, #FF8D28)' },
  { key: 'azure', name: 'Azure', color: 'linear-gradient(135deg, #00C0E8, #6155F5)' },
  { key: 'ember', name: 'Ember', color: 'linear-gradient(135deg, #FFCC00, #FF2D55)' },
  { key: 'ciervo', name: 'Ciervo Warm', color: 'linear-gradient(135deg, #f97316, #fb923c, #ea580c)' },
  { key: 'neon', name: 'Neon Cyber', color: 'linear-gradient(135deg, #00f5d4, #7b2cbf, #f72585)' },
  { key: 'aurora', name: 'Aurora', color: 'linear-gradient(135deg, #05ffa1, #00bbf9, #4361ee)' },
  { key: 'monochrome', name: 'Monochrome', color: 'linear-gradient(135deg, #ffffff, #9ca3af)' },
  { key: 'solidOrange', name: 'Sólido Naranja', color: '#f97316' },
  { key: 'solidBlue', name: 'Sólido Azul', color: '#3b82f6' },
  { key: 'customSolid', name: 'Sólido Custom', color: config.value.customSolidHex }
];

const directionsList: { value: SweepDirection; label: string }[] = [
  { value: 'ltr', label: 'LTR (Izquierda → Derecha)' },
  { value: 'rtl', label: 'RTL (Derecha → Izquierda)' },
  { value: 'ttb', label: 'TTB (Arriba → Abajo)' },
  { value: 'btt', label: 'BTT (Abajo → Arriba)' }
];

const easingsList = [
  { key: 'easeInOutCubic', label: 'easeInOutCubic (Original)' },
  { key: 'easeOutQuart', label: 'easeOutQuart (Snappy)' },
  { key: 'spring', label: 'spring (Física Ciervo)' },
  { key: 'snap', label: 'snap (Inmediato)' },
  { key: 'back', label: 'back (Con impulso)' },
  { key: 'linear', label: 'linear (Constante)' }
];

// Helper to resolve effective palette
function getEffectivePalette() {
  if (config.value.palette === 'customSolid') {
    return createSolidPalette(config.value.customSolidHex);
  }
  return config.value.palette;
}

// Trigger laboratory sweep
async function handleTriggerSweep(customOnMidpoint?: () => void) {
  await triggerSweep({
    palette: getEffectivePalette(),
    direction: config.value.direction,
    easing: config.value.easing,
    sweepMs: Number(config.value.sweepMs),
    outroMs: Number(config.value.outroMs),
    midpoint: Number(config.value.midpoint),
    bandTight: Number(config.value.bandTight),
    waveAmount: Number(config.value.waveAmount),
    rippleAmount: Number(config.value.rippleAmount),
    swellAmount: Number(config.value.swellAmount),
    brightness: Number(config.value.brightness),
    onMidpoint: customOnMidpoint
  });
}

// Best Practice Action 1: Publish state toggle
async function handlePublishAction() {
  await handleTriggerSweep(() => {
    publishState.value = publishState.value === 'draft' ? 'published' : 'draft';
  });
}

// Best Practice Action 2: Zen mode toggle
async function handleZenAction() {
  await handleTriggerSweep(() => {
    zenMode.value = !zenMode.value;
  });
}

// Best Practice Action 3: Confirm transfer toggle
async function handleConfirmAction() {
  await handleTriggerSweep(() => {
    confirmedState.value = !confirmedState.value;
  });
}

// Snippet copy state
const copiedSnippet = ref(false);
const generatedCode = computed(() => {
  const pal = config.value.palette === 'customSolid'
    ? `createSolidPalette('${config.value.customSolidHex}')`
    : `'${config.value.palette}'`;

  return `// Disparar transición WebGL con los parámetros actuales
import { useGlimm } from ` + `'@/composables/useGlimm';

const { triggerSweep } = useGlimm();

await triggerSweep({
  palette: ${pal},
  direction: '${config.value.direction}',
  easing: '${config.value.easing}',
  sweepMs: ${config.value.sweepMs},
  outroMs: ${config.value.outroMs},
  midpoint: ${config.value.midpoint},
  bandTight: ${config.value.bandTight},
  waveAmount: ${config.value.waveAmount},
  rippleAmount: ${config.value.rippleAmount},
  swellAmount: ${config.value.swellAmount},
  brightness: ${config.value.brightness},
  onMidpoint: () => {
    // Aquí actualizas tu vista o estado justo cuando la luz cruza el centro
  }
});`;
});

async function copyCode() {
  try {
    await navigator.clipboard.writeText(generatedCode.value);
    copiedSnippet.value = true;
    setTimeout(() => {
      copiedSnippet.value = false;
    }, 2000);
  } catch (err) {
    console.error('Copy failed', err);
  }
}
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
          <span>Glimm WebGL Lab</span>
          <span class="meta-divider">·</span>
          <span>Experimental</span>
        </div>
        
        <div class="theme-toggle">
          <Button 
            variant="ghost" 
            color="black" 
            shape="round" 
            size="small"
            @click="toggleTheme"
          >
            {{ isDark ? 'Modo Claro ☀️' : 'Modo Oscuro 🌙' }}
          </Button>
        </div>
      </header>

      <!-- HERO -->
      <section class="hero-section">
        <div class="hero-badge">Laboratorio Gráfico GPU</div>
        <h1 class="hero-title">Glimm Shader Transitions</h1>
        <p class="hero-desc">
          Entorno aislado de pruebas para transiciones cinemáticas WebGL aceleradas por GPU.
          Permite ajustar la banda Gaussiana, síntesis de normales de superficie, Fresnel especular y paletas de coseno en tiempo real.
        </p>

        <!-- BEST PRACTICE CALLOUT -->
        <div class="best-practice-card">
          <div class="bp-icon">💡</div>
          <div class="bp-content">
            <span class="bp-title">Filosofía de Buenas Prácticas (Puntuación, no movimiento continuo)</span>
            <p class="bp-text">
              Glimm está diseñado para momentos conmemorativos de alto impacto (publicar, finalizar compra, cambiar a modo presentación),
              manteniendo la navegación habitual tranquila y reservando el barrido para cuando la acción amerita una celebración.
            </p>
          </div>
        </div>
      </section>

      <!-- TEST STAGE CANVAS -->
      <section class="playground-section-container">
        <div class="section-header-wrap">
          <h2 class="section-title">Escenario de Pruebas en Vivo</h2>
          <p class="section-text">
            Presiona el botón para disparar un barrido con la configuración actual, o interactúa con las tarjetas de momentos:
          </p>
        </div>

        <div class="stage-canvas-card" style="min-height: 280px; padding: 36px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32px;">
          
          <!-- PRIMARY TRIGGER BUTTON -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <Button
              variant="solid"
              color="orange"
              size="large"
              shape="round"
              :loading="isSweeping"
              @click="handleTriggerSweep()"
            >
              <template #icon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 3l14 9-14 9V3z"/>
                </svg>
              </template>
              {{ isSweeping ? 'Barriendo la Pantalla...' : 'Disparar Barrido Shader' }}
            </Button>
            <span style="font-size: 12px; color: var(--text-secondary);">
              Efecto renderizado a resolución nativa con GPU
            </span>
          </div>

          <!-- 3 BEST PRACTICE ACTION CARDS -->
          <div class="action-cards-grid">
            
            <!-- Card 1: Publish Component -->
            <div class="moment-card" :class="{ active: publishState === 'published' }">
              <div class="moment-card-header">
                <span class="moment-badge">Momento 1: Publicación</span>
                <span class="moment-status-dot" :style="{ background: publishState === 'published' ? '#22c55e' : '#f97316' }"></span>
              </div>
              <h3 class="moment-title">Lanzar a Producción</h3>
              <p class="moment-desc">
                {{ publishState === 'published' ? '✓ Componente publicado exitosamente en v0.1.0' : 'El componente está actualmente en borrador local.' }}
              </p>
              <Button
                variant="soft"
                :color="publishState === 'published' ? 'green' : 'orange'"
                size="small"
                shape="round"
                @click="handlePublishAction"
              >
                {{ publishState === 'published' ? 'Deshacer a Borrador' : 'Publicar con Barrido' }}
              </Button>
            </div>

            <!-- Card 2: Zen Mode Focus -->
            <div class="moment-card" :class="{ active: zenMode }">
              <div class="moment-card-header">
                <span class="moment-badge">Momento 2: Modo Enfocado</span>
                <span class="moment-status-dot" :style="{ background: zenMode ? '#a855f7' : '#9ca3af' }"></span>
              </div>
              <h3 class="moment-title">Entorno Zen</h3>
              <p class="moment-desc">
                {{ zenMode ? 'Modo de concentración profunda activo sin distracciones.' : 'Modo estándar con todas las herramientas visibles.' }}
              </p>
              <Button
                variant="framed"
                color="violet"
                size="small"
                shape="round"
                @click="handleZenAction"
              >
                {{ zenMode ? 'Volver a Normal' : 'Activar Modo Zen' }}
              </Button>
            </div>

            <!-- Card 3: Action Confirm -->
            <div class="moment-card" :class="{ active: confirmedState }">
              <div class="moment-card-header">
                <span class="moment-badge">Momento 3: Confirmación</span>
                <span class="moment-status-dot" :style="{ background: confirmedState ? '#06b6d4' : '#9ca3af' }"></span>
              </div>
              <h3 class="moment-title">Confirmar Acción</h3>
              <p class="moment-desc">
                {{ confirmedState ? '✓ Transacción confirmada y registrada en el historial.' : 'Acción pendiente de autorización.' }}
              </p>
              <Button
                variant="outline"
                color="cyan"
                size="small"
                shape="round"
                @click="handleConfirmAction"
              >
                {{ confirmedState ? 'Reiniciar Estado' : 'Confirmar con Glimm' }}
              </Button>
            </div>

          </div>

        </div>

        <!-- INSPECTOR CONTROLS -->
        <div class="props-inspector-list">
          
          <!-- PALETTE SELECTION -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">palette</span>
              <span class="prop-type-signature">Glimm original · Ciervo Bespoke · Sólidos</span>
            </div>
            <div class="prop-input-col">
              <div class="palette-pill-scroll">
                <button
                  v-for="p in paletteOptions"
                  :key="p.key"
                  :class="['palette-select-btn', { active: config.palette === p.key }]"
                  @click="config.palette = p.key"
                >
                  <span class="palette-preview-swatch" :style="{ background: p.color }"></span>
                  <span>{{ p.name }}</span>
                </button>
              </div>

              <!-- Custom Hex picker if customSolid selected -->
              <div v-if="config.palette === 'customSolid'" style="margin-top: 10px; display: flex; align-items: center; gap: 10px;">
                <label style="font-size: 13px; color: var(--text-secondary);">Color Hex:</label>
                <input
                  type="color"
                  v-model="config.customSolidHex"
                  style="border: none; width: 36px; height: 32px; border-radius: 6px; cursor: pointer; background: transparent;"
                />
                <input
                  type="text"
                  v-model="config.customSolidHex"
                  class="custom-hex-input"
                  placeholder="#f97316"
                />
              </div>
            </div>
          </div>

          <!-- DIRECTION -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">direction</span>
              <span class="prop-type-signature">'ltr' | 'rtl' | 'ttb' | 'btt'</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  v-for="dir in directionsList"
                  :key="dir.value"
                  :class="['segment-pill-btn', { active: config.direction === dir.value }]"
                  @click="config.direction = dir.value"
                >
                  {{ dir.value }}
                </button>
              </div>
            </div>
          </div>

          <!-- EASING -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">easing</span>
              <span class="prop-type-signature">Curvas temporales (incluye física de resorte ciervo)</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group" style="flex-wrap: wrap;">
                <button
                  v-for="e in easingsList"
                  :key="e.key"
                  :class="['segment-pill-btn', { active: config.easing === e.key }]"
                  @click="config.easing = e.key"
                >
                  {{ e.key }}
                </button>
              </div>
            </div>
          </div>

          <!-- SLIDER: SWEEP MS (DURATION) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">sweepMs (duración)</span>
              <span class="prop-type-signature">Tiempo de cruce: {{ config.sweepMs }} ms</span>
            </div>
            <div class="prop-input-col slider-row">
              <input 
                type="range" 
                min="200" 
                max="2000" 
                step="50" 
                v-model.number="config.sweepMs" 
                class="sleek-slider" 
              />
              <span class="slider-val">{{ config.sweepMs }}ms</span>
            </div>
          </div>

          <!-- SLIDER: OUTRO MS (FADE) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">outroMs (desvanecimiento)</span>
              <span class="prop-type-signature">Fade post-travesía: {{ config.outroMs }} ms</span>
            </div>
            <div class="prop-input-col slider-row">
              <input 
                type="range" 
                min="100" 
                max="1000" 
                step="25" 
                v-model.number="config.outroMs" 
                class="sleek-slider" 
              />
              <span class="slider-val">{{ config.outroMs }}ms</span>
            </div>
          </div>

          <!-- SLIDER: BAND TIGHT (ANCHO Y ENFOQUE) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">bandTight (grosor de banda)</span>
              <span class="prop-type-signature">Menor = más ancho y difuso | Mayor = haz concentrado ({{ config.bandTight }})</span>
            </div>
            <div class="prop-input-col slider-row">
              <input 
                type="range" 
                min="1" 
                max="50" 
                step="1" 
                v-model.number="config.bandTight" 
                class="sleek-slider" 
              />
              <span class="slider-val">{{ config.bandTight }}</span>
            </div>
          </div>

          <!-- SLIDER: SWELL AMOUNT (RELIEVE FRESNEL) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">swellAmount (iridiscencia y relieve)</span>
              <span class="prop-type-signature">Intensidad del brillo especular Apple NameDrop ({{ config.swellAmount }})</span>
            </div>
            <div class="prop-input-col slider-row">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                v-model.number="config.swellAmount" 
                class="sleek-slider" 
              />
              <span class="slider-val">{{ config.swellAmount }}</span>
            </div>
          </div>

          <!-- SLIDER: WAVE AMOUNT (ONDULACIÓN) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">waveAmount (curvatura orgánica)</span>
              <span class="prop-type-signature">Deformación del borde ({{ config.waveAmount }})</span>
            </div>
            <div class="prop-input-col slider-row">
              <input 
                type="range" 
                min="0" 
                max="2" 
                step="0.1" 
                v-model.number="config.waveAmount" 
                class="sleek-slider" 
              />
              <span class="slider-val">{{ config.waveAmount }}</span>
            </div>
          </div>

          <!-- SLIDER: RIPPLE AMOUNT (TEXTURA FOIL) -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">rippleAmount (textura interna)</span>
              <span class="prop-type-signature">Vibración cromática transversal ({{ config.rippleAmount }})</span>
            </div>
            <div class="prop-input-col slider-row">
              <input 
                type="range" 
                min="0" 
                max="2" 
                step="0.1" 
                v-model.number="config.rippleAmount" 
                class="sleek-slider" 
              />
              <span class="slider-val">{{ config.rippleAmount }}</span>
            </div>
          </div>

          <!-- SLIDER: BRIGHTNESS -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">brightness (brillo RGB)</span>
              <span class="prop-type-signature">Multiplicador de intensidad de luz ({{ config.brightness }})</span>
            </div>
            <div class="prop-input-col slider-row">
              <input 
                type="range" 
                min="0.2" 
                max="1.5" 
                step="0.05" 
                v-model.number="config.brightness" 
                class="sleek-slider" 
              />
              <span class="slider-val">{{ config.brightness }}</span>
            </div>
          </div>

          <!-- SLIDER: MIDPOINT -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">midpoint (punto de cambio)</span>
              <span class="prop-type-signature">Progreso (0-1) donde se reemplaza el contenido: {{ config.midpoint }}</span>
            </div>
            <div class="prop-input-col slider-row">
              <input 
                type="range" 
                min="0.2" 
                max="0.8" 
                step="0.02" 
                v-model.number="config.midpoint" 
                class="sleek-slider" 
              />
              <span class="slider-val">{{ config.midpoint }}</span>
            </div>
          </div>

        </div>

        <!-- CODE GENERATOR CARD -->
        <div class="code-card playground-code-card">
          <div class="snippet-top-bar">
            <span class="snippet-label">Código de Invocación TypeScript / Vue</span>
            <button class="snippet-copy-btn" @click="copyCode">
              <span v-if="copiedSnippet" class="copied-badge">Copiado</span>
              <span v-else class="copy-text">Copiar Código</span>
            </button>
          </div>
          <pre class="pre-block"><code>{{ generatedCode }}</code></pre>
        </div>

      </section>

      <!-- FOOTER & ATTRIBUTION -->
      <footer class="demo-footer">
        <div class="footer-content" style="flex-direction: column; gap: 8px; text-align: center;">
          <span>
            ciervo-ui · Glimm WebGL Transition Lab · Original Shader Math & Algorithms by <strong>Noman Ijaz</strong> (MIT License)
          </span>
          <span style="font-size: 12px; color: var(--text-secondary);">
            Adaptación nativa y motor desacoplado para Vue 3 y Vite.
          </span>
        </div>
      </footer>

    </div>
  </div>
</template>

<style scoped>
.best-practice-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--card-bg, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
  margin-top: 24px;
}

.bp-icon {
  font-size: 24px;
  line-height: 1;
}

.bp-title {
  display: block;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.bp-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin: 0;
}

.action-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  width: 100%;
}

.moment-card {
  padding: 20px;
  border-radius: 12px;
  background: var(--canvas-bg, rgba(255, 255, 255, 0.02));
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.08));
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 250ms ease;
}

.moment-card.active {
  border-color: rgba(249, 115, 22, 0.4);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.moment-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.moment-badge {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.moment-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background 250ms ease;
}

.moment-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.moment-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
  flex: 1;
}

.palette-pill-scroll {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.palette-select-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  background: var(--canvas-bg, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.palette-select-btn:hover {
  border-color: rgba(249, 115, 22, 0.4);
}

.palette-select-btn.active {
  background: rgba(249, 115, 22, 0.12);
  border-color: #f97316;
  color: #f97316;
}

.palette-preview-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.custom-hex-input {
  background: var(--canvas-bg, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.15));
  border-radius: 6px;
  padding: 4px 10px;
  font-family: monospace;
  font-size: 13px;
  color: var(--text-primary);
  width: 90px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sleek-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: var(--card-border, rgba(255, 255, 255, 0.15));
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.sleek-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f97316;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: transform 120ms ease;
}

.sleek-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.sleek-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f97316;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.slider-val {
  min-width: 55px;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}
</style>
