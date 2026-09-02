<script setup lang="ts">
import { computed, provide } from 'vue';

defineSlots<{
    default?: (props: Record<string, never>) => any;
}>();

const props = defineProps({
    orientation: {
        type: String,
        default: 'horizontal',
        validator: (v: any) => ['horizontal', 'vertical'].includes(v)
    },
    attached: {
        type: Boolean,
        default: true
    },
    variant: {
        type: String,
        default: undefined,
        validator: (v: any) => v === undefined || ['framed', 'solid', 'soft', 'ghost', 'outline'].includes(v)
    },
    color: {
        type: String,
        default: undefined,
        validator: (v: any) => v === undefined || ['black', 'red', 'orange', 'yellow', 'lime', 'green', 'cyan', 'blue', 'violet', 'pink'].includes(v)
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

provide('btnGroupContext', {
    variant: computed(() => props.variant),
    color: computed(() => props.color),
    size: computed(() => props.size),
    shape: computed(() => props.shape),
    disabled: computed(() => props.disabled)
});
</script>

<template>
    <div
        :class="[
            'btn-group',
            `btn-group-${orientation}`,
            { 'btn-group-attached': attached }
        ]"
        role="group"
    >
        <slot></slot>
    </div>
</template>

<style src="./button-group.css"></style>
