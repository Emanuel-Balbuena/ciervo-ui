<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import Select from '../components/Select/Select.vue';
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

// 2. Colores del sistema (mismo orden que la demo de Slider)
type ColorType = 'black' | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'cyan' | 'blue' | 'violet' | 'pink';
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

// 3. Opciones compartidas por las historias
const baseOptions = Array.from({ length: 12 }, (_, i) => `Opción ${i + 1}`);

// Una deshabilitada en medio, para comprobar que el teclado se la salta.
const allOptions = [
  ...baseOptions.slice(0, 4),
  { label: 'Opción 5 (deshabilitada)', value: 'Opción 5', disabled: true },
  ...baseOptions.slice(5),
];

const longOptions = Array.from({ length: 30 }, (_, i) => `Opción ${i + 1}`);

const fancyOptions = [
  { label: 'Diseño', value: 'design', desc: 'Tokens, radio y espaciado' },
  { label: 'Movimiento', value: 'motion', desc: 'Springs y easings' },
  { label: 'Contenido', value: 'content', desc: 'Texto y jerarquía', disabled: true },
  { label: 'Sistema', value: 'system', desc: 'Temas claro y oscuro' },
];

// 4. Fábrica de estado: cada Select necesita su propio open + origin + valor.
// El origin se captura del clic en el trigger (ver captureTrigger): el
// componente mide ese elemento y lo usa como ancla del morph.
interface DemoState {
  open: boolean;
  origin: HTMLElement | null;
  value: unknown;
}
const makeDemo = (value: unknown = 'Opción 1'): DemoState => ({
  open: false,
  origin: null,
  value,
});

// 5. Laboratorio Interactivo de Props
type PlacementType = 'inplace-b' | 'inplace-t' | 'sticky' | 'anchor';
type TitleType = 'top' | 'bottom' | 'trigger';
type ModeType = 'transform' | 'gsap' | 'simple';

const playgroundDemo = ref<DemoState>(makeDemo('Opción 1'));
const playground = ref({
  color: 'orange' as string,
  placement: 'inplace-b' as PlacementType,
  title: 'top' as TitleType,
  mode: 'gsap' as ModeType,
  maxVisibleRows: 8,
  closeOnSelect: true,
  closeOnScroll: true,
  dismissible: true,
  placeholder: 'Elige una opción',
});

// Generador de código Vue en tiempo real
const generatedPlaygroundCode = computed(() => {
  const lines: string[] = ['<Select class="trigger-select"', '  v-model="choice"', '  :options="options"'];
  if (playground.value.color) lines.push(`  color="${playground.value.color}"`);
  if (playground.value.placement !== 'inplace-t') lines.push(`  placement="${playground.value.placement}"`);
  if (playground.value.title !== 'top') lines.push(`  title="${playground.value.title}"`);
  if (playground.value.mode !== 'transform') lines.push(`  mode="${playground.value.mode}"`);
  if (playground.value.maxVisibleRows !== 8) lines.push(`  :maxVisibleRows="${playground.value.maxVisibleRows}"`);
  if (!playground.value.closeOnSelect) lines.push(`  :closeOnSelect="false"`);
  if (!playground.value.closeOnScroll) lines.push(`  :closeOnScroll="false"`);
  if (!playground.value.dismissible) lines.push(`  :dismissible="false"`);
  if (playground.value.placeholder !== '') lines.push(`  placeholder="${playground.value.placeholder}"`);
  return lines.join('\n') + '\n/>';
});

// 6. Historias con estado propio
const titleVariants: TitleType[] = ['top', 'bottom', 'trigger'];
const titleDemos = ref<DemoState[]>(titleVariants.map(() => makeDemo('Opción 1')));

const stickyDemo = ref<DemoState>(makeDemo('Opción 5'));
const simpleDemo = ref<DemoState>(makeDemo('Opción 1'));
const longDemo = ref<DemoState>(makeDemo('Opción 1'));
const scrollDemo = ref<DemoState>(makeDemo('Opción 3'));
const fancyDemo = ref<DemoState>(makeDemo('motion'));
const defaultDemo = ref<DemoState>(makeDemo(undefined));
const emptyDemo = ref<DemoState>(makeDemo(undefined));

// El trigger por defecto lo dibuja el componente: aquí solo se caza el botón
// real en fase de captura para darle un origin que medir.
const captureDefaultTrigger = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  const btn = target?.closest?.('button') as HTMLElement | null;
  if (btn) defaultDemo.value.origin = btn;
};

// Opciones de los segmentados del laboratorio. El anchor no existe en gsap y el
// simple solo abre en anchor (lo fuerza el motor): el segmentado enseña lo que
// cada modo puede usar.
const placementOptions = computed<PlacementType[]>(() => {
  if (playground.value.mode === 'simple') return ['anchor'];
  if (playground.value.mode === 'gsap') return ['inplace-b', 'inplace-t', 'sticky'];
  return ['inplace-b', 'inplace-t', 'sticky', 'anchor'];
});

// Al cambiar de modo, la colocación cae a la primera válida.
watch(() => playground.value.mode, (newMode) => {
  if (newMode === 'simple') playground.value.placement = 'anchor';
  else if (newMode === 'gsap' && playground.value.placement === 'anchor') {
    playground.value.placement = 'inplace-t';
  }
});
const titleOptions: TitleType[] = ['top', 'bottom', 'trigger'];
const modeOptions: ModeType[] = ['transform', 'gsap', 'simple'];

// Filtro para matriz visual de color
const selectedMatrixColor = ref<string>('all');
const matrixDemos = ref<DemoState[]>(colorsList.map(() => makeDemo('Opción 2')));
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
          <span>Select</span>
        </div>
      </header>

      <!-- =========================================
           2. HERO PRINCIPAL
           ========================================= -->
      <section class="hero-section">
        <h1 class="hero-title">select</h1>
        <p class="hero-subtitle">
          Un desplegable con elemento compartido: la etiqueta del trigger viaja hasta la caja
          con el motor morph y aterriza como encabezado. Lista con tope de filas visibles y
          scroll interno, modo sticky que clava la opción elegida sobre el trigger y cierre
          honesto con el scroll de la página.
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
            Abre el desplegable y pica una fila: lo que viaja de vuelta al trigger es la fila
            elegida. Modifica las props para ver los cambios en tiempo real.
          </p>
        </div>

        <!-- LIENZO DE PREVIEW DEL LABORATORIO -->
        <div class="stage-canvas-card" style="min-height: 380px; display: flex; align-items: center; justify-content: center; padding: 48px 24px;">
          <div style="width: 100%; max-width: 320px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 28px; font-weight: 500; font-size: 14px; opacity: 0.6; font-variant-numeric: tabular-nums;">
              <span>Valor Actual</span>
              <span>{{ String(playgroundDemo.value ?? '—') }}</span>
            </div>
            <Select class="trigger-select"
              v-model:open="playgroundDemo.open"
              v-model="playgroundDemo.value"
              :options="allOptions"
              :origin="playgroundDemo.origin"
              :color="playground.color"
              :placement="playground.placement"
              :title="playground.title"
              :mode="playground.mode"
              :maxVisibleRows="playground.maxVisibleRows"
              :closeOnSelect="playground.closeOnSelect"
              :closeOnScroll="playground.closeOnScroll"
              :dismissible="playground.dismissible"
              :placeholder="playground.placeholder"
            >
            </Select>
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

          <!-- PROP: PLACEMENT (el simple solo abre en anchor) -->
          <div class="prop-control-row" :style="{ opacity: playground.mode === 'simple' ? 0.5 : 1, pointerEvents: playground.mode === 'simple' ? 'none' : 'auto' }">
            <div class="prop-info-col">
              <span class="prop-name">placement</span>
              <span class="prop-type-signature">{{ placementOptions.join(' | ') }}</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  v-for="p in placementOptions"
                  :key="p"
                  :class="['segment-pill-btn', { active: playground.placement === p }]"
                  @click="playground.placement = p"
                >
                  {{ p }}
                </button>
              </div>
            </div>
          </div>

          <!-- PROP: TITLE (sin encabezado en sticky y en simple) -->
          <div class="prop-control-row" :style="{ opacity: (playground.placement === 'sticky' || playground.mode === 'simple') ? 0.5 : 1, pointerEvents: (playground.placement === 'sticky' || playground.mode === 'simple') ? 'none' : 'auto' }">
            <div class="prop-info-col">
              <span class="prop-name">title</span>
              <span class="prop-type-signature">top | bottom | trigger</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  v-for="t in titleOptions"
                  :key="t"
                  :class="['segment-pill-btn', { active: playground.title === t }]"
                  @click="playground.title = t"
                >
                  {{ t }}
                </button>
              </div>
            </div>
          </div>

          <!-- PROP: MODE -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">mode</span>
              <span class="prop-type-signature">transform | gsap | simple</span>
            </div>
            <div class="prop-input-col">
              <div class="segmented-pill-group">
                <button
                  v-for="m in modeOptions"
                  :key="m"
                  :class="['segment-pill-btn', { active: playground.mode === m }]"
                  @click="playground.mode = m"
                >
                  {{ m }}
                </button>
              </div>
            </div>
          </div>

          <h3 style="margin: 1.5rem 0 0.5rem; font-size: 1rem; font-weight: 600; text-transform: lowercase; letter-spacing: 0.02em; color: var(--cuelume-gray-500)">Comportamiento</h3>

          <!-- PROP: MAXVISIBLEROWS -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">maxVisibleRows</span>
              <span class="prop-type-signature">filas antes del scroll interno</span>
            </div>
            <div class="prop-input-col">
              <div style="width: 280px; display: flex; flex-direction: column; gap: 12px;">
                <Slider v-model="playground.maxVisibleRows" :min="1" :max="12" :step="1" color="blue" style="width: 60%; align-self: flex-end;" />
                <div style=" width: 60%; align-self: flex-end; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                  <span style="flex: 1; text-align: left;">1</span>
                  <span style="flex: 1; text-align: center; font-weight: 600; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: 12px;">{{ playground.maxVisibleRows }}</span>
                  <span style="flex: 1; text-align: right;">12</span>
                </div>
              </div>
            </div>
          </div>

          <!-- PROP: CLOSEONSELECT -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">closeOnSelect</span>
              <span class="prop-type-signature">elegir cierra</span>
            </div>
            <div class="prop-input-col" style="justify-content: flex-end;">
              <button
                class="sleek-checkbox"
                aria-label="Toggle close on select"
                :class="{ checked: playground.closeOnSelect }"
                @click="playground.closeOnSelect = !playground.closeOnSelect"
                role="checkbox"
                :aria-checked="playground.closeOnSelect"
              >
                <svg v-if="playground.closeOnSelect" viewBox="0 0 24 24" class="check-svg">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- PROP: CLOSEONSCROLL -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">closeOnScroll</span>
              <span class="prop-type-signature">el scroll de la página cierra</span>
            </div>
            <div class="prop-input-col" style="justify-content: flex-end;">
              <button
                class="sleek-checkbox"
                aria-label="Toggle close on scroll"
                :class="{ checked: playground.closeOnScroll }"
                @click="playground.closeOnScroll = !playground.closeOnScroll"
                role="checkbox"
                :aria-checked="playground.closeOnScroll"
              >
                <svg v-if="playground.closeOnScroll" viewBox="0 0 24 24" class="check-svg">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- PROP: DISMISSIBLE -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">dismissible</span>
              <span class="prop-type-signature">clic fuera y Escape cierran</span>
            </div>
            <div class="prop-input-col" style="justify-content: flex-end;">
              <button
                class="sleek-checkbox"
                aria-label="Toggle dismissible"
                :class="{ checked: playground.dismissible }"
                @click="playground.dismissible = !playground.dismissible"
                role="checkbox"
                :aria-checked="playground.dismissible"
              >
                <svg v-if="playground.dismissible" viewBox="0 0 24 24" class="check-svg">
                  <polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <!-- PROP: PLACEHOLDER -->
          <div class="prop-control-row">
            <div class="prop-info-col">
              <span class="prop-name">placeholder</span>
              <span class="prop-type-signature">texto sin valor elegido</span>
            </div>
            <div class="prop-input-col">
              <input
                v-model="playground.placeholder"
                type="text"
                class="pill-input"
                placeholder="Elige una opción"
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
           4. DISEÑO E INGENIERÍA
           ========================================= -->

      <!-- Dónde vive el encabezado -->
      <section class="story-section">
        <h2 class="section-title">El encabezado viaja contigo</h2>
        <p class="section-text">
          El encabezado es el elemento compartido: lo que vuela del trigger a la caja. Las tres
          abren hacia <code>arriba</code>, que es el caso incómodo: <code>top</code> lo empuja al
          extremo contrario y lo hace volar; <code>trigger</code> lo deja pegado al trigger, así
          que lo que se lee abajo es la opción elegida.
        </p>
        <div class="showcase-row title-row">
          <div v-for="(variant, index) in titleVariants" :key="variant" class="title-cell">
            <code class="title-tag">title="{{ variant }}"</code>
            <Select class="trigger-select"
              v-model:open="titleDemos[index].open"
              v-model="titleDemos[index].value"
              :options="allOptions"
              :origin="titleDemos[index].origin"
              :title="variant"
              mode="gsap"
              placement="inplace-b"
            >
            </Select>
          </div>
        </div>
      </section>

      <!-- Modo sticky -->
      <section class="story-section">
        <h2 class="section-title">Modo sticky</h2>
        <p class="section-text">
          Sin encabezado: la fila elegida es el elemento compartido, así que lo que vuela del
          trigger es ella misma y se queda clavada ahí mientras la caja crece alrededor. Pica otra
          fila y la que elijas es la que viaja de vuelta al trigger.
        </p>
        <div class="showcase-row" style="padding: 60px 20px; justify-content: center;">
          <Select class="trigger-select"
            v-model:open="stickyDemo.open"
            v-model="stickyDemo.value"
            :options="baseOptions"
            :origin="stickyDemo.origin"
            mode="gsap"
            placement="sticky"
          >
          </Select>
        </div>
      </section>

      <!-- Modo simple -->
      <section class="story-section">
        <h2 class="section-title">Modo simple</h2>
        <p class="section-text">
          Sin vuelo y sin encabezado: la caja suelta bajo el trigger con la lista limpia, como
          el sticky pero sin clavar filas. El modo solo abre en <code>anchor</code> — este
          ejemplo ni siquiera pasa <code>placement</code> y el motor lo resuelve solo.
        </p>
        <div class="showcase-row" style="padding: 60px 20px; justify-content: center;">
          <Select class="trigger-select"
            v-model:open="simpleDemo.open"
            v-model="simpleDemo.value"
            :options="allOptions"
            :origin="simpleDemo.origin"
            mode="simple"
          >
          </Select>
        </div>
      </section>

      <!-- Listas largas y scroll interno -->
      <section class="story-section">
        <h2 class="section-title">Listas largas y scroll interno</h2>
        <p class="section-text">
          Con más opciones que filas visibles, la lista mide exactamente
          <code>maxVisibleRows</code> filas y el resto vive tras scroll interno. La fila
          deshabilitada se salta con el teclado. Y el scroll de la <em>página</em> cierra la caja:
          es la única salida honesta cuando el trigger se mueve.
        </p>
        <div class="showcase-row two-col-row">
          <div class="two-col-cell">
            <code class="title-tag">30 opciones · 5 visibles</code>
            <Select class="trigger-select"
              v-model:open="longDemo.open"
              v-model="longDemo.value"
              :options="longOptions"
              :origin="longDemo.origin"
              mode="gsap"
              placement="inplace-b"
              :maxVisibleRows="5"
            >
            </Select>
          </div>
          <div class="two-col-cell">
            <code class="title-tag">abre y haz scroll en la página</code>
            <Select class="trigger-select"
              v-model:open="scrollDemo.open"
              v-model="scrollDemo.value"
              :options="allOptions"
              :origin="scrollDemo.origin"
              mode="gsap"
              placement="inplace-b"
            >
            </Select>
          </div>
        </div>
      </section>

      <!-- Slot de opción y trigger por defecto -->
      <section class="story-section">
        <h2 class="section-title">Tuyo por dentro, suyo por fuera</h2>
        <p class="section-text">
          El slot <code>#option</code> dibuja cada fila a tu manera sin apagar el vuelo: el motor
          mide tinta, no cajas. Y si no pasas slot <code>#trigger</code>, el componente dibuja el
          suyo con <code>placeholder</code> incluido.
        </p>
        <div class="showcase-row two-col-row">
          <div class="two-col-cell">
            <code class="title-tag">#option personalizado</code>
            <Select class="trigger-select"
              v-model:open="fancyDemo.open"
              v-model="fancyDemo.value"
              :options="fancyOptions"
              :origin="fancyDemo.origin"
              mode="gsap"
              placement="inplace-b"
            >
              <template #option="{ item, selected }">
                <span class="opt-dot" :class="{ 'is-selected': selected }"></span>
                <span class="opt-text">
                  <span class="opt-label">{{ item.label }}</span>
                  <span class="opt-desc">{{ item.value && (fancyOptions.find(o => o.value === item.value)?.desc ?? '') }}</span>
                </span>
              </template>
            </Select>
          </div>
          <div class="two-col-cell">
            <code class="title-tag">trigger por defecto + vacío</code>
            <div @click.capture="captureDefaultTrigger" style="display: flex; flex-direction: column; gap: 16px; align-items: center;">
              <Select class="trigger-select"
                v-model:open="defaultDemo.open"
                v-model="defaultDemo.value"
                :options="baseOptions.slice(0, 4)"
                :origin="defaultDemo.origin"
                mode="gsap"
                placement="inplace-b"
                placeholder="Elige…"
              />
              <Select class="trigger-select"
                v-model:open="emptyDemo.open"
                v-model="emptyDemo.value"
                :options="[]"
                :origin="emptyDemo.origin"
                mode="gsap"
                placement="inplace-b"
                placeholder="Sin opciones todavía"
                emptyText="No hay nada aquí"
              >
              </Select>
            </div>
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
            El select habla los 10 colores del sistema. La caja hereda el acento sin perder
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
          <template v-for="(c, index) in colorsList" :key="c">
            <div v-if="selectedMatrixColor === 'all' || selectedMatrixColor === c" class="color-system-card">
              <div class="color-card-header" style="margin-bottom: 24px;">
                <span class="color-dot" :style="{ backgroundColor: colorDotMap[c] }"></span>
                <span class="color-title">{{ c.toUpperCase() }}</span>
              </div>
              <div style="width: 100%; display: flex; align-items: center; justify-content: center; padding: 20px 0 32px;">
                <Select class="trigger-select"
                  v-model:open="matrixDemos[index].open"
                  v-model="matrixDemos[index].value"
                  :options="baseOptions.slice(0, 4)"
                  :origin="matrixDemos[index].origin"
                  :color="c"
                  mode="gsap"
                  placement="inplace-b"
                >
                </Select>
              </div>
            </div>
          </template>
        </div>
      </section>

      <!-- Relleno: sin recorrido de scroll no se puede ejercitar el cierre con
           scroll de página de la historia de listas largas. -->
      <div class="demo-filler" aria-hidden="true">
        <div v-for="n in 4" :key="n" class="filler-row">
          <span class="filler-dot"></span>
          <span>Contenido de relleno {{ n }} — sirve para que haya scroll de verdad.</span>
        </div>
      </div>

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

<style>
/* El ancho y el max-width los manda el motor: aquí no se toca ninguno. Lo único
   que se declara es que el diálogo es un marco transparente y que el contenido
   decide su propia forma. */
html body .slt-dialog {
  display: flex;
  flex-direction: column;
  overflow: visible !important;
}

html body .slt-item {
  padding: 0 !important;
}

/* El radio del shell es un token del paquete (32px, el del modal), pero el
   trigger de esta demo es un botón de 12px. Con 32px el desplegable se ve mucho
   más redondo que aquello de lo que sale, y como el shell recorta
   (`overflow: hidden`), la esquina se come la primera y la última fila de la
   lista. Es justo el caso de uso del token: el consumidor lo iguala a su
   trigger. El fondo y la sombra NO se tocan: el shell ya usa `var(--slt-bg)` y
   `var(--slt-shadow)`, y forzarlos rompería el oscuro. */
html body .slt-shell {
  --slt-radius: 12px;
}
</style>

<style scoped>
/* El ancho lo pone el consumidor; la alineación del texto NO: de eso se
   encarga el componente, que le devuelve el `.btn-text` a la izquierda. */
:deep(.trigger-select) {
  width: 250px;
  gap: 8px;
}

:deep(.trigger-select-sm) {
  width: 210px;
}

.trigger-chevron {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
}

/* Tres triggers en fila, con su etiqueta encima. Van centrados y con hueco
   de sobra para que la caja que crece hacia arriba tenga sitio: sin aire arriba
   el motor recorta el alto en vez de voltear, y el caso que se quiere ver no
   llega a darse. */
.title-row {
  gap: 16px;
  align-items: flex-start;
  padding: 60px 20px;
}

.title-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.title-tag {
  font-size: 0.8125rem;
  opacity: 0.55;
}

/* Dos historias lado a lado en la misma fila de showcase. */
.two-col-row {
  gap: 48px;
  align-items: flex-start;
  padding: 60px 20px;
}

.two-col-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: 260px;
}

/* Entrada de texto del inspector (prop placeholder). */
.pill-input {
  appearance: none;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  outline: none;
  width: 220px;
}
.pill-input:focus {
  border-color: var(--blue-solid-base);
}

/* Fila personalizada de la historia del slot #option. */
.opt-dot {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, currentColor 25%, transparent);
}
.opt-dot.is-selected {
  background: currentColor;
}
.opt-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.3;
}
.opt-label {
  font-weight: 600;
}
.opt-desc {
  font-size: 0.75rem;
  opacity: 0.6;
}


</style>

