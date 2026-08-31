<script setup>

import { computed } from 'vue';

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

    // Cuelume
    sound: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits(['click'])

const interactionSound = computed(() => {
    // Si el prop sound es false, retornamos undefined.
    // En Vue, esto hace que el atributo data-* desaparezca por completo del HTML.
    if (!props.sound) return undefined;

    // Asignamos sonidos del catálogo de Cuelume según el peso de la variante
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
    // El cortacircuitos para proteger tu base de datos de clics dobles
    if (props.disabled || props.loading) {
        event.preventDefault()
        event.stopPropagation()
        return
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
            { 'is-loading': loading }
        ]"
        :disabled="as === 'button' ? disabled : undefined"
        @click="handleClick"

        :data-cuelume-toggle="interactionSound"
    >
        <!-- Ícono de Carga (Spinner animado por CSS) -->
        <svg 
            class="btn-spinner" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>

        <!-- El texto de tu botón -->
        <span class="btn-text">
            <slot></slot>
        </span>
    </component>
</template>

<style src="./button.css"></style>