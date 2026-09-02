<script setup lang="ts">
import { computed, inject } from 'vue';
import type { ComputedRef } from 'vue';

defineSlots<{
    default?: (props: Record<string, never>) => any;
}>();

interface ButtonGroupContext {
    size: ComputedRef<string | undefined>;
    shape: ComputedRef<string | undefined>;
    disabled: ComputedRef<boolean | undefined>;
}

const groupContext = inject<ButtonGroupContext | null>('btnGroupContext', null);

const props = defineProps({
    modelValue: {
        type: [String, Number],
        default: ''
    },
    placeholder: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        default: 'text'
    },
    size: {
        type: String,
        default: undefined,
        validator: (v: any) => v === undefined || ['micro', 'tiny', 'small', 'medium', 'large'].includes(v)
    },
    shape: {
        type: String,
        default: undefined,
        validator: (v: any) => v === undefined || ['square', 'round'].includes(v)
    },
    disabled: {
        type: Boolean,
        default: undefined
    }
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
    (e: 'focus', event: FocusEvent): void;
    (e: 'blur', event: FocusEvent): void;
}>();

const resolvedSize = computed(() => props.size ?? groupContext?.size.value ?? 'medium');
const resolvedShape = computed(() => props.shape ?? groupContext?.shape.value ?? 'square');
const resolvedDisabled = computed(() => props.disabled ?? groupContext?.disabled.value ?? false);

function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    emit('update:modelValue', target.value);
}
</script>

<template>
    <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="resolvedDisabled"
        :class="['btn-group-input', `btn-size-${resolvedSize}`, `btn-shape-${resolvedShape}`]"
        @input="handleInput"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
    />
</template>
