<script setup lang="ts">
import { ref, computed, inject, onMounted, watch, nextTick } from 'vue';
import type { ComputedRef } from 'vue';
import { play } from 'cuelume';
import { createMotion } from '../../core/motion/engine.js';
import { splitChars } from '../../core/motion/split.js';
import { motionOf } from '../../core/motion/element.js';
import { Easing } from '../../core/motion/easing.js';

defineSlots<{
    default?: (props: Record<string, never>) => any;
    icon?: (props: Record<string, never>) => any;
    trailingIcon?: (props: Record<string, never>) => any;
    [key: string]: ((props: any) => any) | undefined;
}>();

interface ButtonGroupContext {
    variant: ComputedRef<string | undefined>;
    color: ComputedRef<string | undefined>;
    size: ComputedRef<string | undefined>;
    shape: ComputedRef<string | undefined>;
    disabled: ComputedRef<boolean | undefined>;
}

const groupContext = inject<ButtonGroupContext | null>('btnGroupContext', null);

const props = defineProps({
    // Polimorfismo (puede ser un 'button', un 'a', un 'RouterLink', etc.)
    as: {
        type: [String, Object],
        default: 'button'
    },
    // Matriz de API
    variant: {
        type: String,
        default: undefined,
        validator: (v: any) => v === undefined || ['framed', 'solid', 'soft', 'ghost', 'outline'].includes(v)
    },
    size: {
        type: String,
        default: undefined,
        validator: (v: any) => v === undefined || ['micro', 'tiny', 'small', 'medium', 'large'].includes(v)
    },
    color: {
        type: String,
        default: undefined,
        validator: (v: any) => v === undefined || ['black', 'red', 'orange', 'yellow', 'lime', 'green', 'cyan', 'blue', 'violet', 'pink'].includes(v)
    },
    shape: {
        type: String,
        default: undefined,
        validator: (v: any) => v === undefined || ['square', 'round'].includes(v)
    },
    // Estados
    loading: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: undefined
    },

    // Icon-only
    iconOnly: {
        type: Boolean,
        default: false
    },

    // Posición del icono ('start' o 'end')
    iconPosition: {
        type: String as () => 'start' | 'end',
        default: 'start',
        validator: (v: any) => ['start', 'end'].includes(v)
    },

    // Cuelume
    sound: {
        type: Boolean,
        default: true
    },
    
    // Stateful (Animación de texto)
    state: {
        type: String,
        default: undefined
    }
});

// Resolución en cascada inteligente de props (Prop > Contexto > Default)
const resolvedVariant = computed(() => props.variant ?? groupContext?.variant.value ?? 'solid');
const resolvedColor = computed(() => props.color ?? groupContext?.color.value ?? 'black');
const resolvedSize = computed(() => props.size ?? groupContext?.size.value ?? 'medium');
const resolvedShape = computed(() => props.shape ?? groupContext?.shape.value ?? 'square');
const resolvedDisabled = computed(() => props.disabled ?? groupContext?.disabled.value ?? false);

// Soporte robusto de resorte para iOS WebKit en touch
const isTouching = ref(false);

function handleTouchStart() {
    if (!resolvedDisabled.value && !props.loading) {
        isTouching.value = true;
    }
}

function handleTouchEnd() {
    isTouching.value = false;
}

const emit = defineEmits<{
    (e: 'click', event: MouseEvent): void;
}>();

const interactionSound = computed(() => {
    if (!props.sound || resolvedDisabled.value || props.loading) return undefined;

    // Asignamos sonidos del catálogo de Cuelume según el peso de la variante
    switch (resolvedVariant.value) {
        case 'solid':
        case 'framed':
            return 'press';
        case 'soft':
            return 'tick';
        case 'outline':
            return 'release';
        case 'ghost':
            return 'pulse';
        default:
            return 'release';
    }
});

function handleClick(event: MouseEvent) {
    if (resolvedDisabled.value || props.loading) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    // Reproducción acústica directa
    if (interactionSound.value) {
        if (typeof window !== 'undefined') {
            const isTouchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
            if (!isTouchOnly) {
                try {
                    play(interactionSound.value);
                } catch (e) {
                    // Audio context protegido
                }
            }
        }
    }

    emit('click', event);
}

// ---------------------------------------------------------
// LÓGICA DE STATEFUL (Módulo de texto animado de alta fidelidad)
// ---------------------------------------------------------
const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Variables del motor
const measurerRef = ref<HTMLElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);
let widthMotion: any = null;

// Función dedicada para arrancar el motor cuando sea necesario
function initMotionEngine() {
  if (!measurerRef.value || !wrapperRef.value) return;
  
  // Congelamos el ancho base actual
  const initialWidth = measurerRef.value.getBoundingClientRect().width;
  wrapperRef.value.style.width = `${initialWidth}px`;

  // Encendemos el motor de físicas
  widthMotion = createMotion(
    { width: initialWidth },
    {
      onChange: (key: string, value: number) => {
        if (key === 'width' && wrapperRef.value) {
          wrapperRef.value.style.width = `${value}px`;
        }
      },
    }
  );
}

// 1. Arranque en frío (Si el botón nace con estado)
onMounted(() => {
  if (props.state !== undefined) {
    // Si necesitas aplicar splitChars inicial, descomenta la siguiente línea
    // splitChars(measurerRef.value); 
    initMotionEngine();
  }
});

// 2. Reactividad y Morphing
watch(() => props.state, async (newState) => {
  // Caso A: Se desactivó el modo Stateful
  if (newState === undefined) {
    if (wrapperRef.value) wrapperRef.value.style.width = '';
    if (widthMotion) {
      widthMotion.stop();
      widthMotion = null; // Matamos el motor
    }
    return;
  }

  // Caso B: El estado cambió, esperamos al DOM invisible
  await nextTick();

  // Si el botón pasó de Normal a Stateful en este instante (Arranque en caliente)
  if (!widthMotion) {
    initMotionEngine();
    return; // Ya tomó su ancho inicial, la animación ocurrirá en el siguiente cambio
  }

  // Si el motor ya estaba activo, calculamos la física hacia el nuevo ancho
  if (measurerRef.value && widthMotion) {
    splitChars(measurerRef.value);
    const targetWidth = measurerRef.value.getBoundingClientRect().width;
    
    widthMotion.animate(
      { width: targetWidth },
      { width: { type: 'spring', stiffness: 320, damping: 28, mass: 1 } }
    );
  }
});

function onEnter(el: Element, done: () => void) {
  if (prefersReducedMotion()) {
    const motion = motionOf(el);
    motion.set({ opacity: 0 });
    motion.to({ opacity: 1 }, { duration: 0.3, onComplete: done });
    return;
  }

  const split = splitChars(el as HTMLElement);
  let pending = split.chars.length;
  if (pending === 0) {
    done();
    return;
  }

  split.chars.forEach((char, index) => {
    const motion = motionOf(char);
    motion.set({ opacity: 0, yPercent: 40, blur: 4 });
    motion.to(
      { opacity: 1, yPercent: 0, blur: 0 },
      {
        duration: 0.35,
        ease: Easing.easeOutCubic,
        delay: 0.05 + index * 0.015,
        onComplete: () => {
          pending -= 1;
          if (pending <= 0) {
            done();
          }
        }
      }
    );
  });
}

function onLeave(el: Element, done: () => void) {
  if (prefersReducedMotion()) {
    const motion = motionOf(el);
    motion.to({ opacity: 0 }, { duration: 0.2, onComplete: done });
    return;
  }

  const split = splitChars(el as HTMLElement);
  let pending = split.chars.length;
  if (pending === 0) {
    done();
    return;
  }

  const length = split.chars.length;
  split.chars.forEach((char, index) => {
    const motion = motionOf(char);
    motion.to(
      { opacity: 0, yPercent: -100, blur: 4 },
      {
        duration: 0.15,
        ease: Easing.easeInCubic,
        delay: (length - 1 - index) * 0.01,
        onComplete: () => {
          pending -= 1;
          if (pending <= 0) {
            done();
          }
        }
      }
    );
  });
}
</script>

<template>
    <component
        :is="as"
        :class="[
            'btn',
            `btn-variant-${resolvedVariant}`,
            `btn-color-${resolvedColor}`,
            `btn-size-${resolvedSize}`,
            `btn-shape-${resolvedShape}`,
            { 
                'is-loading': loading,
                'btn-icon-only': iconOnly,
                'btn-with-icon': $slots.icon || $slots.trailingIcon,
                'btn-icon-end': iconPosition === 'end' || $slots.trailingIcon,
                'is-touching': isTouching
            }
        ]"
        :disabled="as === 'button' ? resolvedDisabled : undefined"
        @touchstart.passive="handleTouchStart"
        @touchend.passive="handleTouchEnd"
        @touchcancel.passive="handleTouchEnd"
        @click="handleClick"
        :data-cuelume-toggle="interactionSound"
    >
        <!-- CASO 1: ICONO AL INICIO (#icon + iconPosition='start') -->
        <span v-if="$slots.icon && iconPosition === 'start'" class="btn-icon-box">
            <span class="btn-icon-item">
                <slot name="icon"></slot>
            </span>
            <svg 
                class="btn-spinner" 
                viewBox="0 0 50 50" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle cx="25" cy="25" r="20" stroke="currentColor" stroke-width="5" opacity="0.15"></circle>
                <circle 
                    class="spinner-path" 
                    cx="25" 
                    cy="25" 
                    r="20" 
                    stroke="currentColor" 
                    stroke-width="5" 
                    stroke-linecap="round"
                ></circle>
            </svg>
        </span>

        <!-- CASO 2: SPINNER CUANDO NO HAY ICONO AL INICIO -->
        <svg 
            v-else-if="!($slots.trailingIcon || ($slots.icon && iconPosition === 'end'))"
            class="btn-spinner" 
            viewBox="0 0 50 50" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle cx="25" cy="25" r="20" stroke="currentColor" stroke-width="5" opacity="0.15"></circle>
            <circle 
                class="spinner-path" 
                cx="25" 
                cy="25" 
                r="20" 
                stroke="currentColor" 
                stroke-width="5" 
                stroke-linecap="round"
            ></circle>
        </svg>

        <!-- TEXTO -->
        <span v-if="$slots.default || state !== undefined" class="btn-text" :class="{ 'is-stateful': state !== undefined }">
            <template v-if="state !== undefined">
                <span class="stateful-motion-wrapper" ref="wrapperRef">
                    <!-- 1. El Medidor Fantasma (En el flujo normal para establecer altura) -->
                    <span class="stateful-ghost-measurer" aria-hidden="true">
                        <span ref="measurerRef" :key="state" style="display: inline-flex; align-items: center;">
                            <slot :name="String(state)" :state="state">
                                {{ state }}
                            </slot>
                        </span>
                    </span>

                    <!-- 2. El Escenario Visual -->
                    <span class="stateful-visual-stage">
                        <Transition :css="false" @enter="onEnter" @leave="onLeave">
                            <span :key="state" class="stateful-visual-node">
                                <slot :name="String(state)" :state="state">
                                    {{ state }}
                                </slot>
                            </span>
                        </Transition>
                    </span>
                </span>
            </template>
            <template v-else>
                <slot></slot>
            </template>
        </span>

        <!-- CASO 3: ICONO AL FINAL (iconPosition='end' o #trailingIcon) -->
        <span v-if="($slots.icon && iconPosition === 'end') || $slots.trailingIcon" class="btn-icon-box">
            <span class="btn-icon-item">
                <slot v-if="$slots.trailingIcon" name="trailingIcon"></slot>
                <slot v-else name="icon"></slot>
            </span>
            <svg 
                class="btn-spinner" 
                viewBox="0 0 50 50" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle cx="25" cy="25" r="20" stroke="currentColor" stroke-width="5" opacity="0.15"></circle>
                <circle 
                    class="spinner-path" 
                    cx="25" 
                    cy="25" 
                    r="20" 
                    stroke="currentColor" 
                    stroke-width="5" 
                    stroke-linecap="round"
                ></circle>
            </svg>
        </span>
    </component>
</template>

<style src="./button.css"></style>