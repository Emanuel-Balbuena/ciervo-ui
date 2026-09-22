<template>
  <div class="pullcord" :class="[$attrs.class, `pullcord-${variant}`]" style="position: fixed; top: var(--pullcord-top, 0px); right: var(--pullcord-right, 7rem); z-index: var(--pullcord-z, 5); width: 64px; height: 340px; pointer-events: none;">
    <div class="pullcord-inner">
      <svg :viewBox="`0 0 ${W} ${props.cordLength * 2}`" :width="W" :height="props.cordLength * 2" aria-hidden="true" style="overflow: visible;">
        <defs>
          <linearGradient :id="`pc-knob-${instanceId}`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#e7e7ec" />
          </linearGradient>
          <filter :id="`pc-knob-sh-${instanceId}`" x="-70%" y="-70%" width="240%" height="240%">
            <feDropShadow dx="0" dy="1.4" stdDeviation="1.5" flood-color="rgba(0,0,0,0.32)" />
          </filter>
          
          <filter :id="`pc-gooey-${instanceId}`">
            <feGaussianBlur in="SourceGraphic" :stdDeviation="blurStdDev" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
          </filter>
        </defs>

        <!-- VARIANT: SOLID -->
        <g v-if="variant === 'solid'">
          <path
            :d="cordPath"
            stroke="var(--slider-track-bg, var(--surface-highest, rgba(127, 127, 127, 0.45)))"
            :stroke-width="strokeWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
          <g :transform="`translate(${nodes[nodes.length - 1].x - ANCHOR_X} ${nodes[nodes.length - 1].y - props.cordLength})`">
            <circle
              :cx="ANCHOR_X"
              :cy="props.cordLength"
              :r="thumbRadius"
              fill="var(--pullcord-ink, rgba(127, 127, 127, 1))"
            />
          </g>
        </g>

        <!-- VARIANT: MEMBRANE (B) -->
        <g v-else-if="variant === 'membrane'" :filter="`url(#pc-gooey-${instanceId})`">
          <path
            :d="cordPath"
            stroke="var(--pullcord-ink, rgba(127, 127, 127, 1))"
            :stroke-width="membraneStrokeWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
          <circle
            :cx="nodes[nodes.length - 1].x"
            :cy="nodes[nodes.length - 1].y"
            :r="thumbRadius"
            fill="var(--pullcord-ink, rgba(127, 127, 127, 1))"
          />
        </g>

        <!-- VARIANT: KINETIC (C) -->
        <g v-else-if="variant === 'kinetic'">
          <path
            :d="cordPath"
            stroke="var(--slider-track-bg, var(--surface-highest, rgba(127, 127, 127, 0.45)))"
            :stroke-width="strokeWidth"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
          />
          <g :filter="`url(#pc-gooey-${instanceId})`" fill="var(--pullcord-ink, rgba(127, 127, 127, 1))">
            <circle
              v-for="(tp, i) in tailPositions"
              :key="'tail'+i"
              :cx="tp.x"
              :cy="tp.y"
              :r="scaledTailRadii[i]"
            />
            <g :transform="`translate(${nodes[nodes.length - 1].x} ${nodes[nodes.length - 1].y}) ${kineticScale}`">
              <circle cx="0" cy="0" :r="thumbRadius" />
            </g>
          </g>
        </g>
        
        <!-- No Fallback -->

      </svg>
      <button
        ref="knobEl"
        type="button"
        class="pullcord-knob"
        :aria-label="ariaLabel"
        :aria-pressed="pulled"
        :title="ariaLabel"
        @pointerdown="onPanStart"
        @click="onClick"
        @keydown="onKeyDown"
        :style="{
          position: 'absolute',
          left: `${ANCHOR_X - hitSize / 2}px`,
          top: `${props.cordLength - hitSize / 2}px`,
          width: `${hitSize}px`,
          height: `${hitSize}px`,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'grab',
          touchAction: 'none',
          pointerEvents: 'auto',
          transform: `translate(${nodes[nodes.length - 1].x - ANCHOR_X}px, ${nodes[nodes.length - 1].y - props.cordLength}px)`
        }"
      ></button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch, computed, useId } from 'vue'
import { motionLoop } from '../../core/motion/engine.js'
import { play } from 'cuelume'

const props = defineProps({
  variant: { type: String, default: 'solid' }, // 'solid' | 'membrane' | 'kinetic'
  pulled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: 'Pull the cord' },
  noEntrance: { type: Boolean, default: false },
  config: {
    type: Object,
    default: () => ({})
  },
  sound: {
    type: Boolean,
    default: false
  },
  thumbRadius: { type: Number, default: 7 },
  ropeSize: { type: Number, default: 1.5 },
  cordLength: { type: Number, default: 140 }
})

const scaleFactor = computed(() => props.thumbRadius / 8)
const scaledTailRadii = computed(() => [6 * scaleFactor.value, 5 * scaleFactor.value, 4 * scaleFactor.value])
const scaledMaxLag = computed(() => 10 * scaleFactor.value)
const blurStdDev = computed(() => 3.2 * scaleFactor.value)
const strokeWidth = computed(() => props.ropeSize * scaleFactor.value)
const membraneStrokeWidth = computed(() => Math.max(4.0, (props.ropeSize + 3.5) * scaleFactor.value))
const hitSize = computed(() => 46 * scaleFactor.value)

const emit = defineEmits(['pull'])

const instanceId = useId()

const DEFAULT_CONFIG = {
  gravity: 1250,
  damping: 0.94,
  iterations: 20,
  stretchMax: 26,
  stretchToggle: 20,
  maxVelocity: 22,
  sleepVelocity: 0.01,
  breakMultiplier: 2,
  surgeVelocity: 1000
}

const W = 64
const ANCHOR_X = W / 2
const SEGMENTS = 16

function makeNodes(len, skipEntrance = true) {
  const arr = []
  const seg = len / SEGMENTS
  for (let i = 0; i <= SEGMENTS; i++) {
    if (skipEntrance) {
      const y = seg * i
      arr.push({ x: ANCHOR_X, y, ox: ANCHOR_X, oy: y, fixed: i === 0 })
    } else {
      const x = ANCHOR_X + (i % 2 === 0 ? 0 : seg)
      const y = 0
      const oy = -10 // impulso físico inicial hacia abajo
      arr.push({ x, y, ox: x, oy: i === 0 ? 0 : oy, fixed: i === 0 })
    }
  }
  return arr
}

function buildPath(p) {
  let d = `M ${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`
  for (let i = 1; i < p.length - 1; i++) {
    const xc = (p[i].x + p[i + 1].x) / 2
    const yc = (p[i].y + p[i + 1].y) / 2
    d += ` Q ${p[i].x.toFixed(1)} ${p[i].y.toFixed(1)} ${xc.toFixed(1)} ${yc.toFixed(1)}`
  }
  const n = p.length - 1
  d += ` L ${p[n].x.toFixed(1)} ${p[n].y.toFixed(1)}`
  return d
}

const cfg = { ...DEFAULT_CONFIG, ...props.config }
watch(() => props.config, (newConfig) => {
  Object.assign(cfg, DEFAULT_CONFIG, newConfig)
}, { deep: true })
// Use plain objects for physics to avoid Vue 3 Proxy overhead at 60fps
const nodes = makeNodes(props.cordLength, props.noEntrance)
const cordPath = ref(buildPath(nodes))
const knobEl = ref(null)

const dragging = ref(false)
const didDrag = ref(false)
const clicked = ref(false)
const target = { x: ANCHOR_X, y: props.cordLength }
const cursorDelta = { x: 0, y: 0 }
const escapeOffset = { x: 0, y: 0 }
const surge = { val: 0, vel: 0 }

let prevDt = 0

// Kinetic specific state
const kineticTail = { x: ANCHOR_X, y: props.cordLength, vx: 0, vy: 0 }
const tailPositions = [
  { x: ANCHOR_X, y: props.cordLength },
  { x: ANCHOR_X, y: props.cordLength },
  { x: ANCHOR_X, y: props.cordLength }
]
const kineticScale = ref('scale(1, 1)')
let lastKnobVelocity = { x: 0, y: 0 }

const channel = {
  active: false,
  step(dt) {
    const last = nodes.length - 1
    const tc = prevDt > 0 ? dt / prevDt : 1
    const velCoef = tc * Math.pow(cfg.damping, dt * 60)
    const accCoef = dt * dt

    nodes[last].fixed = dragging.value

    for (let i = 1; i < nodes.length; i++) {
      const p = nodes[i]
      if (p.fixed) continue
      const vx = p.x - p.ox
      const vy = p.y - p.oy
      p.ox = p.x
      p.oy = p.y
      p.x += vx * velCoef
      p.y += vy * velCoef + cfg.gravity * accCoef
    }

    nodes[0].x = ANCHOR_X
    nodes[0].y = 0

    if (dragging.value) {
      const rawX = cursorDelta.x
      const rawY = props.cordLength + cursorDelta.y
      
      let absoluteX = rawX
      let absoluteY = rawY
      
      if (!clicked.value) {
        const cursorDist = Math.hypot(absoluteX, absoluteY) || 1e-4
        if (cursorDist > props.cordLength) {
          // Fase de tensión: solo la porción de "estiramiento" sufre resistencia
          const stretchRequested = cursorDist - props.cordLength
          const stretchActual = stretchRequested * 0.30
          const knobDist = props.cordLength + stretchActual
          absoluteX = rawX * (knobDist / cursorDist)
          absoluteY = rawY * (knobDist / cursorDist)
        }
      } else {
        if (Math.abs(escapeOffset.x) > 0.1 || Math.abs(escapeOffset.y) > 0.1) {
          const decay = Math.pow(0.70, dt * 60)
          escapeOffset.x *= decay
          escapeOffset.y *= decay
        } else {
          escapeOffset.x = 0
          escapeOffset.y = 0
        }
        
        // Simular un resorte para el "surge" (sobreimpulso de latigazo)
        const springForce = -surge.val * 250
        const dampForce = -surge.vel * 15
        surge.vel += (springForce + dampForce) * dt
        surge.val += surge.vel * dt

        absoluteX -= escapeOffset.x
        absoluteY -= escapeOffset.y - surge.val
      }
      
      const dist = Math.hypot(absoluteX, absoluteY) || 1e-4
      // Permite que la cuerda se estire libremente mucho más después del quiebre
      const currentStretchMax = clicked.value ? cfg.stretchMax * cfg.breakMultiplier : cfg.stretchMax
      const maxD = props.cordLength + currentStretchMax
      const k = dist > maxD ? maxD / dist : 1
      
      target.x = ANCHOR_X + absoluteX * k
      target.y = absoluteY * k
      
      if (!clicked.value) {
        const clickAt = Math.min(cfg.stretchToggle, cfg.stretchMax - 1)
        if (dist - props.cordLength >= clickAt) {
          clicked.value = true
          if (props.sound) {
            try { play('toggle') } catch(e) {}
          }
          doToggle()
          escapeOffset.x = rawX - absoluteX
          escapeOffset.y = rawY - absoluteY
          
          // Inyectar un latigazo hacia abajo masivo al romperse
          surge.vel = cfg.surgeVelocity 
        }
      }

      nodes[last].ox = nodes[last].x
      nodes[last].oy = nodes[last].y
      nodes[last].x = target.x
      nodes[last].y = target.y
    }

    const restSeg = props.cordLength / SEGMENTS
    for (let k = 0; k < cfg.iterations; k++) {
      for (let i = 0; i < last; i++) {
        const a = nodes[i]
        const b = nodes[i + 1]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 1e-4
        const diff = (restSeg - dist) / dist * 0.5
        const ox = dx * diff
        const oy = dy * diff
        if (!a.fixed) {
          a.x -= ox
          a.y -= oy
        }
        if (!b.fixed) {
          b.x += ox
          b.y += oy
        }
      }
    }

    prevDt = dt
    cordPath.value = buildPath(nodes)

    // Compute velocity of the knob for kinetic effect
    const kvx = (nodes[last].x - nodes[last].ox) / dt
    const kvy = (nodes[last].y - nodes[last].oy) / dt
    lastKnobVelocity.x = kvx
    lastKnobVelocity.y = kvy
    
    let speed = 0
    for (let i = 1; i < nodes.length; i++) {
      speed += Math.abs(nodes[i].x - nodes[i].ox) + Math.abs(nodes[i].y - nodes[i].oy)
    }

    // Update kinetic tail and scale
    if (props.variant === 'kinetic') {
      const v = Math.hypot(kvx, kvy)
      if (v > 2) { // slider threshold
        const st = Math.min(0.1, v * 0.0002) // stretch (0.1 max, factor 0.0002)
        const sq = 1 / (1 + st * 0.65) // squish
        // rotation angle based on velocity
        const angle = Math.atan2(kvy, kvx) * (180 / Math.PI) - 90
        kineticScale.value = `rotate(${angle}) scale(${sq}, ${1 + st})`
      } else {
        kineticScale.value = `scale(1, 1)`
      }

      // Update tail using a spring towards knob
      const stiffness = 200
      const damping = 20
      
      const tx = nodes[last].x - kineticTail.x
      const ty = nodes[last].y - kineticTail.y
      
      const ax = tx * stiffness - kineticTail.vx * damping
      const ay = ty * stiffness - kineticTail.vy * damping
      
      kineticTail.vx += ax * dt
      kineticTail.vy += ay * dt
      kineticTail.x += kineticTail.vx * dt
      kineticTail.y += kineticTail.vy * dt
      
      // Clamp lag distance
      let lagX = kineticTail.x - nodes[last].x
      let lagY = kineticTail.y - nodes[last].y
      const lagDist = Math.hypot(lagX, lagY)
      if (lagDist > scaledMaxLag.value) {
        lagX = (lagX / lagDist) * scaledMaxLag.value
        lagY = (lagY / lagDist) * scaledMaxLag.value
      }
      
      // Interpolate tail circles along the lag vector
      for (let i = 0; i < scaledTailRadii.value.length; i++) {
        const fraction = (i + 1) / scaledTailRadii.value.length
        tailPositions[i].x = nodes[last].x + lagX * fraction
        tailPositions[i].y = nodes[last].y + lagY * fraction
      }
    }

    if (!dragging.value && speed < cfg.sleepVelocity * dt * 60) {
      channel.active = false
    }
  }
}

function wake() {
  if (channel.active) return
  channel.active = true
  prevDt = 0
  motionLoop.add(channel)
}

function doToggle() {
  emit('pull')
}

function scriptedPull() {
  if (props.sound) {
    try { play('toggle') } catch(e) {}
  }
  doToggle()
  const last = nodes.length - 1
  nodes[last].oy -= 22
  wake()
}

let startY = 0
let startX = 0

function onPanStart(e) {
  e.preventDefault()
  dragging.value = true
  didDrag.value = false
  clicked.value = false
  
  startX = e.clientX
  startY = e.clientY
  cursorDelta.x = 0
  cursorDelta.y = 0
  escapeOffset.x = 0
  escapeOffset.y = 0
  
  const last = nodes.length - 1
  target.x = nodes[last].x
  target.y = nodes[last].y
  
  window.addEventListener('pointermove', onPan)
  window.addEventListener('pointerup', onPanEnd)
  window.addEventListener('pointercancel', onPanEnd)
  
  if (knobEl.value) knobEl.value.style.cursor = 'grabbing'
  wake()
}

function onPan(e) {
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!didDrag.value && Math.hypot(dx, dy) > 4) {
    didDrag.value = true
  }
  if (didDrag.value) {
    cursorDelta.x = dx
    cursorDelta.y = dy
  }
}

function onPanEnd() {
  window.removeEventListener('pointermove', onPan)
  window.removeEventListener('pointerup', onPanEnd)
  window.removeEventListener('pointercancel', onPanEnd)
  
  dragging.value = false
  if (knobEl.value) knobEl.value.style.cursor = 'grab'
  
  const last = nodes.length - 1
  const p = nodes[last]
  const vx = p.x - p.ox
  const vy = p.y - p.oy
  const v = Math.hypot(vx, vy)
  
  if (v > cfg.maxVelocity) {
    const k = cfg.maxVelocity / v
    p.ox = p.x - vx * k
    p.oy = p.y - vy * k
  }
  
  wake()
  requestAnimationFrame(() => didDrag.value = false)
}

function onClick(e) {
  if (didDrag.value) return
  if (e.detail === 0) return
  scriptedPull()
}

function onKeyDown(e) {
  if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
    e.preventDefault()
    scriptedPull()
  }
}

onMounted(() => {
  if (!props.noEntrance) {
    wake()
  }
})

watch(() => props.cordLength, (newLen) => {
  const newNodes = makeNodes(newLen, true)
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].x = newNodes[i].x
    nodes[i].y = newNodes[i].y
    nodes[i].ox = newNodes[i].ox
    nodes[i].oy = newNodes[i].oy
  }
  target.y = newLen
  kineticTail.y = newLen
  kineticTail.vy = 0
  for (let tp of tailPositions) tp.y = newLen
  cordPath.value = buildPath(nodes)
  wake()
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPan)
  window.removeEventListener('pointerup', onPanEnd)
  window.removeEventListener('pointercancel', onPanEnd)
  channel.active = false
  motionLoop.remove(channel)
})
</script>

<style src="./PullCord.css"></style>
