<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, useId } from 'vue';
import { motionOf } from '../../core/motion/element';
import { createMotion, spring, easing } from '../../core/motion/engine';
import { play } from 'cuelume';
import './slider.css';

const props = defineProps({
  modelValue: { type: [Number, Array], default: undefined },
  defaultValue: { type: [Number, Array], default: undefined },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 0 },
  orientation: { type: String, default: 'horizontal' }, // 'horizontal' | 'vertical'
  color: { type: String, default: 'orange' },
  disabled: { type: Boolean, default: false },
  independentThumbs: { type: Boolean, default: false },
  coloredTrack: { type: Boolean, default: false },
  sound: { type: Boolean, default: false },
  // Physics Tuning
  thumbStiffness: { type: Number, default: 400 },
  thumbDamping: { type: Number, default: 18 },
  tailStiffness: { type: Number, default: 200 },
  tailDamping: { type: Number, default: 20 },
  // Shape Tuning
  thumbRadius: { type: Number, default: 8 },
  tailRadii: { type: Array as () => number[], default: () => [6, 5, 4] },
  maxLag: { type: Number, default: 10 },
  // Deformation Tuning
  velocityStretchMax: { type: Number, default: 0.1 },
  velocityStretchFactor: { type: Number, default: 0.0002 },
  crashSquishMax: { type: Number, default: 0.2 },
  crashSquishFactor: { type: Number, default: 0.2 }
});

const emit = defineEmits(['update:modelValue', 'change']);

const trackRef = ref<HTMLElement | null>(null);
const fillRef = ref<HTMLElement | null>(null);
const thumbRefs = ref<SVGCircleElement[]>([]);
const childRefs = ref<SVGCircleElement[][]>([]); 

const filterId = `gooey-filter-${useId()}`;
const isDragging = ref(false);

function getThumbColor(index: number) {
  const shades = ['solid-base', 'border-base', 'solid-hover', 'border-active'];
  const shade = shades[Math.min(index, shades.length - 1)];
  return `var(--${props.color}-${shade})`;
}
const internalValue = ref<number | number[]>(
  (props.modelValue as number | number[] | undefined) ?? 
  (props.defaultValue as number | number[] | undefined) ?? 
  props.min
);

const normalizedValues = computed<number[]>(() => {
  const v = internalValue.value;
  return Array.isArray(v) ? [...(v as number[])] : [v as number];
});

let ro: ResizeObserver;
let trackSize = 0;
let activeThumbIndex = 0;
let dragOffset = 0;

// Central Physics Orchestrator
const physics = createMotion(
  {}, // State is dynamically initialized via setTarget
  { onChange: () => renderVisuals(physics.state) }
) as any;

const componentClass = computed(() => {
  return [
    'ciervo-slider',
    `orientation-${props.orientation}`,
    `color-${props.color}`,
    { 'is-dragging': isDragging.value },
    { 'is-disabled': props.disabled }
  ];
});

onMounted(() => {
  if (trackRef.value) {
    const rect = trackRef.value.getBoundingClientRect();
    trackSize = props.orientation === 'vertical' ? rect.height : rect.width;

    setTarget(internalValue.value, false);

    ro = new ResizeObserver(() => {
      const rect = trackRef.value!.getBoundingClientRect();
      trackSize = props.orientation === 'vertical' ? rect.height : rect.width;
      setTarget(internalValue.value, false); 
    });
    ro.observe(trackRef.value);
  }
});

onBeforeUnmount(() => {
  ro?.disconnect();
});

watch(() => props.modelValue, (val) => {
  if (val !== undefined) {
    internalValue.value = val as number | number[];
    setTarget(val as number | number[], false);
  }
}, { immediate: false, deep: true });

function setTarget(values: number | number[], instant = false) {
  if (!trackSize) return;
  const vals = Array.isArray(values) ? values : [values as number];
  
  const targetState: Record<string, number> = {};
  const isV = props.orientation === 'vertical';

  vals.forEach((value, i) => {
    if (physics.state[`thumb_${i}`] === undefined) {
      physics.register(`thumb_${i}`, 0);
      physics.register(`tail_${i}`, 0);
    }
    
    let percent = (value - props.min) / (props.max - props.min);
    percent = Math.max(0, Math.min(1, percent));
    const pos = percent * trackSize;
    const targetPos = isV ? trackSize - pos : pos;
    targetState[`thumb_${i}`] = targetPos;
    targetState[`tail_${i}`] = targetPos;
  });

  if (instant) {
    physics.animate(targetState, { default: easing({ duration: 0, ease: (t: number) => t }) }); 
  } else {
    const animConfig: Record<string, any> = {};
    vals.forEach((_, i) => {
      animConfig[`thumb_${i}`] = spring({ stiffness: props.thumbStiffness, damping: props.thumbDamping });
      animConfig[`tail_${i}`] = spring({ stiffness: props.tailStiffness, damping: props.tailDamping });
    });
    physics.animate(targetState, animConfig);
  }
}

// --- SOUND PHYSICS ENGINE ---
const isSquished = ref<Record<number, boolean>>({});
let lastSoundTime = 0;
const SOUND_COOLDOWN = 150;

// Visual Orchestrator: Executed every frame by the engine
function renderVisuals(state: Record<string, number>) {
  if (!trackSize) return;
  const isV = props.orientation === 'vertical';
  const N_thumbs = normalizedValues.value.length;
  
  let minThumbPos = trackSize;
  let maxThumbPos = 0;

  for (let i = 0; i < N_thumbs; i++) {
    const thumb = state[`thumb_${i}`] ?? 0;
    const tail = state[`tail_${i}`] ?? 0;

    let clampedThumb = thumb;
    let wallSquish = 0;

    if (thumb < 0) {
      wallSquish = -thumb;
      clampedThumb = 0;
    } else if (thumb > trackSize) {
      wallSquish = thumb - trackSize;
      clampedThumb = trackSize;
    }
    
    // --- KINETIC IMPACT SOUND (Wall Collision) ---
    if (wallSquish > 0) {
      if (!isSquished.value[i]) {
        isSquished.value[i] = true;
        if (props.sound) {
          const speed = Math.abs(physics.getVelocity(`thumb_${i}`) || 0);
          const now = Date.now();
          
          if (now - lastSoundTime > SOUND_COOLDOWN) {
            lastSoundTime = now;
            const minSpeed = 10;
            const maxSpeed = 800;
            const t = Math.min(1, Math.max(0, (speed - minSpeed) / (maxSpeed - minSpeed)));
            // Usamos una curva cúbica (t^3) para que en velocidades bajas/medias el volumen sea minúsculo
            const calculatedVolume = Math.max(0.01, Math.pow(t, 2));   
            try {
              if (typeof window !== 'undefined') {
                play('scan', { volume: calculatedVolume });
              }
            } catch(e) {
              // Protected Audio Context
            }
          }
        }
      }
    } else {
      isSquished.value[i] = false;
    }

    if (clampedThumb < minThumbPos) minThumbPos = clampedThumb;
    if (clampedThumb > maxThumbPos) maxThumbPos = clampedThumb;

    let clampedTailRaw = tail;
    if (clampedTailRaw < 0) clampedTailRaw = 0;
    if (clampedTailRaw > trackSize) clampedTailRaw = trackSize;

    const visualLag = clampedTailRaw - clampedThumb;
    const clampedTail = Math.abs(visualLag) > props.maxLag 
      ? clampedThumb + Math.sign(visualLag) * props.maxLag 
      : clampedTailRaw;

    const actualLag = clampedTail - clampedThumb;
    
    let scaleAlong = 1;
    let scalePerp = 1;
    let shiftAlong = 0;
    
    const thumbEl = thumbRefs.value[i];
    if (thumbEl) {
      const speed = Math.abs(physics.getVelocity(`thumb_${i}`) || 0);
      
      if (speed > 2) {
        const st = Math.min(props.velocityStretchMax, speed * props.velocityStretchFactor);
        scaleAlong += st;
        scalePerp = 1 / (1 + st * 0.65);
      }
      
      if (wallSquish > 0) {
        const sq = Math.min(props.crashSquishMax, wallSquish * props.crashSquishFactor);
        scaleAlong = Math.max(0.2, scaleAlong - sq * 1.5);
        scalePerp = Math.min(2.5, scalePerp + sq);
        const radiusShrink = props.thumbRadius * (1 - scaleAlong);
        if (thumb < 0) shiftAlong = -radiusShrink;
        else if (thumb > trackSize) shiftAlong = radiusShrink;
      }

      const finalThumbPos = clampedThumb + shiftAlong;
      motionOf(thumbEl).set({ 
        x: isV ? 0 : finalThumbPos,
        y: isV ? finalThumbPos : 0,
        scaleX: isV ? scalePerp : scaleAlong,
        scaleY: isV ? scaleAlong : scalePerp
      });
    }

    const N_radii = props.tailRadii.length;
    for (let j = 0; j < N_radii; j++) {
      const el = childRefs.value[i]?.[j];
      if (el) {
        const fraction = (j + 1) / N_radii;
        const pos = clampedThumb + actualLag * fraction;
        motionOf(el).set({
          x: isV ? 0 : pos,
          y: isV ? pos : 0
        });
      }
    }
  }

  // Update fill bar
  if (fillRef.value) {
    let startPx = 0;
    let endPx = 0;
    if (N_thumbs === 1) {
      startPx = isV ? minThumbPos : 0;
      endPx = isV ? trackSize : maxThumbPos;
    } else {
      startPx = minThumbPos;
      endPx = maxThumbPos;
    }
    
    const widthPx = Math.abs(endPx - startPx);
    const scale = trackSize > 0 ? widthPx / trackSize : 0;
    
    if (isV) {
      fillRef.value.style.transformOrigin = 'top';
      motionOf(fillRef.value).set({ yPercent: 0, xPercent: 0, x: 0, scaleX: 1, y: startPx, scaleY: scale });
    } else {
      fillRef.value.style.transformOrigin = 'left';
      motionOf(fillRef.value).set({ yPercent: 0, xPercent: 0, y: 0, scaleY: 1, x: startPx, scaleX: scale });
    }
  }
}

function updateFromEvent(event: PointerEvent) {
  if (!trackRef.value) return;
  const rect = trackRef.value.getBoundingClientRect();
  const isV = props.orientation === 'vertical';
  
  const clientPos = isV ? event.clientY : event.clientX;
  const trackStart = isV ? rect.top : rect.left;
  const trackSizePx = isV ? rect.height : rect.width;
  
  let rawPos = clientPos - trackStart;
  if (isV) rawPos = trackSizePx - rawPos; // Invert for bottom-to-top
  
  rawPos -= dragOffset;
  
  let percent = rawPos / (trackSizePx || 1);
  percent = Math.max(0, Math.min(1, percent));
  
  let newValue = props.min + percent * (props.max - props.min);
  
  if (props.step > 0) {
    newValue = Math.round(newValue / props.step) * props.step;
    newValue = Math.max(props.min, Math.min(props.max, newValue));
  }
  
  const newVals = [...normalizedValues.value];
  const oldVal = newVals[activeThumbIndex];
  newVals[activeThumbIndex] = newValue;
  
  if (!props.independentThumbs) {
    if (newValue > oldVal) {
      // Push right neighbors
      for (let i = activeThumbIndex + 1; i < newVals.length; i++) {
        if (newVals[i] < newValue) newVals[i] = newValue;
      }
    } else if (newValue < oldVal) {
      // Push left neighbors
      for (let i = activeThumbIndex - 1; i >= 0; i--) {
        if (newVals[i] > newValue) newVals[i] = newValue;
      }
    }
  }
  
  const finalEmitValue = Array.isArray(internalValue.value) ? newVals : newVals[0];
  internalValue.value = finalEmitValue;
  setTarget(finalEmitValue, false);
  emit('update:modelValue', finalEmitValue);
}

function onPointerDown(event: PointerEvent) {
  if (props.disabled) return;
  isDragging.value = true;
  trackRef.value?.setPointerCapture(event.pointerId);
  
  if (trackRef.value) {
    const rect = trackRef.value.getBoundingClientRect();
    const isV = props.orientation === 'vertical';
    const trackSizePx = isV ? rect.height : rect.width;
    const trackStart = isV ? rect.top : rect.left;
    const clientPos = isV ? event.clientY : event.clientX;
    
    let rawPos = clientPos - trackStart;
    if (isV) rawPos = trackSizePx - rawPos;
    
    const vals = normalizedValues.value;
    let closestIndex = 0;
    let minDistance = Infinity;
    
    vals.forEach((v, idx) => {
      let percent = (v - props.min) / (props.max - props.min);
      const thumbPos = percent * trackSizePx;
      const dist = Math.abs(rawPos - thumbPos);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      } else if (dist === minDistance) {
        if (rawPos > thumbPos) {
          closestIndex = Math.max(closestIndex, idx);
        } else if (rawPos < thumbPos) {
          closestIndex = Math.min(closestIndex, idx);
        } else {
          closestIndex = thumbPos < trackSizePx / 2 
            ? Math.max(closestIndex, idx) 
            : Math.min(closestIndex, idx);
        }
      }
    });
    
    activeThumbIndex = closestIndex;
    
    let percent = (vals[closestIndex] - props.min) / (props.max - props.min);
    const thumbCenterPos = percent * trackSizePx;
    const dist = Math.abs(rawPos - thumbCenterPos);
    if (dist <= props.thumbRadius * 1.5) {
      dragOffset = rawPos - thumbCenterPos;
    } else {
      dragOffset = 0;
    }
  }

  updateFromEvent(event);
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value || props.disabled) return;
  updateFromEvent(event);
}

function onPointerUp(event: PointerEvent) {
  if (!isDragging.value || props.disabled) return;
  isDragging.value = false;
  trackRef.value?.releasePointerCapture(event.pointerId);
  updateFromEvent(event);
  emit('change', props.modelValue);
}
</script>

<template>
  <div 
    :class="componentClass"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div 
      class="slider-track" 
      ref="trackRef"
    >
      <div 
        class="slider-fill" 
        ref="fillRef"
        :style="{ backgroundColor: coloredTrack ? `var(--${color}-solid-base)` : '' }"
      ></div>
    </div>
    
    <svg class="slider-liquid-svg" aria-hidden="true">
      <defs>
        <filter :id="filterId">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
        </filter>
      </defs>
      
      <g :filter="`url(#${filterId})`" class="liquid-group">
        <template v-for="(_, index) in normalizedValues" :key="'thumb-group-' + index">
          <circle 
            v-for="(r, cIdx) in tailRadii"
            :key="'child-' + index + '-' + cIdx"
            :ref="(el) => { if (el) { if (!childRefs[index]) childRefs[index] = []; childRefs[index][cIdx] = el as SVGCircleElement } }" 
            class="liquid-child" 
            :style="{ fill: getThumbColor(index) }"
            :cx="orientation === 'vertical' ? '50%' : '0'" 
            :cy="orientation === 'vertical' ? '0' : '50%'" 
            :r="r" 
          />
          <circle 
            :ref="(el) => { if (el) thumbRefs[index] = el as SVGCircleElement }" 
            class="liquid-thumb" 
            :style="{ fill: getThumbColor(index) }"
            :cx="orientation === 'vertical' ? '50%' : '0'" 
            :cy="orientation === 'vertical' ? '0' : '50%'" 
            :r="thumbRadius" 
          />
        </template>
      </g>
    </svg>
  </div>
</template>
