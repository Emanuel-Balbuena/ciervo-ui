<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import Slider from '../components/Slider/Slider.vue';
import { useTheme } from '../composables/useTheme';
import { modal } from '../components/Modal/index.js';
import { motionOf } from '../core/motion/element.js';

const router = useRouter();
const { isDark, toggleTheme } = useTheme();

// 1. Laboratorio Interactivo de Props
type VariantType = 'neutral' | 'danger' | 'success' | 'warning';
type PlacementType = 'center' | 'anchor' | 'bottom' | 'inplace' | 'inplace-tl' | 'inplace-t' | 'inplace-tr' | 'inplace-l' | 'inplace-r' | 'inplace-bl' | 'inplace-b' | 'inplace-br';
type SizeType = 'sm' | 'md' | 'lg';
type ModeType = 'travel' | 'transform' | 'simple';

const playground = ref({
  variant: 'neutral' as VariantType,
  placement: 'center' as PlacementType,
  mode: 'transform' as ModeType,
  size: 'md' as SizeType,
  stiffness: 144,
  damping: 15,
  mass: 1,
  gesture: true,
  dismissible: true,
  travel: true
});

// Función para abrir el modal de apertura
const openModal = async (e: Event) => {
  const target = e.currentTarget as HTMLElement;
  const ok = await modal.open({
    origin: target,
    title: 'Confirmar Acción',
    description: '¿Estás seguro de que deseas proceder con esta acción irreversible? El modal utilizará las físicas ajustadas.',
    confirmLabel: 'Confirmar',
    cancelLabel: 'Cancelar',
    variant: playground.value.variant,
    placement: playground.value.placement,
    size: playground.value.size,
    gesture: playground.value.gesture,
    dismissible: playground.value.dismissible,
    mode: playground.value.mode,
    morph: {
      stiffness: playground.value.stiffness,
      damping: playground.value.damping,
      mass: playground.value.mass
    }
  });

  if (ok) {
    console.log('Confirmed');
  } else {
    console.log('Cancelled or dismissed');
  }
};

// 2. Physics Playground
const physicsLab = ref({
  factor2D: 2,
  factor3D: 0.15,
  clamp2D: 20,
  clamp3D: 20,
  dynScale2D: 200,
  dynScale3D: 300,
  dynMinSize: 150,
  dragStiffness: 200,
  dragDamping: 12,
  rotStiffness: 150,
  rotDamping: 15,
  pointerSmoothing: 0.5,
  stiffness: 200,
  damping: 12,
  massMultiplier: 1.0,
  massInfluenceSmall: 0.3,
  massInfluenceLarge: 0.8,
  mode: 'both' as 'both' | '2d-only' | '3d-only'
});

let dragging = false;
let activeCard: HTMLElement | null = null;
let startX = 0, startY = 0, lastX = 0, lastY = 0;
let currentX = 0, currentY = 0;
let smoothedVx = 0, smoothedVy = 0;
let anchorX = 0, anchorY = 0;
let normalizedMass = 1;
let rafId = 0;
let lastTime = 0;

const physicsTick = (time: number) => {
  if (!dragging || !activeCard) return;
  
  const dt = Math.max(0.008, (time - lastTime) / 1000);
  lastTime = time;
  
  const dx = currentX - startX;
  const dy = currentY - startY;
  
  const instVx = (currentX - lastX) / dt;
  const instVy = (currentY - lastY) / dt;
  
  lastX = currentX;
  lastY = currentY;
  
  const speed = Math.hypot(instVx, instVy);
  // Usamos la variable de suavizado del laboratorio. A más suavizado, menos temblor pero más "lineal" se siente.
  const baseSmoothing = physicsLab.value.pointerSmoothing;
  const smoothing = Math.max(0.1, Math.min(0.9, baseSmoothing * (50 / (speed + 10)))); 
  
  smoothedVx = smoothedVx * smoothing + instVx * (1 - smoothing);
  smoothedVy = smoothedVy * smoothing + instVy * (1 - smoothing);
  
  const width = activeCard.offsetWidth;
  const height = activeCard.offsetHeight;
  const diag = Math.hypot(width, height);
  
  // Restricciones dinámicas basadas en la geometría (Inverse Proportional)
  // Mantiene la profundidad 3D constante. Si es muy ancho, clamp3D_Y es más estricto.
  const scale2D = physicsLab.value.dynScale2D;
  const scale3D = physicsLab.value.dynScale3D;
  const minSize = physicsLab.value.dynMinSize;
  
  const clamp2D = physicsLab.value.clamp2D * (scale2D / Math.max(minSize, diag));
  const clamp3D_X = physicsLab.value.clamp3D * (scale3D / Math.max(minSize, height));
  const clamp3D_Y = physicsLab.value.clamp3D * (scale3D / Math.max(minSize, width));
  
  // Usamos una masa "legacy" multiplicada x10 solo para el cálculo de rotación, 
  // para no romper la escala actual de los sliders factor2D y factor3D que ya ajustaste.
  const rotationMass = normalizedMass * 10;
  
  const torqueZ = (anchorX * smoothedVy - anchorY * smoothedVx) / 1000;
  let rotateZ = (torqueZ / rotationMass) * physicsLab.value.factor2D;
  rotateZ = Math.max(-clamp2D, Math.min(clamp2D, rotateZ));
  
  let rotateY = (smoothedVx / rotationMass) * physicsLab.value.factor3D;
  let rotateX = -(smoothedVy / rotationMass) * physicsLab.value.factor3D;
  rotateY = Math.max(-clamp3D_Y, Math.min(clamp3D_Y, rotateY));
  rotateX = Math.max(-clamp3D_X, Math.min(clamp3D_X, rotateX));
  
  if (physicsLab.value.mode === '3d-only') rotateZ = 0;
  if (physicsLab.value.mode === '2d-only') { rotateX = 0; rotateY = 0; }
  
  if (activeCard) {
    const sqrtMass = Math.sqrt(normalizedMass);
    motionOf(activeCard).to({ x: dx, y: dy }, {
      spring: { 
        stiffness: physicsLab.value.dragStiffness, 
        damping: physicsLab.value.dragDamping * sqrtMass,
        mass: normalizedMass
      }
    });

    motionOf(activeCard).to({ rotateZ, rotateX, rotateY }, {
      spring: { 
        stiffness: physicsLab.value.rotStiffness, 
        damping: physicsLab.value.rotDamping * sqrtMass,
        mass: normalizedMass
      }
    });
  }
  
  rafId = requestAnimationFrame(physicsTick);
};

const onPointerDown = (e: PointerEvent, type?: string) => {
  if (e.button !== 0) return;
  const el = e.currentTarget as HTMLElement;
  if (!el) return;
  
  activeCard = el;
  el.setPointerCapture(e.pointerId);
  dragging = true;
  startX = e.clientX;
  startY = e.clientY;
  lastX = e.clientX;
  lastY = e.clientY;
  currentX = e.clientX;
  currentY = e.clientY;
  smoothedVx = 0;
  smoothedVy = 0;
  
  const rect = el.getBoundingClientRect();
  anchorX = e.clientX - (rect.left + rect.width / 2);
  anchorY = e.clientY - (rect.top + rect.height / 2);
  
  // Normalizamos la masa basándonos en el área de la tarjeta mediana (~85,000 px cuadrados = masa 1.0)
  const area = rect.width * rect.height;
  const rawNormalizedMass = Math.max(0.01, area / 85000);
  
  // Usamos una curva de potencia asimétrica para comprimir los extremos.
  // power < 1 comprime los valores hacia 1.0.
  // El usuario requiere que las tarjetas pequeñas se compriman más (para que no sean un glitch de luz)
  // pero que las grandes se compriman menos (para que conserven su enorme pesadez).
  const power = rawNormalizedMass < 1 
    ? physicsLab.value.massInfluenceSmall 
    : physicsLab.value.massInfluenceLarge;
    
  normalizedMass = Math.pow(rawNormalizedMass, power) * physicsLab.value.massMultiplier;
  
  if (el.parentElement) {
    el.parentElement.style.perspective = '1200px';
  }
  
  lastTime = performance.now();
  rafId = requestAnimationFrame(physicsTick);
};

const onPointerMove = (e: PointerEvent) => {
  if (!dragging) return;
  e.preventDefault();
  currentX = e.clientX;
  currentY = e.clientY;
};

const onPointerUp = (e: PointerEvent) => {
  if (!dragging || !activeCard) return;
  const el = activeCard;
  dragging = false;
  activeCard = null;
  cancelAnimationFrame(rafId);
  el.releasePointerCapture(e.pointerId);
  
  const sqrtMass = Math.sqrt(normalizedMass);
  motionOf(el).to({ x: 0, y: 0, rotateZ: 0, rotateX: 0, rotateY: 0 }, {
    spring: { 
      stiffness: physicsLab.value.stiffness, 
      damping: physicsLab.value.damping * sqrtMass,
      mass: normalizedMass
    }
  });
};
</script>

<template>
  <div class="demo-wrapper" :class="isDark ? 'theme-dark' : 'theme-light'">
    <div class="demo-container">
      
      <!-- =========================================
           1. BARRA SUPERIOR DE METADATOS Y TEMA
           ========================================= -->
      <header class="top-nav">
        <div class="meta-tag">
          <Button 
            variant="ghost" 
            color="black" 
            shape="round" 
            size="small"
            @click="router.push('/')"
          >
            ← Volver a componentes
          </Button>
          <span class="meta-divider">·</span>
          <span>v0.1.0</span>
          <span class="meta-divider">·</span>
          <span>Modal</span>
        </div>
        
        <div class="theme-toggle">
          <Button 
            variant="ghost" 
            color="black" 
            shape="round" 
            size="small"
            @click="toggleTheme"
          >
            {{ isDark ? 'Light' : 'Dark' }}
          </Button>
        </div>
      </header>

      <!-- =========================================
           2. PLAYGROUND PRINCIPAL (2 COLUMNAS)
           ========================================= -->
      <section class="playground-layout">
        
        <!-- COLUMNA IZQUIERDA: CONTROLES -->
        <aside class="playground-controls">
          <h2 class="controls-title">Controles Modal</h2>
          
          <div class="control-group">
            <label class="control-label">Masa ({{ playground.mass.toFixed(1) }})</label>
            <div class="slider-wrapper">
              <Slider v-model="playground.mass" :min="0.1" :max="5" :step="0.1" color="orange" :coloredTrack="true" />
            </div>
            <p class="control-hint">Peso del objeto. A mayor masa, mayor lentitud y rebote residual.</p>
          </div>

          <div class="control-group">
            <label class="control-label">Rigidez ({{ playground.stiffness.toFixed(0) }})</label>
            <div class="slider-wrapper">
              <Slider v-model="playground.stiffness" :min="20" :max="500" :step="1" color="orange" :coloredTrack="true" />
            </div>
            <p class="control-hint">Fuerza del resorte. A mayor rigidez, más rápido viaja.</p>
          </div>

          <div class="control-group">
            <label class="control-label">Amortiguación ({{ playground.damping.toFixed(1) }})</label>
            <div class="slider-wrapper">
              <Slider v-model="playground.damping" :min="5" :max="50" :step="0.5" color="orange" :coloredTrack="true" />
            </div>
            <p class="control-hint">Fricción. Menor amortiguación causa más rebotes bobbly.</p>
          </div>

          <div class="control-group inline">
            <label class="control-label">Placement</label>
            <select v-model="playground.placement" class="pill-select">
              <option value="center">Center</option>
              <option value="anchor">Anchor</option>
              <option value="bottom">Bottom</option>
              <option value="inplace">Inplace (Center)</option>
              <option value="inplace-tl">Inplace (Top-Left)</option>
              <option value="inplace-t">Inplace (Top)</option>
              <option value="inplace-tr">Inplace (Top-Right)</option>
              <option value="inplace-l">Inplace (Left)</option>
              <option value="inplace-r">Inplace (Right)</option>
              <option value="inplace-bl">Inplace (Bottom-Left)</option>
              <option value="inplace-b">Inplace (Bottom)</option>
              <option value="inplace-br">Inplace (Bottom-Right)</option>
            </select>
          </div>

          <div class="control-group inline">
            <label class="control-label">Size</label>
            <select v-model="playground.size" class="pill-select">
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>

          <div class="control-group inline">
            <label class="control-label">Modo de Apertura</label>
            <select v-model="playground.mode" class="pill-select">
              <option value="travel">Nacer (Travel)</option>
              <option value="transform">Transformarse</option>
              <option value="simple">Simple (Sin Origen)</option>
            </select>
          </div>

          <div class="control-group inline">
            <label class="control-label">Variante (Confirm)</label>
            <select v-model="playground.variant" class="pill-select">
              <option value="neutral">Neutral</option>
              <option value="danger">Danger</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </aside>

        <!-- COLUMNA DERECHA: DEMO INTERACTIVA -->
        <main class="playground-demo" style="display: flex; align-items: center; justify-content: center; min-height: 400px; gap: 1rem; flex-wrap: wrap;">
            
            <Button variant="outline" color="orange" shape="round" size="large" @click="openModal">
              Open Modal (Outline)
            </Button>
            
            <Button variant="framed" color="blue" shape="round" size="large" @click="openModal">
              Open Modal (Framed)
            </Button>
            
            <Button variant="soft" color="green" shape="round" size="large" @click="openModal">
              Open Modal (Soft)
            </Button>
            
            <Button variant="ghost" color="black" shape="round" size="large" @click="openModal">
              Open Modal (Ghost)
            </Button>

        </main>
      </section>

      <!-- =========================================
           3. LABORATORIO DE FÍSICAS (PLAYGROUND)
           ========================================= -->
      <section class="playground-layout" style="margin-top: 48px;">
        <aside class="playground-controls">
          <h2 class="section-title">Laboratorio de Físicas</h2>
          
          <div class="control-group">
            <label class="control-label">Modo de Inclinación</label>
            <select v-model="physicsLab.mode" class="pill-select">
              <option value="both">Completo (2D + 3D)</option>
              <option value="2d-only">Solo 2D (Volante)</option>
              <option value="3d-only">Solo 3D (Rezago)</option>
            </select>
          </div>

          <div class="control-group">
            <label class="control-label">Fuerza 2D (Torque): {{ physicsLab.factor2D }}</label>
            <Slider v-model="physicsLab.factor2D" :min="0" :max="10" :step="0.1" />
          </div>

          <div class="control-group">
            <label class="control-label">Límite 2D (Clamp): {{ physicsLab.clamp2D }}°</label>
            <Slider v-model="physicsLab.clamp2D" :min="0" :max="90" :step="1" />
          </div>

          <div class="control-group">
            <label class="control-label">Fuerza 3D (Arrastre): {{ physicsLab.factor3D }}</label>
            <Slider v-model="physicsLab.factor3D" :min="0" :max="1" :step="0.01" />
          </div>

          <div class="control-group">
            <label class="control-label">Límite Angulo 3D (Z-clamp): {{ physicsLab.clamp3D }}&deg;</label>
            <Slider v-model="physicsLab.clamp3D" :min="0" :max="90" :step="1" />
          </div>

          <div class="control-group" style="margin-top: 1rem;">
            <label class="control-label">Escala Dinámica 2D (Diagonal base): {{ physicsLab.dynScale2D }}px</label>
            <Slider v-model="physicsLab.dynScale2D" :min="100" :max="1000" :step="10" />
          </div>

          <div class="control-group">
            <label class="control-label">Escala Dinámica 3D (Lado base): {{ physicsLab.dynScale3D }}px</label>
            <Slider v-model="physicsLab.dynScale3D" :min="100" :max="1000" :step="10" />
          </div>

          <div class="control-group">
            <label class="control-label">Piso de restricción geométrica: {{ physicsLab.dynMinSize }}px</label>
            <Slider v-model="physicsLab.dynMinSize" :min="10" :max="300" :step="5" />
          </div>

          <div class="control-group" style="margin-top: 1rem;">
            <label class="control-label">Multiplicador de Masa Global: {{ physicsLab.massMultiplier.toFixed(1) }}x</label>
            <Slider v-model="physicsLab.massMultiplier" :min="0.1" :max="5" :step="0.1" />
          </div>

          <div class="control-group" style="margin-top: 1rem;">
            <label class="control-label">Masa en Tarjetas Pequeñas: {{ physicsLab.massInfluenceSmall.toFixed(2) }}</label>
            <Slider v-model="physicsLab.massInfluenceSmall" :min="0" :max="1" :step="0.05" />
          </div>

          <div class="control-group">
            <label class="control-label">Masa en Tarjetas Grandes: {{ physicsLab.massInfluenceLarge.toFixed(2) }}</label>
            <Slider v-model="physicsLab.massInfluenceLarge" :min="0" :max="1" :step="0.05" />
          </div>

          <div class="control-group" style="margin-top: 1rem;">
            <label class="control-label">Rigidez de Arrastre (Drag Stiff): {{ physicsLab.dragStiffness }}</label>
            <Slider v-model="physicsLab.dragStiffness" :min="100" :max="1500" :step="10" />
          </div>

          <div class="control-group">
            <label class="control-label">Fricción de Arrastre (Drag Damp): {{ physicsLab.dragDamping }}</label>
            <Slider v-model="physicsLab.dragDamping" :min="10" :max="100" :step="1" />
          </div>

          <div class="control-group" style="margin-top: 1rem;">
            <label class="control-label">Filtro de Ratón (Pointer Smooth): {{ physicsLab.pointerSmoothing.toFixed(2) }}</label>
            <Slider v-model="physicsLab.pointerSmoothing" :min="0" :max="0.95" :step="0.05" />
          </div>

          <div class="control-group" style="margin-top: 1rem;">
            <label class="control-label">Rigidez Inercial (Rot Stiff): {{ physicsLab.rotStiffness }}</label>
            <Slider v-model="physicsLab.rotStiffness" :min="50" :max="500" :step="5" />
          </div>

          <div class="control-group">
            <label class="control-label">Fricción Inercial (Rot Damp): {{ physicsLab.rotDamping }}</label>
            <Slider v-model="physicsLab.rotDamping" :min="2" :max="50" :step="1" />
          </div>

          <div class="control-group" style="margin-top: 1rem;">
            <label class="control-label">Rigidez de Soltado (Drop Stiff): {{ physicsLab.stiffness }}</label>
            <Slider v-model="physicsLab.stiffness" :min="50" :max="500" :step="5" />
          </div>

          <div class="control-group">
            <label class="control-label">Fricción de Soltado (Drop Damp): {{ physicsLab.damping }}</label>
            <Slider v-model="physicsLab.damping" :min="5" :max="50" :step="1" />
          </div>
        </aside>

        <main id="physics-demo-box" class="playground-demo" style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: center; min-height: 800px; gap: 2rem; padding: 2rem; border: 2px dashed var(--border); border-radius: 12px; position: relative; overflow: hidden; background: repeating-linear-gradient(45deg, var(--bg-soft), var(--bg-soft) 10px, transparent 10px, transparent 20px);">
          
          <!-- Muy delgada-->
          <div
            class="apr-card"
            style="width: 100px; height: 20px; padding: 16px; cursor: grab; user-select: none; background: #ffffff; border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-md); touch-action: none; z-index: 10;"
            @pointerdown="(e) => onPointerDown(e, 'very-thin')"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          ></div>

          <!-- Pequeña -->
          <div
            class="apr-card"
            style="width: 220px; padding: 16px; cursor: grab; user-select: none; background: #ffffff; border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-md); touch-action: none; z-index: 10;"
            @pointerdown="(e) => onPointerDown(e, 'small')"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <h3 class="apr-title" style="margin-top: 0; margin-bottom: 8px; font-size: 1rem; font-weight: 600;">Pequeña</h3>
            <p class="apr-description" style="color: var(--text-secondary); margin-bottom: 12px; font-size: 0.85rem;">220px. Torque rápido.</p>
            <Button variant="solid" color="blue" shape="round" style="pointer-events: none; width: 100%;">Acción</Button>
          </div>

          <!-- Mediana -->
          <div
            class="apr-card"
            style="width: 340px; padding: 24px; cursor: grab; user-select: none; background: #ffffff; border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-lg); touch-action: none; z-index: 10;"
            @pointerdown="(e) => onPointerDown(e, 'medium')"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <h3 class="apr-title" style="margin-top: 0; margin-bottom: 8px; font-size: 1.25rem; font-weight: 600;">Mediana (Estándar)</h3>
            <p class="apr-description" style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.5;">340px. El tamaño promedio para un diálogo de confirmación.</p>
            <div class="apr-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
              <Button variant="ghost" color="black" shape="round" style="pointer-events: none;">Cancelar</Button>
              <Button variant="solid" color="blue" shape="round" style="pointer-events: none;">Aceptar</Button>
            </div>
          </div>

          <!-- Larga (Vertical) -->
          <div
            class="apr-card"
            style="width: 320px; height: 1000px; padding: 24px; cursor: grab; user-select: none; background: #ffffff; border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-lg); touch-action: none; display: flex; flex-direction: column; z-index: 10;"
            @pointerdown="(e) => onPointerDown(e, 'long')"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <h3 class="apr-title" style="margin-top: 0; margin-bottom: 8px; font-size: 1.25rem; font-weight: 600;">Larga (Vertical)</h3>
            <p class="apr-description" style="color: var(--text-secondary); margin-bottom: auto; line-height: 1.5;">Panel lateral. Restringe drásticamente la inclinación vertical (X) para que no perfore la pantalla.</p>
            <Button variant="solid" color="blue" shape="round" style="pointer-events: none; width: 100%;">Cerrar Panel</Button>
          </div>

          <!-- Larga (Horizontal) -->
          <div
            class="apr-card"
            style="width: 600px; height: 200px; padding: 24px; cursor: grab; user-select: none; background: #ffffff; border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-lg); touch-action: none; display: flex; flex-direction: column; z-index: 10;"
            @pointerdown="(e) => onPointerDown(e, 'horizontal')"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <h3 class="apr-title" style="margin-top: 0; margin-bottom: 8px; font-size: 1.25rem; font-weight: 600;">Larga (Horizontal)</h3>
            <p class="apr-description" style="color: var(--text-secondary); margin-bottom: auto; line-height: 1.5;">Simula un banner o un modal de notificación ancha. Restringe la inclinación horizontal (Y) para que los bordes no vuelen lejos.</p>
          </div>

          <!-- Grande -->
          <div
            class="apr-card"
            style="width: 500px; height: 350px; padding: 32px; cursor: grab; user-select: none; background: #ffffff; border: 1px solid var(--border); border-radius: 24px; box-shadow: var(--shadow-xl); touch-action: none; z-index: 10;"
            @pointerdown="(e) => onPointerDown(e, 'large')"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <h3 class="apr-title" style="margin-top: 0; margin-bottom: 12px; font-size: 1.5rem; font-weight: 600;">Grande (Dashboard)</h3>
            <p class="apr-description" style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.5; font-size: 1rem;">Un modal enorme. Debería sentirse pesado y resistente a girar locamente gracias a su amplia área.</p>
          </div>

        </main>
      </section>

    </div>
  </div>
</template>

<style scoped>
/* Aprovecha estilos globales de playground en style.css */
</style>
