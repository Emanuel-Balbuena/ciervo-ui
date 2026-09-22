<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import Slider from '../components/Slider/Slider.vue';
import Modal from '../components/Modal/Modal.vue';
import Select from '../components/Select/Select.vue';
import { useTheme } from '../composables/useTheme';

const router = useRouter();
const { isDark, toggleTheme } = useTheme();

// 1. Laboratorio Interactivo de Props
type VariantType = 'neutral' | 'danger' | 'success' | 'warning';
type PlacementType = 'center' | 'anchor' | 'bottom' | 'inplace' | 'inplace-tl' | 'inplace-t' | 'inplace-tr' | 'inplace-l' | 'inplace-r' | 'inplace-bl' | 'inplace-b' | 'inplace-br';
type SizeType = 'sm' | 'md' | 'lg';
// AÑADIDO: 'gsap' y 'flip' a los tipos válidos
type ModeType = 'travel' | 'transform' | 'simple' | 'gsap' | 'flip' | 'vt'; 

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
  travel: true,
  physics: 'both' as 'both' | '2d' | '3d' | 'none'
});

const isModalOpen = ref(false);
const currentOrigin = ref<HTMLElement | null>(null);

const dynamicDescription = ref("¿Estás seguro de que deseas proceder con esta acción irreversible? El modal utilizará las físicas ajustadas en el laboratorio.");

const isNestedOpen = ref(false);
const nestedOrigin = ref<HTMLElement | null>(null);

const handleOpen = (e: Event) => {
  currentOrigin.value = e.currentTarget as HTMLElement;
  isModalOpen.value = true;
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
            <template #icon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </template>
          </Button>
          <div class="meta-label">
            <span class="meta-title">Modal Component</span>
            <span class="meta-subtitle">Laboratorio de Físicas</span>
          </div>
        </div>
        
        <div class="top-actions">
          <!-- Botón Origen con Elementos Compartidos -->
          <Button 
            variant="soft" 
            color="black" 
            shape="round" 
            size="small"
            @click="handleOpen"
          >
            <template #icon>
              <svg data-apr-id="shared-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </template>
            <span data-apr-id="shared-text">Configuración</span>
          </Button>
          
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
            <div style="min-width: 180px;">
              <Select v-model="playground.placement" placement="inplace-b" :options="[
                { value: 'center', label: 'Center' },
                { value: 'anchor', label: 'Anchor' },
                { value: 'bottom', label: 'Bottom' },
                { value: 'inplace', label: 'Inplace (Center)' },
                { value: 'inplace-tl', label: 'Inplace (Top-Left)' },
                { value: 'inplace-t', label: 'Inplace (Top)' },
                { value: 'inplace-tr', label: 'Inplace (Top-Right)' },
                { value: 'inplace-l', label: 'Inplace (Left)' },
                { value: 'inplace-r', label: 'Inplace (Right)' },
                { value: 'inplace-bl', label: 'Inplace (Bottom-Left)' },
                { value: 'inplace-b', label: 'Inplace (Bottom)' },
                { value: 'inplace-br', label: 'Inplace (Bottom-Right)' }
              ]" />
            </div>
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
              <option value="travel">Raised / Travel</option>
              <option value="transform">Transformarse</option>
              <option value="simple">Simple (Sin Origen)</option>
              <option value="gsap">Transformación GSAP</option> 
              <!-- AÑADIDO: Flip Morph -->
              <option value="flip">Flip Morph (Nativo)</option>
              <!-- AÑADIDO: View Transitions -->
              <option value="vt">View Transitions API</option>
            </select>
          </div>

          <div class="control-group inline">
            <label class="control-label">Permisos</label>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <label><input type="checkbox" v-model="playground.dismissible"> Dismissible</label>
              <label><input type="checkbox" v-model="playground.gesture"> Draggable</label>
            </div>
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
          <div class="control-group inline">
            <label class="control-label">Físicas al arrastrar</label>
            <div style="display: flex; gap: 0.5rem;">
              <label><input type="radio" v-model="playground.physics" value="both"> 2D + 3D</label>
              <label><input type="radio" v-model="playground.physics" value="2d"> 2D</label>
              <label><input type="radio" v-model="playground.physics" value="3d"> 3D</label>
              <label><input type="radio" v-model="playground.physics" value="none"> Ninguna</label>
            </div>
          </div>

        </aside>

        <!-- COLUMNA DERECHA: DEMO INTERACTIVA -->
        <main class="playground-demo" style="display: flex; flex-direction: column; gap: 2.5rem; min-height: 400px; padding-bottom: 4rem;">
            
            <div class="demo-section">
              <h3 style="margin-bottom: 1rem; font-size: 1rem; opacity: 0.6;">1. Icon + Text (Variantes)</h3>
              <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                <Button variant="solid" color="black" shape="round" size="large" @click="handleOpen">
                  <template #icon>
                    <svg data-apr-id="shared-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                  </template>
                  <span data-apr-id="shared-text">Configuración</span>
                </Button>
                
                <Button variant="soft" color="blue" shape="round" size="large" @click="handleOpen">
                  <template #icon>
                    <svg data-apr-id="shared-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                  </template>
                  <span data-apr-id="shared-text">Configuración</span>
                </Button>

                <Button variant="outline" color="orange" shape="round" size="large" @click="handleOpen">
                  <template #icon>
                    <svg data-apr-id="shared-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                  </template>
                  <span data-apr-id="shared-text">Configuración</span>
                </Button>

                <Button variant="ghost" color="green" shape="round" size="large" @click="handleOpen">
                  <template #icon>
                    <svg data-apr-id="shared-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                  </template>
                  <span data-apr-id="shared-text">Configuración</span>
                </Button>
              </div>
            </div>

            <div class="demo-section">
              <h3 style="margin-bottom: 1rem; font-size: 1rem; opacity: 0.6;">2. Solo Texto (Diferentes Tamaños)</h3>
              <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                <Button variant="solid" color="black" shape="round" size="small" @click="handleOpen">
                  <span data-apr-id="shared-text">Configuración</span>
                </Button>
                <Button variant="soft" color="blue" shape="round" size="medium" @click="handleOpen">
                  <span data-apr-id="shared-text">Configuración</span>
                </Button>
                <Button variant="outline" color="orange" shape="round" size="large" @click="handleOpen">
                  <span data-apr-id="shared-text">Configuración</span>
                </Button>
              </div>
            </div>

            <div class="demo-section">
              <h3 style="margin-bottom: 1rem; font-size: 1rem; opacity: 0.6;">3. Solo Icono (Cirulares)</h3>
              <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                <Button variant="solid" color="black" shape="round" size="large" :icon-only="true" @click="handleOpen">
                  <svg data-apr-id="shared-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                </Button>
                <Button variant="soft" color="blue" shape="round" size="medium" :icon-only="true" @click="handleOpen">
                  <svg data-apr-id="shared-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                </Button>
                <Button variant="ghost" color="green" shape="round" size="small" :icon-only="true" @click="handleOpen">
                  <svg data-apr-id="shared-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                </Button>
              </div>
            </div>

            <div class="demo-section">
              <h3 style="margin-bottom: 1rem; font-size: 1rem; opacity: 0.6;">4. Icono Trailing (Texto + Icono al final)</h3>
              <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                <Button variant="solid" color="black" shape="round" size="large" iconPosition="end" @click="handleOpen">
                  <span data-apr-id="shared-text">Configuración</span>
                  <template #icon>
                    <svg data-apr-id="shared-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                  </template>
                </Button>
              </div>
            </div>

        </main>
      </section>

      <!-- El Modal Vue Wrapper -->
      <Modal 
        v-model:open="isModalOpen" 
        :origin="currentOrigin"
        :variant="playground.variant"
        :placement="playground.placement"
        :size="playground.size"
        :mode="playground.mode"
        :morph="{
          mass: playground.mass,
          stiffness: playground.stiffness,
          damping: playground.damping
        }"
        :physics="playground.physics"
        :dismissible="playground.dismissible"
        :gesture="playground.gesture"
      >
        <!-- Contenido del Modal con Elementos Compartidos -->
        <div style="padding-top: 0.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
            <svg data-apr-id="shared-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            <h2 data-apr-id="shared-text" class="apr-title" style="margin: 0; font-size: 1.25rem; width: max-content;">Configuración</h2>
          </div>
          
          <p class="apr-description" style="margin-bottom: 0.5rem">
            {{ dynamicDescription }}
          </p>
          
          <Button variant="soft" color="green" size="small" @click="dynamicDescription += ' Este es un bloque de texto dinámico añadido en vivo. Observa cómo el modal anima su tamaño.'">
            Actualizar Descripción
          </Button>
          <Button variant="outline" color="blue" size="small" @click="isNestedOpen = true; nestedOrigin = $event.currentTarget as HTMLElement">
            Abrir Modal Anidado
          </Button>
          
          <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
            <Button variant="solid" color="black" size="small" @click="isModalOpen = false">
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      <!-- Modal Anidado (Nested) -->
      <Modal
        v-model:open="isNestedOpen"
        :origin="nestedOrigin"
        placement="center"
        size="sm"
        mode="transform"
        physics="both"
      >
        <div style="padding-top: 0.5rem">
          <h2 class="apr-title" style="margin-bottom: 0.5rem">Modal Anidado</h2>
          <p class="apr-description">
            Soy un segundo modal abierto desde adentro del primero. El fondo se oscureció un nivel más y mis clics no interfieren con el modal padre.
          </p>
          <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
            <Button variant="solid" color="blue" size="small" @click="isNestedOpen = false">
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  </div>
</template>

<style scoped>
.demo-wrapper {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Instrument Sans', sans-serif;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.demo-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* =========================================
   1. BARRA SUPERIOR
   ========================================= */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background-color: var(--bg-secondary);
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.meta-divider {
  opacity: 0.4;
}

/* =========================================
   2. PLAYGROUND LAYOUT
   ========================================= */
.playground-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 24px;
  overflow: hidden;
}

/* =========================================
   3. CONTROLES (ASIDE)
   ========================================= */
.playground-controls {
  padding: 2rem;
  border-right: 1px solid var(--border);
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 80vh;
  overflow-y: auto;
}

.controls-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group.inline {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.control-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.control-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.slider-wrapper {
  padding: 0.5rem 0;
}

.pill-select {
  appearance: none;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  outline: none;
}
.pill-select:focus {
  border-color: var(--blue-solid-base);
}

/* =========================================
   4. DEMO INTERACTIVA (MAIN)
   ========================================= */
.playground-demo {
  padding: 2rem;
  position: relative;
  background: var(--bg-primary);
  border-top-left-radius: 24px;
  border-bottom-left-radius: 24px;
}
</style>