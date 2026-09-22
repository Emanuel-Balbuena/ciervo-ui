<script setup lang="ts">
import { ref, shallowRef, computed, onUnmounted, watch, useId } from 'vue';
import Modal from '../Modal/Modal.vue';
import { useTheme } from '../../composables/useTheme';

const { toggleTheme, accent, setAccent, isDark } = useTheme();
const instanceId = useId();

// ---------------------------------
// State & Colors
// ---------------------------------
const props = defineProps({
  open: { type: Boolean, default: false },
  origin: { type: null, default: null },
  title: { type: String, default: 'Tema' },
});
const emit = defineEmits(['update:open']);

const isModalOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v)
});

const presetColors = computed(() => [
  { name: 'black', hex: isDark.value ? '#ffffff' : '#000000' },
  { name: 'pink', hex: '#FF1493' },
  { name: 'violet', hex: '#9333EA' },
  { name: 'blue', hex: '#4259F6' },
  { name: 'cyan', hex: '#06B6D4' },
  { name: 'green', hex: '#22C55E' },
  { name: 'lime', hex: '#A3E635' },
  { name: 'yellow', hex: '#FFB830' },
  { name: 'orange', hex: '#FF4D00' },
  { name: 'red', hex: '#FF0B0A' },
]);


const physicsCanvas = ref<HTMLElement | null>(null);
const modalWrapper = ref<HTMLElement | null>(null);
const socketEl = ref<HTMLElement | null>(null);

let animationFrameId: number;
let isClosing = false;

const scaleFactor = 3;
const thumbRadius = 8 * scaleFactor;
const blurStdDev = 2.0 * scaleFactor; // Reduced for less aggressive gooey

interface Drop {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  name: string;
  isDragging: boolean;
  isSlotted: boolean;
  scale: number;
}

const drops = shallowRef<Drop[]>([]);
const dropOpacityGroups = ref<SVGGElement[]>([]);
const dropTransformGroups = ref<SVGGElement[]>([]);
const hitboxEls = ref<HTMLElement[]>([]);

const overlayStyles = ref({ top: 0, left: 0, width: 0, height: 0 });


const layout = ref({
  canvasLeft: 0, canvasTop: 0, canvasRight: 0, canvasBottom: 0,
  canvasWidth: 0, canvasHeight: 0,
  socketX: 0, socketY: 0,
  modalWidth: 0, modalHeight: 0
});

// Edge fade lives ONLY on the modal walls, never inside the jar: balls in
// the canvas are always fully visible so they bounce cleanly on its walls.
const FADE_FULL = 30; // px from the modal edge: fully visible beyond this
const FADE_ZERO = 6;  // px from the modal edge: fully melted here

const getDropOpacity = (d: Drop) => {
  const L = layout.value;
  if (!L.modalWidth || !L.modalHeight) return 1;
  const inCanvas = d.x > L.canvasLeft && d.x < L.canvasRight
    && d.y > L.canvasTop && d.y < L.canvasBottom;
  if (inCanvas) return 1;
  const edgeDist = Math.min(d.x, L.modalWidth - d.x, d.y, L.modalHeight - d.y);
  const t = Math.max(0, Math.min(1, (edgeDist - FADE_ZERO) / (FADE_FULL - FADE_ZERO)));
  const s = t * t * (3 - 2 * t);
  return s < 0.01 ? 0 : s;
};

const updateLayout = () => {
  if (!modalWrapper.value || !physicsCanvas.value || !socketEl.value) return;
  
  // Extraemos las coordenadas globales de pantalla exactas (flotantes)
  const wRect = modalWrapper.value.getBoundingClientRect();
  const cRect = physicsCanvas.value.getBoundingClientRect();
  const sRect = socketEl.value.getBoundingClientRect();
  
  // El modal se anima usando CSS transform: scale(). 
  // Para obtener coordenadas locales (CSS) inmutables que no sufran de offsetLeft rounding,
  // revertimos la escala matemáticamente:
  const scale = wRect.width / modalWrapper.value.offsetWidth;
  
  const cLeft = (cRect.left - wRect.left) / scale;
  const cTop = (cRect.top - wRect.top) / scale;
  const cWidth = physicsCanvas.value.offsetWidth;
  const cHeight = physicsCanvas.value.offsetHeight;
  
  layout.value = {
    canvasLeft: cLeft,
    canvasTop: cTop,
    canvasRight: cLeft + cWidth,
    canvasBottom: cTop + cHeight,
    canvasWidth: cWidth,
    canvasHeight: cHeight,
    // Alineación central exacta con precisión de subpíxel.
    socketX: (sRect.left - wRect.left + sRect.width / 2) / scale,
    socketY: (sRect.top - wRect.top + sRect.height / 2) / scale,
    modalWidth: modalWrapper.value.offsetWidth,
    modalHeight: modalWrapper.value.offsetHeight
  };

  overlayStyles.value = {
    top: cTop,
    left: cLeft,
    width: cWidth,
    height: cHeight
  };
};

// ---------------------------------
// Physics Engine
// ---------------------------------
const initPhysics = () => {
  if (!modalWrapper.value || !physicsCanvas.value || !socketEl.value) return;

  updateLayout();
  const { canvasLeft, canvasTop, canvasWidth, canvasHeight, socketX, socketY } = layout.value;

  drops.value = presetColors.value.map((c, i) => {
    const isCurrent = c.hex.toLowerCase() === accent.value.hex.toLowerCase();
    let x, y;
    
    if (isCurrent) {
      x = socketX;
      y = socketY;
    } else {
      x = canvasLeft + thumbRadius * 2 + Math.random() * (canvasWidth - thumbRadius * 4);
      y = canvasTop + thumbRadius * 2 + Math.random() * (canvasHeight - thumbRadius * 4);
    }
    
    return {
      id: i,
      x, y,
      vx: isCurrent ? 0 : (Math.random() - 0.5) * 2,
      vy: isCurrent ? 0 : (Math.random() - 0.5) * 2,
      color: c.hex,
      name: c.name,
      isDragging: false,
      isSlotted: isCurrent,
      scale: 0 // Start hidden at 0!
    };
  });
  
  lastTime = performance.now();
  const wrapperRect = modalWrapper.value.getBoundingClientRect();
  lastRectX = wrapperRect.left;
  lastRectY = wrapperRect.top;
  prevSocketX = layout.value.socketX;
  prevSocketY = layout.value.socketY;
  
  loop(lastTime);
};

let lastTime = 0;
let lastRectX = 0;
let lastRectY = 0;
let prevSocketX = 0;
let prevSocketY = 0;

const loop = (time: number) => {
  if (!modalWrapper.value || !physicsCanvas.value || !socketEl.value) return;
  const dt = Math.min((time - lastTime) / 16.66, 3);
  lastTime = time;

  // We only use getBoundingClientRect to detect modal dragging (inertia), not for bounds!
  const wrapperRect = modalWrapper.value.getBoundingClientRect();
  
  // Inertia from entire modal movement (clamped to prevent explosions)
  let deltaX = lastRectX !== 0 ? wrapperRect.left - lastRectX : 0;
  let deltaY = lastRectY !== 0 ? wrapperRect.top - lastRectY : 0;
  deltaX = Math.max(-20, Math.min(20, deltaX));
  deltaY = Math.max(-20, Math.min(20, deltaY));
  
  lastRectX = wrapperRect.left;
  lastRectY = wrapperRect.top;

  // While the modal moves it also tilts: rotated rects would fake the jar and
  // the socket a few px off (balls escape, the slotted ball floats). Local
  // coords are translation-invariant, so while it moves we freeze the layout
  // and everything stays mutually exact; we re-measure once it settles.
  const modalMoving = Math.abs(deltaX) + Math.abs(deltaY) > 0.25;
  if (!modalMoving) updateLayout();
  const { canvasLeft, canvasTop, canvasRight, canvasBottom, socketX, socketY } = layout.value;

  // How much the hole itself moved in local coords (modal drag/tilt).
  // Slotted drops ride it 1:1 so the ball never floats out of the hole.
  const socketDX = socketX - prevSocketX;
  const socketDY = socketY - prevSocketY;
  prevSocketX = socketX;
  prevSocketY = socketY;
  
  const friction = 0.999; 
  const restitution = 0.95; 
  
  const ds = drops.value;
  
  // 1. Update Positions & Collisions
  let activeCount = 0;
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    
    // Smooth scaling (grow on spawn, shrink on close)
    const targetScale = isClosing ? 0 : (d.isSlotted ? 0.88 : 1);
    const scaleSpeed = isClosing ? 0.25 : 0.08; 
    d.scale += (targetScale - d.scale) * scaleSpeed * dt;
    
    if (d.scale > 0.01) activeCount++;

    if (d.isDragging) continue;
    
    // ONLY apply inertia to free drops! Lessen inertia if closing to avoid erratic jumps.
    const inertiaMult = isClosing ? 0.1 : 0.8;
    if (!d.isSlotted) {
      d.x -= deltaX * inertiaMult; 
      d.y -= deltaY * inertiaMult;
    }

    if (d.isSlotted) {
      // Glued inside the hole: ride the socket's own motion 1:1, then close
      // any remaining gap with a stiff spring. Snaps when settled so the ball
      // rests exactly in the hole with zero relative motion on modal drags.
      d.x += socketDX;
      d.y += socketDY;

      const dx = socketX - d.x;
      const dy = socketY - d.y;
      if (Math.hypot(dx, dy) < 0.6 && Math.hypot(d.vx, d.vy) < 0.8) {
        d.x = socketX;
        d.y = socketY;
        d.vx = 0;
        d.vy = 0;
      } else {
        const springK = 0.35;
        const damp = 0.35;
        d.vx += dx * springK * dt;
        d.vy += dy * springK * dt;
        d.vx *= Math.pow(damp, dt);
        d.vy *= Math.pow(damp, dt);
        d.x += d.vx * dt;
        d.y += d.vy * dt;
      }
    } else {
      // Free floating physics
      const speed = Math.hypot(d.vx, d.vy);
      if (speed < 0.5 && speed > 0.01) {
        d.vx *= 1.05;
        d.vy *= 1.05;
      }
      
      const prevX = d.x;
      const prevY = d.y;
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      d.vx *= Math.pow(friction, dt);
      d.vy *= Math.pow(friction, dt);

      let hitWall = false;
      let hitFloor = false;
      let impactVelocity = 0;

      // Jar walls: clean bounce with crash squish (Slider family).
      // A ball released far outside the jar is NOT snapped back: it glides
      // home organically on a soft pull and only bounces within snap range.
      const OUTSIDE_PULL = 0.02;
      const OUTSIDE_MAX_SPEED = 5;
      const SNAP_RANGE = 46;

      // --- Y axis ---
      if (d.y - thumbRadius < canvasTop) {
        const pen = canvasTop - (d.y - thumbRadius);
        const wasInside = prevY - thumbRadius >= canvasTop - 1;
        if (!wasInside && pen > SNAP_RANGE) {
          d.vy += ((canvasTop + thumbRadius) - d.y) * OUTSIDE_PULL * dt;
        } else if (d.vy < 0) {
          impactVelocity = Math.abs(d.vy);
          d.y = canvasTop + thumbRadius;
          d.vy *= -restitution;
          hitFloor = true;
        } else {
          d.y = canvasTop + thumbRadius;
        }
      } else if (d.y + thumbRadius > canvasBottom) {
        const pen = (d.y + thumbRadius) - canvasBottom;
        const wasInside = prevY + thumbRadius <= canvasBottom + 1;
        if (!wasInside && pen > SNAP_RANGE) {
          d.vy += ((canvasBottom - thumbRadius) - d.y) * OUTSIDE_PULL * dt;
        } else if (d.vy > 0) {
          impactVelocity = Math.abs(d.vy);
          d.y = canvasBottom - thumbRadius;
          d.vy *= -restitution;
          hitFloor = true;
        } else {
          d.y = canvasBottom - thumbRadius;
        }
      }

      // --- X axis ---
      if (d.x - thumbRadius < canvasLeft) {
        const pen = canvasLeft - (d.x - thumbRadius);
        const wasInside = prevX - thumbRadius >= canvasLeft - 1;
        if (!wasInside && pen > SNAP_RANGE) {
          d.vx += ((canvasLeft + thumbRadius) - d.x) * OUTSIDE_PULL * dt;
        } else if (d.vx < 0) {
          impactVelocity = Math.max(impactVelocity, Math.abs(d.vx));
          d.x = canvasLeft + thumbRadius;
          d.vx *= -restitution;
          hitWall = true;
        } else {
          d.x = canvasLeft + thumbRadius;
        }
      } else if (d.x + thumbRadius > canvasRight) {
        const pen = (d.x + thumbRadius) - canvasRight;
        const wasInside = prevX + thumbRadius <= canvasRight + 1;
        if (!wasInside && pen > SNAP_RANGE) {
          d.vx += ((canvasRight - thumbRadius) - d.x) * OUTSIDE_PULL * dt;
        } else if (d.vx > 0) {
          impactVelocity = Math.max(impactVelocity, Math.abs(d.vx));
          d.x = canvasRight - thumbRadius;
          d.vx *= -restitution;
          hitWall = true;
        } else {
          d.x = canvasRight - thumbRadius;
        }
      }

      // Outside the jar the ball travels slow and damped: no flings, no snap.
      const isOutside = d.x - thumbRadius < canvasLeft || d.x + thumbRadius > canvasRight
        || d.y - thumbRadius < canvasTop || d.y + thumbRadius > canvasBottom;
      if (isOutside) {
        d.vx *= Math.pow(0.98, dt);
        d.vy *= Math.pow(0.98, dt);
        const s = Math.hypot(d.vx, d.vy);
        if (s > OUTSIDE_MAX_SPEED) {
          d.vx *= OUTSIDE_MAX_SPEED / s;
          d.vy *= OUTSIDE_MAX_SPEED / s;
        }
      }
    }
  }
  
  // 2. Circle-Circle Collisions (Elastic)
  for (let i = 0; i < ds.length; i++) {
    for (let j = i + 1; j < ds.length; j++) {
      const d1 = ds[i];
      const d2 = ds[j];
      
      if (d1.isSlotted && d2.isSlotted) continue;
      const isD1Fixed = d1.isSlotted || d1.isDragging;
      const isD2Fixed = d2.isSlotted || d2.isDragging;
      
      const dx = d2.x - d1.x;
      const dy = d2.y - d1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // Adjust minDistance dynamically based on scale
      const avgScale = (d1.scale + d2.scale) / 2;
      const minDistance = (thumbRadius * 2) * avgScale + 1; 
      
      if (distance < minDistance && distance > 0) {
        const angle = Math.atan2(dy, dx);
        const targetX = d1.x + Math.cos(angle) * minDistance;
        const targetY = d1.y + Math.sin(angle) * minDistance;
        
        const force = 0.2;
        const ax = (targetX - d2.x) * force; 
        const ay = (targetY - d2.y) * force;
        
        if (!isD1Fixed && !isD2Fixed) {
          d1.vx -= ax; d1.vy -= ay; d1.x -= ax; d1.y -= ay;
          d2.vx += ax; d2.vy += ay; d2.x += ax; d2.y += ay;
        } else if (!isD1Fixed && isD2Fixed) {
          d1.vx -= ax * 2; d1.vy -= ay * 2; d1.x -= ax * 2; d1.y -= ay * 2;
        } else if (isD1Fixed && !isD2Fixed) {
          d2.vx += ax * 2; d2.vy += ay * 2; d2.x += ax * 2; d2.y += ay * 2;
        }
      }
    }
  }

  // 4. Write to DOM (Direct Mutation to bypass Vue Reactivity overhead)
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    if (dropOpacityGroups.value[i]) {
      dropOpacityGroups.value[i].setAttribute('opacity', getDropOpacity(d).toString());
    }
    if (dropTransformGroups.value[i]) {
      dropTransformGroups.value[i].setAttribute('transform', getDropTransform(d));
    }
    if (hitboxEls.value[i]) {
      hitboxEls.value[i].style.transform = `translate3d(${d.x}px, ${d.y}px, 0) translate(-50%, -50%)`;
      if (d.isDragging) hitboxEls.value[i].classList.add('is-dragging');
      else hitboxEls.value[i].classList.remove('is-dragging');
    }
  }
  
  if (isClosing && activeCount === 0) {
    drops.value = [];
    return; // Gracefully end loop
  }
  
  animationFrameId = requestAnimationFrame(loop);
};

// ---------------------------------
// Pointer Events for Dragging & Selection
// ---------------------------------
let activeDragId: number | null = null;
let clickDistance = 0;

const onPointerDown = (e: PointerEvent, id: number) => {
  (e.target as Element)?.setPointerCapture(e.pointerId);
  activeDragId = id;
  const d = drops.value.find(drop => drop.id === id);
  if (d) {
    d.isDragging = true;
    d.vx = 0;
    d.vy = 0;
  }
  clickDistance = 0;
};

const onPointerMove = (e: PointerEvent) => {
  if (activeDragId === null) return;
  const d = drops.value.find(drop => drop.id === activeDragId);
  if (!d || !modalWrapper.value) return;
  
  const rect = modalWrapper.value.getBoundingClientRect();
  const scale = rect.width / modalWrapper.value.offsetWidth;
  
  let mouseX = (e.clientX - rect.left) / scale;
  let mouseY = (e.clientY - rect.top) / scale;
  
  // Free roam: the edge fade melts the ball near the limits, so the drag
  // is only clamped to the wrapper itself.
  const margin = 4;
  mouseX = Math.max(margin, Math.min(modalWrapper.value.offsetWidth - margin, mouseX));
  mouseY = Math.max(margin, Math.min(modalWrapper.value.offsetHeight - margin, mouseY));
  
  d.vx = (mouseX - d.x) * 0.6;
  d.vy = (mouseY - d.y) * 0.6;
  
  d.x = mouseX;
  d.y = mouseY;
  
  clickDistance += Math.abs(e.movementX) + Math.abs(e.movementY);
};

const slotDrop = (d: Drop) => {
  drops.value.forEach(other => {
    if (other.id !== d.id && other.isSlotted) {
      other.isSlotted = false;
      other.vy = 15; // Gentile push down
      other.vx = (Math.random() - 0.5) * 5;
    }
  });
  d.isSlotted = true;
  applyThemeColor(d.name, d.color);
};

const unslotDrop = (d: Drop) => {
  d.isSlotted = false;
  d.vy = 15;
};

const onPointerUp = () => {
  if (activeDragId !== null) {
    const d = drops.value.find(drop => drop.id === activeDragId);
    if (d && modalWrapper.value && socketEl.value) {
      d.isDragging = false;
      d.vx = Math.max(-40, Math.min(40, d.vx));
      d.vy = Math.max(-40, Math.min(40, d.vy));

      // Released outside the jar: kill the fling so the glide home starts
      // slow and organic instead of warping back in one frame.
      const L = layout.value;
      const releasedOutside = d.x - thumbRadius < L.canvasLeft || d.x + thumbRadius > L.canvasRight
        || d.y - thumbRadius < L.canvasTop || d.y + thumbRadius > L.canvasBottom;
      if (releasedOutside) {
        const s = Math.hypot(d.vx, d.vy);
        const maxRelease = 6;
        if (s > maxRelease) {
          d.vx *= maxRelease / s;
          d.vy *= maxRelease / s;
        }
      }

      const isClick = clickDistance < 10;
      
      const wrapperRect = modalWrapper.value.getBoundingClientRect();
      const socketRect = socketEl.value.getBoundingClientRect();
      const socketX = socketRect.left + socketRect.width / 2 - wrapperRect.left;
      const socketY = socketRect.top + socketRect.height / 2 - wrapperRect.top;
      
      const distToSocket = Math.hypot(d.x - socketX, d.y - socketY);

      if (isClick) {
        if (d.isSlotted) {
          unslotDrop(d); 
        } else {
          slotDrop(d); 
        }
      } else {
        if (distToSocket < thumbRadius * 3) { 
          slotDrop(d);
        } else {
          d.isSlotted = false;
        }
      }
    }
    activeDragId = null;
  }
};

const applyThemeColor = (name: string, hex: string) => {
  // Tiñe el PullCord de App.vue y el trigger del selector.
  setAccent(name, hex);
};

// ---------------------------------
// Compute SVG Transform for each drop
// ---------------------------------
const getDropTransform = (d: Drop) => {
  return `translate(${d.x}, ${d.y}) scale(${d.scale})`;
};

// ---------------------------------
// Lifecycle
// ---------------------------------
watch(isModalOpen, (isOpen) => {
  if (isOpen) {
    isClosing = false;
    setTimeout(() => {
      initPhysics();
    }, 50);
  } else {
    isClosing = true;
    // the physics loop will naturally shrink the drops and kill itself
  }
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
});


</script>

<template>
    <!-- Modal Transform -->
    <Modal
      v-model:open="isModalOpen"
      :origin="origin"
      placement="center"
      size="md"
      mode="gsap"
      physics="both"
    >
      <div class="modal-content-wrapper" ref="modalWrapper">
        <div class="modal-header" style="margin-bottom: 1.5rem; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span data-morph-icon="theme-icon" style="display: inline-flex; align-items: center; justify-content: center; line-height: 1;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.68-.43-1.12A1.68 1.68 0 0 1 14.46 16h2.08A2.46 2.46 0 0 0 19 13.54V12C19 6.5 16.5 2 12 2z"/></svg>
            </span>
            <h2 data-morph-split="theme-text" class="theme-title" style="margin: 0;">{{ title }}</h2>
          </div>
          
          <div class="socket-outer" ref="socketEl" aria-label="Color seleccionado" style="margin: 0;"></div>
        </div>

        <!-- Zona de Físicas Visuales (El Frasco) -->
        <div class="physics-canvas" ref="physicsCanvas" @pointerdown.stop>
          <!-- Glass effect layer -->
        </div>

        <!-- 
          SVG Gooey and Hitboxes now span the entire modal wrapper, 
          allowing drops to fly out of the canvas and into the socket.
        -->
        <svg class="physics-svg" aria-hidden="true" width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
          <defs>
            <filter :id="`gooey-${instanceId}`">
              <feGaussianBlur in="SourceGraphic" :stdDeviation="blurStdDev" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            </filter>
          </defs>

          <!-- Filtro Gooey global. Cada bola lleva su propio fundido de borde:
               al acercarse a los limites del modal su alfa baja y el gooey
               la disuelve con blur en vez de recortarla en seco. -->
          <g :filter="`url(#gooey-${instanceId})`">
            <g v-for="d in drops" :key="'drop-'+d.id" ref="dropOpacityGroups">

              <!-- Main Drop -->
              <g ref="dropTransformGroups">
                <circle cx="0" cy="0" :r="thumbRadius" :fill="d.color" />
              </g>

            </g>
          </g>
        </svg>

        <!-- Hitboxes -->
        <div 
          v-for="d in drops" 
          :key="'hitbox-'+d.id"
          class="drop-hitbox"
          ref="hitboxEls"
          :style="{ 
            width: `${thumbRadius * 3}px`,
            height: `${thumbRadius * 3}px`
          }"
          @pointerdown.stop="onPointerDown($event, d.id)"
          @pointermove.stop="onPointerMove"
          @pointerup.stop="onPointerUp"
          @pointercancel.stop="onPointerUp"
        ></div>

      </div>
    </Modal>
</template>

<style scoped>

.modal-content-wrapper {
  padding-top: 0.5rem;
  display: flex;
  flex-direction: column;
  position: relative; /* CRITICAL: Establishes coordinates for drops */
  width: 100%;
  min-width: 280px;
  max-width: 380px;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  z-index: 10;
}
.theme-description {
  position: relative;
  z-index: 10;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 10;
}

/* -------------------------------------
   SOCKET 
-------------------------------------- */
.socket-outer {
  /* Visual radius for thumb is 24px (48 diameter). 
     Making socket slightly smaller to look like it fits tightly */
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.1);
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.15);
  margin-right: 0.5rem;
  /* El drop se renderizará encima del socket via position absolute en el wrapper */
}
:root.dark .socket-outer {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);
}

/* -------------------------------------
   PHYSICS CANVAS
-------------------------------------- */
.physics-canvas {
  position: relative;
  width: 100%;
  height: 370px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 20px;
  border: 1px solid var(--border);
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.05);
  touch-action: none;
  /* Not overflow hidden anymore because drops need to escape to the socket! */
}
:root.dark .physics-canvas {
  background: rgba(255, 255, 255, 0.03);
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
}

[data-morph-icon],
[data-morph-split] {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.drop-hitbox {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  cursor: grab;
  will-change: transform;
  z-index: 20; /* Above everything so they are clickable */
  touch-action: none; /* Previene que el navegador cancele el arrastre pensando que es scroll */
}

.drop-hitbox.is-dragging {
  cursor: grabbing;
}
</style>
