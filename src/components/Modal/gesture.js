/**
 * Drag to dismiss. The top dialog can be pulled; past a distance or velocity
 * threshold it closes. Otherwise it springs back. Sheet placement only
 * counts a downward pull.
 */

import { motionOf } from '../../core/motion/element.js'
import { gsap } from 'gsap'

const IGNORE = 'input, textarea, select, button, a, [contenteditable="true"], p, h1, h2, h3, h4, h5, h6, span, .apr-title, .apr-description'

const physicsConfig = {
    factor2D: 1.5,
    factor3D: 0.15,
    clamp2D: 20,
    clamp3D: 30,
    dynScale2D: 300,
    dynScale3D: 300,
    dynMinSize: 150,
    dragStiffness: 200,
    dragDamping: 10,
    rotStiffness: 100,
    rotDamping: 10,
    pointerSmoothing: 0.2,
    stiffness: 150,
    damping: 12,
    massMultiplier: 1.5,
    massInfluenceSmall: 0.05,
    massInfluenceLarge: 0.70,
}

export function attachDismissGesture({
    dialog,
    item,
    store,
    placement,
    origin,
    isBusy,
    onPull,
}) {
    let pointerId = null
    let startX = 0, startY = 0
    let lastX = 0, lastY = 0
    let currentX = 0, currentY = 0
    let smoothedVx = 0, smoothedVy = 0
    let anchorX = 0, anchorY = 0
    let lastT = 0
    let normalizedMass = 1
    let rafId = 0
    let dragging = false
    let pulling = false
    // velocity tracking for fling detection
    let rawVx = 0, rawVy = 0

    const mode = item.physics || 'none' // '2d', '3d', 'both', 'none'

    function towardOrigin(dx, dy) {
        if (!(origin instanceof HTMLElement) || !origin.isConnected) {
            return dy
        }
        const originRect = origin.getBoundingClientRect()
        const dialogRect = dialog.getBoundingClientRect()
        const ox = (originRect.left + originRect.width / 2) - (dialogRect.left + dialogRect.width / 2 - dx)
        const oy = (originRect.top + originRect.height / 2) - (dialogRect.top + dialogRect.height / 2 - dy)
        const length = Math.hypot(ox, oy) || 1
        return (dx * ox + dy * oy) / length
    }

    function progress(dx, dy) {
        if (placement === 'bottom') return Math.max(0, dy)
        return Math.max(Math.max(0, dy), towardOrigin(dx, dy), Math.hypot(dx, dy) * 0.45)
    }

    const physicsTick = (time) => {
        if (!dragging) return

        const dt = Math.max(0.008, (time - lastT) / 1000)
        lastT = time

        const dx = currentX - startX
        const dy = currentY - startY

        if (item.mode === 'flip') {
            const distance = Math.hypot(dx, dy)
            const maxDistance = 500
            const scaleAmount = 1 - Math.min(0.15, (distance / maxDistance) * 0.15)
            
            gsap.to(dialog, {
                x: dx,
                y: dy,
                scale: scaleAmount,
                duration: 0.15,
                ease: "power2.out",
                overwrite: "auto"
            })
            rafId = requestAnimationFrame(physicsTick)
            return
        }

        const instVx = (currentX - lastX) / dt
        const instVy = (currentY - lastY) / dt
        rawVx = instVx
        rawVy = instVy

        lastX = currentX
        lastY = currentY

        const speed = Math.hypot(instVx, instVy)
        const baseSmoothing = physicsConfig.pointerSmoothing
        const smoothing = Math.max(0.1, Math.min(0.9, baseSmoothing * (50 / (speed + 10))))

        smoothedVx = smoothedVx * smoothing + instVx * (1 - smoothing)
        smoothedVy = smoothedVy * smoothing + instVy * (1 - smoothing)

        const width = dialog.offsetWidth
        const height = dialog.offsetHeight
        const diag = Math.hypot(width, height)

        const scale2D = physicsConfig.dynScale2D
        const scale3D = physicsConfig.dynScale3D
        const minSize = physicsConfig.dynMinSize

        const clamp2D = physicsConfig.clamp2D * (scale2D / Math.max(minSize, diag))
        const clamp3D_X = physicsConfig.clamp3D * (scale3D / Math.max(minSize, height))
        const clamp3D_Y = physicsConfig.clamp3D * (scale3D / Math.max(minSize, width))

        const rotationMass = normalizedMass * 10

        let rotateZ = 0, rotateX = 0, rotateY = 0

        if (mode !== 'none' && placement !== 'bottom') {
            const torqueZ = (anchorX * smoothedVy - anchorY * smoothedVx) / 1000
            rotateZ = (torqueZ / rotationMass) * physicsConfig.factor2D
            rotateZ = Math.max(-clamp2D, Math.min(clamp2D, rotateZ))

            rotateY = (smoothedVx / rotationMass) * physicsConfig.factor3D
            rotateX = -(smoothedVy / rotationMass) * physicsConfig.factor3D
            rotateY = Math.max(-clamp3D_Y, Math.min(clamp3D_Y, rotateY))
            rotateX = Math.max(-clamp3D_X, Math.min(clamp3D_X, rotateX))

            if (mode === '3d') rotateZ = 0
            if (mode === '2d') { rotateX = 0; rotateY = 0 }
        }

        const sqrtMass = Math.sqrt(normalizedMass)
        const targetX = placement === 'bottom' ? 0 : dx
        const targetY = placement === 'bottom' ? Math.max(0, dy) : dy

        motionOf(dialog).to({ x: targetX, y: targetY }, {
            spring: {
                stiffness: physicsConfig.dragStiffness,
                damping: physicsConfig.dragDamping * sqrtMass,
                mass: normalizedMass
            }
        })

        if (mode !== 'none' && placement !== 'bottom') {
            motionOf(dialog).to({ rotateZ, rotateX, rotateY }, {
                spring: {
                    stiffness: physicsConfig.rotStiffness,
                    damping: physicsConfig.rotDamping * sqrtMass,
                    mass: normalizedMass
                }
            })
        }

        rafId = requestAnimationFrame(physicsTick)
    }

    function onPointerDown(event) {
        if (item.mode === 'flip') return
        if (event.button != null && event.button !== 0) return
        const current = store.get(item.id) ?? item
        if (isBusy?.() || current.gesture === false) return
        if (event.target instanceof Element && event.target.closest(IGNORE)) return
        const scroller = event.target instanceof Element
            ? event.target.closest('.apr-body, .apr-card')
            : null
        if (scroller && scroller.scrollTop > 0 && placement === 'bottom') return

        pointerId = event.pointerId
        startX = lastX = currentX = event.clientX
        startY = lastY = currentY = event.clientY
        lastT = performance.now()
        smoothedVx = 0
        smoothedVy = 0
        rawVx = 0
        rawVy = 0

        const dialogRect = dialog.getBoundingClientRect()
        anchorX = event.clientX - (dialogRect.left + dialogRect.width / 2)
        anchorY = event.clientY - (dialogRect.top + dialogRect.height / 2)

        const area = dialogRect.width * dialogRect.height
        const rawNormalizedMass = Math.max(0.01, area / 85000)
        const power = rawNormalizedMass < 1 ? physicsConfig.massInfluenceSmall : physicsConfig.massInfluenceLarge
        normalizedMass = Math.pow(rawNormalizedMass, power) * physicsConfig.massMultiplier

        if (dialog.parentElement && mode !== 'none' && placement !== 'bottom') {
            dialog.parentElement.style.perspective = '1200px'
        }

        dragging = true
        pulling = false
        rafId = requestAnimationFrame(physicsTick)
    }

    function onPointerMove(event) {
        if (!dragging || event.pointerId !== pointerId) return
        
        currentX = event.clientX
        currentY = event.clientY

        const dx = currentX - startX
        const dy = currentY - startY
        if (!pulling) {
            const selection = window.getSelection()
            if (selection && selection.toString().length > 0 && dialog.contains(selection.anchorNode)) {
                dragging = false
                return
            }
            if (Math.hypot(dx, dy) < 8) return
            pulling = true
            onPull?.(true)
            dialog.setPointerCapture?.(pointerId)
            dialog.style.userSelect = 'none'
            dialog.style.webkitUserSelect = 'none'
        }
        
        event.preventDefault()
    }

    function onPointerUp(event) {
        if (!dragging || event.pointerId !== pointerId) return
        dragging = false
        cancelAnimationFrame(rafId)
        
        const dx = event.clientX - startX
        const dy = event.clientY - startY
        const pulled = progress(dx, dy)
        const flung = placement === 'bottom'
            ? rawVy > 900
            : (Math.hypot(rawVx, rawVy) > 1100 && pulled > 24)

        if (pulling) {
            dialog.releasePointerCapture?.(pointerId)
            dialog.style.userSelect = ''
            dialog.style.webkitUserSelect = ''
        }
        pointerId = null
        onPull?.(false)

        const current = store.get(item.id) ?? item
        if (pulling && (pulled > 88 || flung) && current.dismissible !== false) {
            pulling = false
            store.close(item.id)
            return
        }

        if (pulling) {
            if (item.mode === 'flip') {
                gsap.to(dialog, {
                    x: 0,
                    y: 0,
                    scale: 1,
                    duration: 0.4,
                    ease: "back.out(1.2)",
                    overwrite: "auto"
                })
            } else {
                const sqrtMass = Math.sqrt(normalizedMass)
                motionOf(dialog).to({ x: 0, y: 0, rotateZ: 0, rotateX: 0, rotateY: 0 }, {
                    spring: { 
                        stiffness: physicsConfig.stiffness, 
                        damping: physicsConfig.damping * sqrtMass, 
                        mass: normalizedMass 
                    },
                })
            }
        }
        pulling = false
    }

    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('pointermove', onPointerMove)
    dialog.addEventListener('pointerup', onPointerUp)
    dialog.addEventListener('pointercancel', onPointerUp)

    return () => {
        cancelAnimationFrame(rafId)
        dialog.removeEventListener('pointerdown', onPointerDown)
        dialog.removeEventListener('pointermove', onPointerMove)
        dialog.removeEventListener('pointerup', onPointerUp)
        dialog.removeEventListener('pointercancel', onPointerUp)
    }
}
