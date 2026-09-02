<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import type { ComputedRef } from 'vue';
import { play } from 'cuelume';

defineSlots<{
    default?: (props: Record<string, never>) => any;
    icon?: (props: Record<string, never>) => any;
    trailingIcon?: (props: Record<string, never>) => any;
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
            return 'whisper';
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
        <span v-if="$slots.default" class="btn-text">
            <slot></slot>
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