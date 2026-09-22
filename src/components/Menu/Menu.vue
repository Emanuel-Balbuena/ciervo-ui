<script setup lang="ts">
import { ref, computed, watch, onUnmounted, useId } from 'vue';
import Modal from '../Modal/Modal.vue';
import Button from '../Button/Button.vue';
import ThemeSelectModal from '../ThemeSelect/ThemeSelectModal.vue';
import { useTheme } from '../../composables/useTheme';

const props = defineProps({
  open: { type: Boolean, default: false },
  origin: { type: null, default: null },
  blur: { type: Number, default: 50 },
  noiseOpacity: { type: Number, default: 0.25 },
  noiseFrequency: { type: Number, default: 0.7 },
  blobCount: { type: Number, default: 6 },
  blobMinSize: { type: Number, default: 40 },
  blobMaxSize: { type: Number, default: 100 },
  blobSpeed: { type: Number, default: 0.15 },
});
const emit = defineEmits(['update:open']);

const { accent } = useTheme();
const instanceId = useId();

const isThemeSelectOpen = ref(false);
const themeSelectOrigin = ref<HTMLElement | null>(null);

const openThemeSelect = (e: Event) => {
  themeSelectOrigin.value = e.currentTarget as HTMLElement;
  isThemeSelectOpen.value = true;
};

const isModalOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v)
});

// Animation logic
const drops = ref<any[]>([]);
let animationFrameId: number;
let lastTime = 0;

const initPhysics = () => {
  cancelAnimationFrame(animationFrameId);
  drops.value = Array.from({ length: props.blobCount }).map((_, i) => {
    return {
      id: i,
      // Random start positions
      x: Math.random() * 100, // percentage 0-100
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * props.blobSpeed,
      vy: (Math.random() - 0.5) * props.blobSpeed,
      radius: props.blobMinSize + Math.random() * (props.blobMaxSize - props.blobMinSize),
    };
  });
  
  lastTime = performance.now();
  loop(lastTime);
};

// watch props to restart physics when config changes
watch(() => [props.blobCount, props.blobMinSize, props.blobMaxSize, props.blobSpeed], () => {
  if (isModalOpen.value) {
    initPhysics();
  }
});

const loop = (time: number) => {
  const dt = Math.min((time - lastTime) / 16.66, 3);
  lastTime = time;

  drops.value.forEach(d => {
    d.x += d.vx * dt;
    d.y += d.vy * dt;

    // Bounce off slightly outside boundaries to keep them near edges
    if (d.x < -20) { d.x = -20; d.vx *= -1; }
    if (d.x > 120) { d.x = 120; d.vx *= -1; }
    if (d.y < -20) { d.y = -20; d.vy *= -1; }
    if (d.y > 120) { d.y = 120; d.vy *= -1; }
  });

  animationFrameId = requestAnimationFrame(loop);
};

watch(isModalOpen, (isOpen) => {
  if (isOpen) {
    // slight delay for modal open animation
    setTimeout(() => {
      initPhysics();
    }, 50);
  } else {
    cancelAnimationFrame(animationFrameId);
    drops.value = [];
  }
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <Modal
    v-model:open="isModalOpen"
    :origin="origin"
    placement="center"
    size="sm"
    mode="gsap"
    physics="none"
    :backdrop="false"
  >
    <div class="menu-container">
      
      <!-- Liquid Background Wrapper -->
      <div class="liquid-bg-wrapper" aria-hidden="true">
        <div class="liquid-bg">
          <!-- SVG width/height 100% works best for absolute positioning -->
          <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; overflow: visible;">
            <defs>
              <filter :id="`gooey-menu-${instanceId}`" x="-50%" y="-50%" width="200%" height="200%">
                <!-- Using a large blur and color matrix to create the gooey mix -->
                <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10" result="goo" />
                <!-- Apply heavy blur inside the SVG to avoid CSS compositing edge artifacts -->
                <feGaussianBlur in="goo" :stdDeviation="blur" />
              </filter>
            </defs>
            <g :filter="`url(#gooey-menu-${instanceId})`">
              <circle
                v-for="d in drops"
                :key="d.id"
                :cx="`${d.x}%`"
                :cy="`${d.y}%`"
                :r="d.radius"
                :fill="accent.hex"
                style="will-change: transform; transition: fill 0.3s ease;"
              />
            </g>
          </svg>
        </div>
      </div>
      

      <!-- Content -->
      <div class="menu-content">
        <div class="menu-header">
          <span data-morph-icon="menu-icon" class="menu-header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>
          </span>
          <h2 data-morph-split="menu-title" class="menu-title">Menú Principal</h2>
        </div>

        <div class="menu-items">
          <Button variant="ghost" color="black" style="width: 100%; justify-content: flex-start;">
            Perfil
          </Button>

          <Button variant="ghost" color="black" style="width: 100%; justify-content: flex-start;">
            Configuración
          </Button>

          <Button variant="ghost" color="black" style="width: 100%; justify-content: flex-start;" @click="openThemeSelect">
            <template #icon>
              <span data-morph-icon="theme-icon" style="display: inline-flex; align-items: center; justify-content: center; line-height: 1;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.68-.43-1.12A1.68 1.68 0 0 1 14.46 16h2.08A2.46 2.46 0 0 0 19 13.54V12C19 6.5 16.5 2 12 2z"/></svg>
              </span>
            </template>
            <span data-morph-split="theme-text">Apariencia</span>
          </Button>

          <div class="menu-divider"></div>

          <Button variant="ghost" color="black" style="width: 100%; justify-content: flex-start;">
            Feedback
          </Button>

          <Button variant="ghost" color="red" style="width: 100%; justify-content: flex-start;">
            Reiniciar Sesión
          </Button>
        </div>
      </div>
    </div>
  </Modal>

  <ThemeSelectModal v-model:open="isThemeSelectOpen" :origin="themeSelectOrigin" title="Apariencia" />
</template>

<style scoped>
.menu-container {
  position: relative;
  /* Ancho adaptativo: se acopla al contenido mas ancho (titulo o boton mas grande) */
  width: max-content;
  min-width: 165px;
  max-width: min(320px, calc(100vw - 48px));
}

/* Wrapper spans the modal interior */
.liquid-bg-wrapper {
  position: absolute;
  top: -28px;
  right: -28px;
  bottom: -24px;
  left: -28px;
  z-index: 0;
  pointer-events: none;
  transform: translateZ(0); /* Forces hardware acceleration and cleaner clipping by parent */
}

/* Background spans much larger to hide the faded blurred edges */
.liquid-bg {
  position: absolute;
  top: -60px;
  right: -60px;
  bottom: -60px;
  left: -60px;
}


.menu-content {
  position: relative;
  z-index: 2; /* Above the glass overlay */
  display: flex;
  flex-direction: column;
  width: 100%;
}

.menu-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1.5rem;
}

.menu-header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex: 0 0 auto;
}

.menu-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  white-space: nowrap;
}

[data-morph-icon],
[data-morph-split] {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.menu-items {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.menu-divider {
  height: 1px;
  background-color: var(--border);
  margin: 0.5rem 0;
}
</style>
