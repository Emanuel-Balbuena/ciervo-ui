<script setup lang="ts">
import { computed, provide } from 'vue';

defineSlots<{
    default?: (props: Record<string, never>) => any;
}>();

const props = defineProps({
    modelValue: {
        type: [String, Number, Array] as unknown as () => string | number | (string | number)[],
        default: undefined
    },
    type: {
        type: String as () => 'single' | 'multiple',
        default: 'single',
        validator: (v: any) => ['single', 'multiple'].includes(v)
    },
    mandatory: {
        type: Boolean,
        default: false
    },
    orientation: {
        type: String as () => 'horizontal' | 'vertical',
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
    },
    iconFill: {
        type: Boolean,
        default: undefined
    }
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: string | number | (string | number)[] | undefined): void;
    (e: 'change', value: string | number | (string | number)[] | undefined): void;
}>();

// Gestión centralizada de selecciones
function isValueSelected(val: string | number | undefined): boolean {
    if (val === undefined || props.modelValue === undefined) return false;
    if (props.type === 'multiple') {
        return Array.isArray(props.modelValue) && props.modelValue.includes(val);
    }
    return props.modelValue === val;
}

function toggleValue(val: string | number | undefined): void {
    if (val === undefined) return;

    if (props.type === 'multiple') {
        const currentList = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
        const index = currentList.indexOf(val);

        if (index > -1) {
            // Deseleccionar (respetando mandatory si aplica)
            if (props.mandatory && currentList.length <= 1) return;
            currentList.splice(index, 1);
        } else {
            currentList.push(val);
        }

        emit('update:modelValue', currentList);
        emit('change', currentList);
    } else {
        // Modo único
        if (props.modelValue === val) {
            if (!props.mandatory) {
                emit('update:modelValue', undefined);
                emit('change', undefined);
            }
        } else {
            emit('update:modelValue', val);
            emit('change', val);
        }
    }
}

provide('toggleGroupContext', {
    type: computed(() => props.type),
    variant: computed(() => props.variant),
    color: computed(() => props.color),
    size: computed(() => props.size),
    shape: computed(() => props.shape),
    disabled: computed(() => props.disabled),
    iconFill: computed(() => props.iconFill),
    isValueSelected,
    toggleValue
});

// Proveedor de contexto para compatibilidad con ButtonGroup
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
            'toggle-group',
            `btn-group-${orientation}`,
            `toggle-group-${orientation}`,
            {
                'btn-group-attached': attached,
                'toggle-group-attached': attached
            }
        ]"
        :role="type === 'single' && mandatory ? 'radiogroup' : 'group'"
    >
        <slot></slot>
    </div>
</template>

<style src="./toggle-group.css"></style>
