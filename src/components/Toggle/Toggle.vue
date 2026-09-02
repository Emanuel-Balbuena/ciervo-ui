<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import type { ComputedRef } from 'vue';
import { play } from 'cuelume';

defineSlots<{
    default?: (props: { pressed: boolean }) => any;
    icon?: (props: { pressed: boolean }) => any;
    trailingIcon?: (props: { pressed: boolean }) => any;
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
        <span v-if="$slots.default" class="btn-text">
            <slot :pressed="isPressed"></slot>
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
