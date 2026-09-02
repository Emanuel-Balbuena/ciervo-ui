<script setup lang="ts">
import { computed, inject } from 'vue';
import type { ComputedRef } from 'vue';

defineSlots<{
    default?: (props: Record<string, never>) => any;
}>();

interface ButtonGroupContext {
    size: ComputedRef<string | undefined>;
    shape: ComputedRef<string | undefined>;
}

const groupContext = inject<ButtonGroupContext | null>('btnGroupContext', null);

const props = defineProps({
    size: {
        type: String,
        default: undefined,
        validator: (v: any) => v === undefined || ['micro', 'tiny', 'small', 'medium', 'large'].includes(v)
    },
    shape: {
        type: String,
        default: undefined,
        validator: (v: any) => v === undefined || ['square', 'round'].includes(v)
    }
});

const resolvedSize = computed(() => props.size ?? groupContext?.size.value ?? 'medium');
const resolvedShape = computed(() => props.shape ?? groupContext?.shape.value ?? 'square');
</script>

<template>
    <div :class="['btn-group-text', `btn-size-${resolvedSize}`, `btn-shape-${resolvedShape}`]">
        <slot></slot>
    </div>
</template>
