<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useSlots, watch } from 'vue';
import { select } from './index.js';
import Button from '../Button/Button.vue';

defineOptions({ inheritAttrs: false });

/**
 * Un desplegable. La geometria la sigue resolviendo el motor (`./select.js`):
 * aqui solo se decide QUE se dibuja.
 *
 * El truco del elemento compartido necesita el mismo texto en dos sitios -- el
 * trigger de verdad y el encabezado dentro del dialogo -- , asi que el
 * componente escribe los dos. El consumidor escribe el suyo una sola vez (el
 * slot `#trigger`) y el encabezado se lo pone el componente. Antes eso eran dos
 * copias a mano que se desincronizaban: de ahi la etiqueta a la derecha en el
 * trigger y las filas con dos alturas distintas.
 *
 * `data-morph-split="title"` es el contrato REAL del motor
 * (`collectGhostSpecs`), no una invencion de esta capa: es como empareja la
 * tinta que vuela con la que aterriza. Va en la etiqueta del trigger del
 * consumidor y en la del encabezado.
 */

interface SelectOption {
  label: string;
  value: unknown;
  disabled: boolean;
}

const props = defineProps({
  open: { type: Boolean, default: false },
  /** El valor elegido, con v-model. */
  modelValue: { type: null, default: undefined },
  /** `string` o `{ label, value, disabled? }`. */
  options: { type: Array, default: () => [] },
  /** Tope de filas visibles antes de scrollear. */
  maxVisibleRows: { type: Number, default: 8 },
  /** Elegir cierra. */
  closeOnSelect: { type: Boolean, default: true },
  /** Texto del trigger cuando no hay valor. */
  placeholder: { type: String, default: '' },
  emptyText: { type: String, default: 'Sin opciones' },
  /**
   * DONDE VIVE EL ENCABEZADO dentro de la caja: `top` | `bottom` | `trigger`.
   *
   * No lo mueve el motor. El encabezado es un item flex del contenido, y esto
   * solo cambia su `order`. La caja es la misma, el alto es el mismo (el
   * encabezado mide el alto del trigger en los tres casos) y el elemento
   * compartido sigue siendo el mismo nodo, asi que el motor no se entera.
   *
   * - `top`: siempre arriba, que es como estaba.
   * - `bottom`: siempre abajo.
   * - `trigger`: el que toque el trigger. Con la caja creciendo hacia abajo
   *   queda arriba y NO VUELA (el encabezado es lo que esta pegado al trigger);
   *   con la caja creciendo hacia arriba queda al fondo, que tambien esta pegado
   *   al trigger, asi que tampoco vuela -- y lo que se lee abajo es la opcion
   *   elegida. Es la variante que pidio el dueno: que abrir hacia arriba no
   *   obligue al titulo a volar.
   *
   * En `placement="sticky"` no hay encabezado que colocar: el elemento
   * compartido es la FILA elegida. Este prop no hace nada ahi.
   */
  title: { type: String, default: 'top' },

  // --- geometria, igual que antes ---
  physics: { type: String, default: 'none' },
  placement: { type: String, default: 'inplace-t' },
  size: { type: String, default: 'md' },
  color: { type: String, default: 'orange' },
  /**
   * Un desplegable NO se arrastra. El defecto del Modal es `true` y este
   * componente lo heredo, y de ahi salia que se pudiera arrastrar el select. El
   * Modal no se toca: su defecto sigue siendo el suyo.
   */
  gesture: { type: Boolean, default: false },
  dismissible: { type: Boolean, default: true },
  /**
   * El scroll de la PAGINA cierra el desplegable. Es el defecto porque la caja
   * no persigue al trigger: con el scroll abierto la unica salida honesta es
   * cerrar -- y sale bien por construccion, porque el primer frame de scroll
   * mueve la pagina un pixel, asi que el trigger sigue donde estaba cuando el
   * fantasma emprende el vuelo de vuelta.
   *
   * El scroll de la LISTA por dentro no cuenta: doce opciones no caben y ese es
   * el unico scroller legitimo con la caja abierta. La puerta esta para poder
   * apagarlo, pero encendido es lo que el dueno pidio.
   */
  closeOnScroll: { type: Boolean, default: true },
  mode: { type: String, default: 'gsap' },
  origin: { type: null, default: null },
  morph: { type: Object, default: () => ({}) },
  autofocus: { type: String, default: 'dialog' }
});

const emit = defineEmits(['update:open', 'update:modelValue', 'select']);

const slots = useSlots();

const internalOpen = ref(props.open);
const triggerRoot = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const headLabelRef = ref<HTMLElement | null>(null);
const ownLabelRef = ref<HTMLElement | null>(null);

let currentId: string | null = null;


const items = computed<SelectOption[]>(() =>
  (props.options as unknown[]).map((entry) => {
    if (entry !== null && typeof entry === 'object') {
      const record = entry as Record<string, unknown>;
      return {
        label: String(record.label ?? record.value ?? ''),
        // `value` ausente cae en `label`, que es lo que hace util pasar
        // `[{ label: 'España' }]` sin inventarse un valor aparte.
        value: 'value' in record ? record.value : record.label,
        disabled: record.disabled === true
      };
    }

    return { label: String(entry ?? ''), value: entry, disabled: false };
  })
);

const selectedIndex = computed(() =>
  items.value.findIndex((item) => item.value === props.modelValue)
);

const selectedLabel = computed(() =>
  selectedIndex.value >= 0 ? items.value[selectedIndex.value].label : ''
);

/** Lo que dice el trigger. Sin valor elegido, el marcador. */
const displayLabel = computed(() => selectedLabel.value || props.placeholder);

/**
 * El modo sticky: la fila elegida aterriza en el trigger y la caja crece
 * alrededor (el "center inplace dinamico" de Radix).
 *
 * Cambia DOS cosas de esta capa, y las dos son de dibujo: no hay encabezado -- la
 * opcion elegida ya se ve, porque esta justo encima del trigger, y una copia
 * seria leerla dos veces -- y la marca del elemento compartido se muda a la fila
 * elegida. La geometria la sigue resolviendo el motor: `placement.js` coloca la
 * caja para que la tinta de esa fila caiga en la del trigger.
 */
const sticky = computed(() => props.placement === 'sticky');

/**
 * Caja limpia, sin encabezado: el sticky (la fila elegida ya se ve sobre el
 * trigger) y el modo simple (caja suelta sin vuelo, el encabezado duplicaria
 * la opcion elegida).
 */
const clean = computed(() => sticky.value || props.mode === 'simple');

/**
 * La fila que hace de ancla. Sin valor elegido ancla la PRIMERA: un sticky sin
 * fila que clavar no tiene posicion que calcular, y un solo camino de codigo vale
 * mas que dos.
 */
const anchorIndex = computed(() => (selectedIndex.value >= 0 ? selectedIndex.value : 0));


/**
 * El encabezado del dialogo tiene que caer EXACTAMENTE donde el trigger: es el
 * mismo elemento a los ojos del motor, y el fantasma aterriza sobre la etiqueta
 * del trigger. Si el alto o el sangrado no coinciden, el compartido no esta
 * compartido y el aterrizaje se ve desalineado.
 *
 * Se mide el trigger de verdad y se publican los dos numeros como variables, en
 * el contenedor del trigger (que es el ancestro de su etiqueta) y en el
 * contenido, que es lo que se muda al dialogo.
 *
 * El sangrado SOLO se mide cuando el trigger lo pone el consumidor. Al nuestro
 * no: su `padding-left` ya es `head-pad + head-inset`, asi que medirlo daria
 * `borde + pad + inset` y realimentaria la cuenta -- 1px mas en cada apertura.
 */
/**
 * Lo que hay que copiarle al encabezado para que su etiqueta sea la MISMA
 * etiqueta que la del trigger. No es cosmetico: medido, el trigger trae la
 * tipografia del `Button` (16px / 16px de interlinea, caja de 20px) y el
 * encabezado heredaba la del paquete (15px / 21.75px, caja de 21.75px), asi que
 * el texto cambiaba de tamano y de sitio al aterrizar.
 *
 * NO se copia `color`: el color es del tema. El del trigger puede ser blanco en
 * modo oscuro mientras el shell sigue claro, y copiarlo dejaria el encabezado
 * invisible sobre su propio fondo.
 */
const FONT_PROPS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fontStretch',
  'fontVariationSettings',
  'lineHeight',
  'letterSpacing',
  'textTransform'
] as const;

const measureTrigger = () => {
  const root = triggerRoot.value;
  if (!root) return;

  const focus = (props.origin instanceof HTMLElement ? props.origin : root) as HTMLElement;
  const rect = focus.getBoundingClientRect();

  if (rect.height > 0) {
    root.style.setProperty('--slt-head-height', `${Math.round(rect.height)}px`);
    contentRef.value?.style.setProperty('--slt-head-height', `${Math.round(rect.height)}px`);
  }

  const label = focus.querySelector('[data-morph-split="title"]');

  if (label instanceof HTMLElement) {
    const source = getComputedStyle(label);

    for (const target of [headLabelRef.value, ownLabelRef.value]) {
      if (!target) continue;
      for (const property of FONT_PROPS) {
        target.style[property as any] = source[property as any];
      }
    }
  }

  // `head-pad` es el padding del encabezado en el paquete; se lee de la hoja en
  // vez de repetir el numero aqui, que es como se desincronizan.
  const pad = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--slt-head-pad')
  );
  const basePad = Number.isFinite(pad) ? pad : 14;

  // --- El borde derecho -----------------------------------------------------
  //
  // El chevron de un trigger vive al final de su CAJA DE CONTENIDO, que esta
  // metida `borde + padding` hacia dentro; el encabezado no tiene borde, asi que
  // sin este numero su chevron queda justo ese borde por fuera. Medido con el
  // `Button` de la demo: 685.69 abierto contra 684.69 cerrado.
  //
  // Se mide y no se escribe: el consumidor pone su borde y su padding. Si el
  // trigger es el que dibuja el componente, el `focus` es el envoltorio (un
  // `<span>` sin caja propia) y el control de verdad esta dentro.
  const chrome =
    (focus.matches('.slt-trigger') ? focus : focus.querySelector('.slt-trigger')) ?? focus;
  const chromeStyle = getComputedStyle(chrome);
  const outset = Math.round(
    (parseFloat(chromeStyle.borderRightWidth) || 0) + (parseFloat(chromeStyle.paddingRight) || 0)
  );

  if (outset > 0) {
    root.style.setProperty('--slt-head-outset', `${outset}px`);
    contentRef.value?.style.setProperty('--slt-head-outset', `${outset}px`);
  }

  if (!slots.trigger) return;
  if (!(label instanceof HTMLElement)) return;

  const inset = Math.max(0, Math.round(label.getBoundingClientRect().left - rect.left - basePad));

  root.style.setProperty('--slt-head-inset', `${inset}px`);
  contentRef.value?.style.setProperty('--slt-head-inset', `${inset}px`);
};


/**
 * Elegir. El cierre va DESPUES del `nextTick` a proposito: el motor mide la
 * etiqueta del trigger al empezar a cerrar, y con el watcher de `open` en
 * pre-flush esa medida caeria antes de que Vue pintara el valor nuevo -- el
 * shell aterrizaria en la caja vieja. Y el fantasma se construye en ese mismo
 * instante desde la fila elegida, asi que con el tick ya no hay ninguna ventana
 * en la que un texto viejo pueda colarse.
 */
const choose = async (item: SelectOption, event: MouseEvent) => {
  if (item.disabled) return;

  // El elemento REAL que se pico, leido antes de nada. Buscarlo luego por
  // indice seria depender de que el repintado no haya movido nada.
  //
  // El respaldo es la FILA, y hace falta: con el slot `#option` puesto, el
  // consumidor escribe su propio contenido y `.slt-option-label` puede no
  // existir. Y no desalinea: el motor mide TINTA (`measureWords`), no cajas, y
  // el visto bueno es un `<svg>` sin nodos de texto, asi que la tinta de la fila
  // es la de su etiqueta. Sin este respaldo, personalizar una fila apagaria el
  // vuelo de la fila en silencio -- que es justo el tipo de averia que no se ve
  // en una captura.
  const row = (event.currentTarget as HTMLElement | null);
  const exitSource = row?.querySelector('.slt-option-label') ?? row;

  emit('update:modelValue', item.value);
  emit('select', item.value);

  if (!props.closeOnSelect) return;

  await nextTick();

  if (currentId) {
    select.close(currentId, item.value, {
      morph: { exitSource }
    });
  }
};

const toggle = () => {
  const nextOpen = !internalOpen.value;
  internalOpen.value = nextOpen;
  emit('update:open', nextOpen);
  if (nextOpen) openSelect();
  else if (currentId) select.close(currentId, false);
};

/**
 * El origin VISIBLE del morph.
 *
 * El `triggerRoot` es un envoltorio que no pinta nada (sin radio, sin borde,
 * fondo transparente): el que se ve es el control de dentro -- el `Button`
 * por defecto o lo que traiga el slot `#trigger`. Si el morph ancla al
 * envoltorio, el cierre viaja hacia una caja de radio 0 y el shell pierde la
 * forma a medio vuelo (y el `outline` del boton tampoco aparece nunca, porque
 * el shell no tiene borde que animar).
 *
 * El `origin` explicito del consumidor manda siempre; esto solo resuelve el
 * defecto. Es el mismo elemento que la demo ya cazaba a mano en fase de
 * captura (`captureDefaultTrigger` en `SelectView.vue`).
 */
const resolveOrigin = (): HTMLElement | null => {
  if (props.origin instanceof HTMLElement) return props.origin;
  const root = triggerRoot.value;
  if (!(root instanceof HTMLElement)) return null;
  const inner = root.querySelector('.slt-trigger, .btn');
  if (inner instanceof HTMLElement) return inner;
  const first = root.firstElementChild;
  if (first instanceof HTMLElement) return first;
  return root;
};


const openSelect = async () => {
  await nextTick();

  // Un abrir nunca se descarta. Si ya hay un select abierto (o entrando), se
  // cierra con su propia animacion en el fondo y el nuevo entra encima.
  if (currentId) {
    const previous = currentId;
    currentId = null;
    select.close(previous, false);
  }

  measureTrigger();

  // El tope de filas visibles lo decide el componente, no el CSS del
  // consumidor: es la respuesta a que la barra apareciera siempre. Con menos
  // opciones que filas la lista mide lo que mide su contenido, y con mas, mide
  // exactamente `maxVisibleRows` filas.
  const rows = Math.max(1, Math.min(items.value.length || 1, props.maxVisibleRows));
  contentRef.value?.style.setProperty('--slt-rows', String(rows));

  const promise = select.open({
    content: contentRef.value?.children.length ? contentRef.value : null,
    placement: props.placement,
    size: props.size,
    color: props.color,
    gesture: props.gesture,
    dismissible: props.dismissible,
    closeOnScroll: props.closeOnScroll,
    mode: props.mode,
    physics: props.physics,
    autofocus: props.autofocus,
    origin: resolveOrigin(),
    morph: props.morph,
    onClosing: () => {
      if (currentId === (promise as any).id) {
        currentId = null;
        internalOpen.value = false;
        emit('update:open', false);
      }
    }
  });

  currentId = (promise as any).id;

  promise.then(() => {
    if (currentId === (promise as any).id) {
      currentId = null;
      internalOpen.value = false;
      emit('update:open', false);
    }
  });
};

watch(() => props.open, (newVal) => {
  if (internalOpen.value !== newVal) {
    internalOpen.value = newVal;
    if (newVal) openSelect();
    else if (currentId) select.close(currentId, false);
  }
});

watch(() => props.color, (newColor) => {
  if (currentId) {
    select.update(currentId, { color: newColor });
  }
});

onUnmounted(() => {
  if (currentId) select.close(currentId, false);
});
</script>

<template>
  <!--
    El trigger vive donde el consumidor lo puso; el encabezado del dialogo lo
    escribe el componente. El envoltorio existe para poder publicarle al
    trigger las mismas variables que al encabezado, sin tocar el consumidor.
  -->
  <span
    ref="triggerRoot"
    class="slt-trigger-slot"
    :class="{ 'is-open': internalOpen }"
    v-bind="$attrs"
    @click="toggle"
  >
    <slot name="trigger" :label="displayLabel" :open="internalOpen">
      <Button
        variant="outline"
        :color="color"
        style="width: 100%; justify-content: space-between;"
      >
        <span ref="ownLabelRef" class="slt-trigger-label" data-morph-split="title">{{ displayLabel }}</span>
        <svg
          class="slt-chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Button>
    </slot>
  </span>

  <!--
    Dos capas a proposito. El motor se MUDA `contentRef` al dialogo -- no lo
    clona --, asi que el `display: none` va en la capa de fuera: dentro del
    `contentRef` viajaria con el y el desplegable saldria invisible. Y una
    variable puesta en `contentRef` si llega al encabezado, porque la hereda.
  -->
  <div style="display: none;" aria-hidden="true">
    <!--
      El atributo viaja con el nodo cuando el motor lo muda al dialogo, asi que
      la hoja puede colgar de el sin que nadie tenga que escribir nada en el
      dialogo: `.slt-content[data-slt-title="..."] > .slt-head`.
    -->
    <div ref="contentRef" class="slt-content" :data-slt-title="title">
    <div v-if="!clean" class="slt-head" data-slt-shared>
      <span ref="headLabelRef" class="slt-head-label" data-morph-split="title">{{ displayLabel }}</span>
      <svg
        class="slt-chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>

    <div class="slt-list" role="listbox">
      <button
        v-for="(item, index) in items"
        :key="index"
        type="button"
        class="slt-option"
        role="option"
        :class="{ 'is-selected': index === selectedIndex, 'is-disabled': item.disabled }"
        :aria-selected="index === selectedIndex ? 'true' : 'false'"
        :disabled="item.disabled"
        :data-morph-split="sticky && slots.option && index === anchorIndex ? 'title' : null"
        @click="choose(item, $event)"
      >
        <!--
          En sticky la marca del elemento compartido va en la FILA elegida y no en
          un encabezado. En la etiqueta cuando la pone el componente -- es el mismo
          nodo que el cierre mide al picar (`.slt-option-label`) -- y en la fila
          entera cuando el consumidor trae su propio slot `#option`, porque ahi no
          se sabe cual de sus nodos lleva el texto: es el mismo respaldo que usa
          `choose`, y mide lo mismo porque el motor mide TINTA de texto y el visto
          bueno es un `<svg>` sin nodos de texto.
        -->
        <slot
          name="option"
          :item="item"
          :index="index"
          :selected="index === selectedIndex"
          :disabled="item.disabled"
        >
          <span
            class="slt-option-label"
            :data-morph-split="sticky && index === anchorIndex ? 'title' : null"
          >{{ item.label }}</span>
        </slot>
        <svg
          class="slt-option-check"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </button>

      <div v-if="!items.length" class="slt-empty">{{ emptyText }}</div>
    </div>
    </div>
  </div>
</template>
