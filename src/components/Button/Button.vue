<script setup>

import { computed } from 'vue';
import { play } from 'cuelume';

const props = defineProps({
    // Polimorfismo (puede ser un 'button', un 'a', un 'RouterLink', etc.)
    as: {
        type: [String, Object],
        default: 'button'
    },
    // Matriz de API
    variant: {
        type: String,
        default: 'solid',
        validator: (v) => ['framed', 'solid', 'soft', 'ghost', 'outline'].includes(v)
    },
    size: {
        type: String,
        default: 'medium',
        validator: (v) => ['micro', 'tiny', 'small', 'medium', 'large'].includes(v)
    },
    color: {
        type: String,
        default: 'black',
        validator: (v) => ['black', 'red', 'orange', 'yellow', 'lime', 'green', 'cyan', 'blue', 'violet', 'pink'].includes(v)
    },
    shape: {
        type: String,
        default: 'square',
        validator: (v) => ['square', 'round'].includes(v)
    },
    // Estados
    loading: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: false
    },

    // Icon-only
    iconOnly: {
        type: Boolean,
        default: false
    },

    // Cuelume
    sound: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits(['click'])

const interactionSound = computed(() => {
    if (!props.sound || props.disabled || props.loading) return undefined;

    // Asignamos sonidos del catálogo de Cuelume según el peso de la variante (perfil acústico exacto)
    switch (props.variant) {
        case 'solid':
        case 'framed':
            return 'press';   // "Compact synthetic chirp" - Firme y directo para botones principales
        case 'soft':
            return 'tick';    // "Fast three-step locator" - Tecnológico y secundario
        case 'outline':
            return 'release';  // "Mechanical click-clack" - Físico y nítido para bordes
        case 'ghost':
            return 'whisper'; // "Soft hush with a falling tone" - Sutil, ideal para fondos transparentes
        default:
            return 'release';
    }
})

function handleClick(event) {
    if (props.disabled || props.loading) {
        event.preventDefault()
        event.stopPropagation()
        return
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

    emit('click', event)
}
</script>

<template>
    <component
        :is="as"
        :class="[
            'btn',
            `btn-variant-${variant}`,
            `btn-color-${color}`,
            `btn-size-${size}`,
            `btn-shape-${shape}`,
            { 
                'is-loading': loading,
                'btn-icon-only': iconOnly
            }
        ]"
        :disabled="as === 'button' ? disabled : undefined"
        @click="handleClick"

        :data-cuelume-toggle="interactionSound"
    >
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

        <span class="btn-text">
            <slot></slot>
        </span>
    </component>
</template>

<style src="./button.css"></style>