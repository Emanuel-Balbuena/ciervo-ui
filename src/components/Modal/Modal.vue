<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick, onMounted } from 'vue';
import { modal } from './index.js';


const props = defineProps({
  open: { type: Boolean, default: false },
  physics: { type: String, default: 'none' }, // '2d' | '3d' | 'both' | 'none'
  placement: { type: String, default: 'center' },
  size: { type: String, default: 'md' },
  color: { type: String, default: 'orange' },
  gesture: { type: Boolean, default: true },
  dismissible: { type: Boolean, default: true },
  mode: { type: String, default: 'transform' },
  origin: { type: null, default: null }, // type: null allows any type without strict runtime checks
  morph: { type: Object, default: () => ({}) },
  // 'dialog' (default) | 'first' | 'none' -- where focus goes when the morph settles
  autofocus: { type: String, default: 'dialog' }
});

const emit = defineEmits(['update:open']);
const contentRef = ref<HTMLElement | null>(null);
let currentId: string | null = null;


const openModal = async () => {
  await nextTick();

  // Un abrir nunca se descarta. Si ya hay un modal abierto (o entrando), se
  // cierra con su propia animacion en el fondo y el nuevo entra encima.
  if (currentId) {
    const previous = currentId;
    currentId = null;
    modal.close(previous, false);
  }

  const promise = modal.open({
    content: contentRef.value?.children.length ? contentRef.value : null,
    placement: props.placement,
    color: props.color,
    size: props.size,
    gesture: props.gesture,
    dismissible: props.dismissible,
    mode: props.mode,
    physics: props.physics,
    autofocus: props.autofocus,
    origin: props.origin instanceof HTMLElement ? props.origin : null,
    morph: props.morph,
    onClosing: () => {
      if (currentId === (promise as any).id) {
        currentId = null;
        emit('update:open', false);
      }
    }
  });
  
  currentId = (promise as any).id;
  
  promise.then(() => {
    if (currentId === (promise as any).id) {
      currentId = null;
      emit('update:open', false);
    }
  });
};

watch(() => props.open, (newVal) => {
  if (newVal) openModal();
  else if (currentId) {
    modal.close(currentId, false);
  }
});



watch(() => props.color, (newColor) => {
  if (currentId) modal.update(currentId, { color: newColor });
});

onMounted(() => {
  // Option A: No local observer needed. The engine handles it via ResizeObserver on the body.
});

onUnmounted(() => {
  if (currentId) modal.close(currentId, false);
});
</script>

<template>
  <div style="display: none;" aria-hidden="true">
    <div ref="contentRef">
      <slot></slot>
    </div>
  </div>
</template>
