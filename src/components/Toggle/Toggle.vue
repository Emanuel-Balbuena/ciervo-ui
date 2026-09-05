<script setup lang="ts">
import { ref, computed, inject, onMounted, watch, nextTick } from 'vue';
import type { ComputedRef } from 'vue';
import { play } from 'cuelume';
import { createMotion } from '../../core/motion/engine.js';
import { splitChars } from '../../core/motion/split.js';
import { motionOf } from '../../core/motion/element.js';
import { Easing } from '../../core/motion/easing.js';

defineSlots<{
    default?: (props: { pressed: boolean }) => any;
    icon?: (props: { pressed: boolean }) => any;
    trailingIcon?: (props: { pressed: boolean }) => any;
    [key: string]: ((props: { state: string; pressed: boolean }) => any) | undefined;
}>();

interface ToggleGroupContext {
    type: ComputedRef<'single' | 'multiple'>;
    variant: ComputedRef<string | undefined>;
    color: ComputedRef<string | undefined>;
    size: ComputedRef<string | undefined>;
    shape: ComputedRef<string | undefined>;
    disabled: ComputedRef<boolean | undefined>;
    iconFill?: ComputedRef<boolean | undefined>;
    isValueSelected: (val: string | number | undefined) => boolean;
    toggleValue: (val: string | number | undefined) => void;
}

const toggleGroup = inject<ToggleGroupContext | null>('toggleGroupContext', null);

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: undefined
    },
    value: {
        type: [String, Number],
        default: undefined
    },
    as: {
        type: [String, Object],
        default: 'button'
    },
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
    disabled: {
        type: Boolean,
        default: undefined
    },
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
    // Relleno inherente automático de iconos al activarse
    iconFill: {
        type: Boolean,
        default: undefined
    },
    sound: {
        type: Boolean,
        default: true
    },
    // Stateful (Animación de texto)
    state: {
        type: String,
        default: undefined
    },
    // Desactiva la animación de stateful si se desea
    animateText: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'change', value: boolean): void;
    (e: 'click', event: MouseEvent): void;
}>();

// Resolución en cascada de propiedades
const resolvedVariant = computed(() => props.variant ?? toggleGroup?.variant.value ?? 'soft');
const resolvedColor = computed(() => props.color ?? toggleGroup?.color.value ?? 'black');
const resolvedSize = computed(() => props.size ?? toggleGroup?.size.value ?? 'medium');
const resolvedShape = computed(() => props.shape ?? toggleGroup?.shape.value ?? 'square');
const resolvedDisabled = computed(() => props.disabled ?? toggleGroup?.disabled.value ?? false);
const resolvedIconFill = computed(() => props.iconFill ?? toggleGroup?.iconFill?.value ?? true);

// Soporte robusto de resorte para iOS WebKit en touch
const isTouching = ref(false);

function handleTouchStart() {
    if (!resolvedDisabled.value) {
        isTouching.value = true;
    }
}

function handleTouchEnd() {
    isTouching.value = false;
}

// Cálculo del estado presionado (Activo / Inactivo)
const isPressed = computed(() => {
    if (toggleGroup && props.value !== undefined) {
        return toggleGroup.isValueSelected(props.value);
    }
    return Boolean(props.modelValue);
});

function handleClick(event: MouseEvent) {
    if (resolvedDisabled.value) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    const nextState = !isPressed.value;

    // Reproducción acústica Cuelume (Sonido switch mecánico toggle)
    if (props.sound) {
        if (typeof window !== 'undefined') {
            const isTouchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
            if (!isTouchOnly) {
                try {
                    play('toggle');
                } catch (e) {
                    // Audio context protegido
                }
            }
        }
    }

    if (toggleGroup && props.value !== undefined) {
        toggleGroup.toggleValue(props.value);
    } else {
        emit('update:modelValue', nextState);
        emit('change', nextState);
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

const measurerRef = ref<HTMLElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);
let widthMotion: any = null;

function initMotionEngine() {
  if (!measurerRef.value || !wrapperRef.value) return;
  
  const initialWidth = measurerRef.value.getBoundingClientRect().width;
  wrapperRef.value.style.width = `${initialWidth}px`;

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

onMounted(() => {
  if (props.state !== undefined) {
    initMotionEngine();
  }
});

watch(() => props.state, async (newState) => {
  if (newState === undefined) {
    if (wrapperRef.value) wrapperRef.value.style.width = '';
    if (widthMotion) {
      widthMotion.stop();
      widthMotion = null;
    }
    return;
  }

  await nextTick();

  if (!widthMotion) {
    initMotionEngine();
    return;
  }

  if (measurerRef.value && widthMotion) {
    splitChars(measurerRef.value);
    const targetWidth = measurerRef.value.getBoundingClientRect().width;
    
    if (!props.animateText) {
      wrapperRef.value!.style.width = `${targetWidth}px`;
      widthMotion.set({ width: targetWidth });
    } else {
      widthMotion.animate(
        { width: targetWidth },
        { width: { type: 'spring', stiffness: 320, damping: 28, mass: 1 } }
      );
    }
  }
});

function onEnter(el: Element, done: () => void) {
  if (!props.animateText || prefersReducedMotion()) {
    const motion = motionOf(el);
    motion.set({ opacity: 0 });
    motion.to({ opacity: 1 }, { duration: 0.1, onComplete: done });
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
  if (!props.animateText || prefersReducedMotion()) {
    const motion = motionOf(el);
    motion.to({ opacity: 0 }, { duration: 0.1, onComplete: done });
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
            'btn-toggle',
            `btn-variant-${resolvedVariant}`,
            `btn-color-${resolvedColor}`,
            `btn-size-${resolvedSize}`,
            `btn-shape-${resolvedShape}`,
            {
                'is-pressed': isPressed,
                'btn-js-motion': state !== undefined,
                'btn-icon-only': iconOnly,
                'btn-with-icon': $slots.icon || $slots.trailingIcon,
                'btn-icon-end': iconPosition === 'end' || $slots.trailingIcon,
                'btn-icon-autofill': resolvedIconFill,
                'is-touching': isTouching
            }
        ]"
        :aria-pressed="isPressed"
        :disabled="as === 'button' ? resolvedDisabled : undefined"
        @touchstart.passive="handleTouchStart"
        @touchend.passive="handleTouchEnd"
        @touchcancel.passive="handleTouchEnd"
        @click="handleClick"
    >
        <!-- ICONO AL INICIO -->
        <span v-if="$slots.icon && iconPosition === 'start'" class="btn-icon-box">
            <span class="btn-icon-item">
                <slot name="icon" :pressed="isPressed"></slot>
            </span>
        </span>

        <!-- TEXTO -->
        <span v-if="$slots.default || state !== undefined" class="btn-text" :class="{ 'is-stateful': state !== undefined }">
            <template v-if="state !== undefined">
                <span class="stateful-motion-wrapper" ref="wrapperRef">
                    <!-- 1. El Medidor Fantasma -->
                    <span class="stateful-ghost-measurer" aria-hidden="true">
                        <span ref="measurerRef" :key="state" style="display: inline-flex; align-items: center;">
                            <slot :name="String(state)" :state="state" :pressed="isPressed">
                                {{ state }}
                            </slot>
                        </span>
                    </span>

                    <!-- 2. El Escenario Visual -->
                    <span class="stateful-visual-stage">
                        <Transition :css="false" @enter="onEnter" @leave="onLeave">
                            <span :key="state" class="stateful-visual-node">
                                <slot :name="String(state)" :state="state" :pressed="isPressed">
                                    {{ state }}
                                </slot>
                            </span>
                        </Transition>
                    </span>
                </span>
            </template>
            <template v-else>
                <slot :pressed="isPressed"></slot>
            </template>
        </span>

        <!-- ICONO AL FINAL (iconPosition='end' o #trailingIcon) -->
        <span v-if="($slots.icon && iconPosition === 'end') || $slots.trailingIcon" class="btn-icon-box">
            <span class="btn-icon-item">
                <slot v-if="$slots.trailingIcon" name="trailingIcon" :pressed="isPressed"></slot>
                <slot v-else name="icon" :pressed="isPressed"></slot>
            </span>
        </span>
    </component>
</template>

<style src="./toggle.css"></style>
