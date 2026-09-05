<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import { createMotion } from '../../core/motion/engine.js';
import { splitChars } from '../../core/motion/split.js';
import { Easing, motionOf } from '../../core/motion/element.js';
import Button from './button.vue';

const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const props = defineProps({
  state: {
    type: String,
    required: true
  },
  variant: {
    type: String,
    default: 'solid'
  },
  size: {
    type: String,
    default: 'medium'
  },
  color: {
    type: String,
    default: 'black'
  },
  shape: {
    type: String,
    default: 'square'
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: undefined
  },
  iconOnly: {
    type: Boolean,
    default: false
  },
  iconPosition: {
    type: String,
    default: 'start'
  }
});

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const measurerRef = ref<HTMLElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);
let widthMotion: any = null;

onMounted(() => {
  if (measurerRef.value && wrapperRef.value) {
    splitChars(measurerRef.value);
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
});

watch(() => props.state, async () => {
  await nextTick();
  if (measurerRef.value && widthMotion) {
    splitChars(measurerRef.value);
    const targetWidth = measurerRef.value.getBoundingClientRect().width;
    widthMotion.animate(
      { width: targetWidth },
      {
        width: { type: 'spring', stiffness: 320, damping: 28, mass: 1 }
      }
    );
  }
});

function onEnter(el: Element, done: () => void) {
  if (prefersReducedMotion()) {
    const motion = motionOf(el);
    motion.set({ opacity: 0 });
    motion.to({ opacity: 1 }, { duration: 0.3, onComplete: done });
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
  if (prefersReducedMotion()) {
    const motion = motionOf(el);
    motion.to({ opacity: 0 }, { duration: 0.2, onComplete: done });
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
  <Button
    :variant="variant"
    :size="size"
    :color="color"
    :shape="shape"
    :loading="loading"
    :disabled="disabled"
    :icon-only="iconOnly"
    :icon-position="iconPosition"
    @click="e => emit('click', e)"
  >
    <template v-if="$slots.icon" #icon>
      <slot name="icon"></slot>
    </template>
    
    <template v-if="$slots.trailingIcon" #trailingIcon>
      <slot name="trailingIcon"></slot>
    </template>

    <span class="stateful-motion-wrapper" ref="wrapperRef">
      <!-- 1. El Medidor Fantasma (En el flujo normal para establecer altura) -->
      <span class="stateful-ghost-measurer" aria-hidden="true">
        <span ref="measurerRef" :key="state" style="display: inline-flex; align-items: center;">
          <slot :name="String(state)" :state="state">
            {{ state }}
          </slot>
        </span>
      </span>

      <!-- 2. El Escenario Visual -->
      <span class="stateful-visual-stage">
        <Transition :css="false" @enter="onEnter" @leave="onLeave">
          <span :key="state" class="stateful-visual-node">
            <slot :name="String(state)" :state="state">
              {{ state }}
            </slot>
          </span>
        </Transition>
      </span>
    </span>
  </Button>
</template>
