/**
 * The host: builds the DOM, runs the morph, owns focus and the overlay.
 *
 * Vanilla on purpose. A framework adapter would render the same tree and call
 * the same enter/leave; until then this is the whole surface.
 */

import { fillBody } from './card.js'
import { createPageLock, focusFirst } from './lock.js'
import { morphFromOrigin, morphToOrigin, hideOrigin, restoreOrigin, MORPH_DEFAULTS } from './morph.js'
import { gsapMorphFromOrigin, gsapMorphToOrigin } from './gsap-morph.js'
import { motionOf, killMotion } from '../../core/motion/element.js'
import { createMotion, spring } from '../../core/motion/engine.js'
import { Easing, springEase } from '../../core/motion/easing.js'
import { prefersReducedMotion } from './env.js'
import { resolveMorph, applySize } from './presets.js'
import { layoutSlot, resolvePlacement, trackOrigin, createSlotFollow } from './placement.js'
import { attachDismissGesture } from './gesture.js'

export const HOST_DEFAULTS = {
    overlayDuration: 0.35,
    enterDuration: 0.5,
    enterDistance: 16,
    enterScale: 0.94,
    enterBlur: 8,
    exitDuration: 0.28,
    exitDistance: 10,
    exitBlur: 4,
    underScale: 0.96,
    underY: 10,
    underDuration: 0.4,
    underSpring: { stiffness: 180, damping: 22, velocity: 0 },
    placementGap: 8,
    placementPadding: 16,
    // Constante de tiempo (segundos) con la que el modal persigue al trigger
    // cuando la pagina se scrollea. `0` devuelve la escritura directa de antes.
    placementFollow: 0.25,
    morph: MORPH_DEFAULTS,
}

// Lo que tarda en apagarse una copia que se va sin vuelo de vuelta (el mismo
// modal volviendo a abrirse encima). Corto a proposito: el modal nuevo ya esta
// entrando, asi que esto tiene que leerse como que la copia de atras se
// disuelve, no como una salida.
const VANISH_DURATION = 0.14

function canMorphFrom(origin) {
    return origin instanceof HTMLElement
        && origin.isConnected
        && !prefersReducedMotion()
        && origin.getBoundingClientRect().width > 0
}

export function createModalHost({ store, options = {}, mountTo = 'body' } = {}) {
    const config = {
        ...HOST_DEFAULTS,
        ...options,
        morph: { ...MORPH_DEFAULTS, ...(options.morph ?? {}) },
        underSpring: { ...HOST_DEFAULTS.underSpring, ...(options.underSpring ?? {}) },
    }
    const lock = createPageLock()
    const nodes = new Map()

    // Quien es el dueño del nodo de contenido vivo, por elemento.
    //
    // El mismo div lo pasan todos los modales del wrapper, asi que "esta dentro
    // de mi body" no sirve para decidir de quien es: hay que decirlo. Sin este
    // mapa, `refresh()` le volvia a robar el nodo al modal nuevo (le rompia el
    // contenido y se quedaba con el de al lado).
    const contentOwner = new Map()

    // Timers del apagon, por item: el desmonte los limpia para no dejar un
    // `teardownNode` de mas esperando detras de un item que ya no existe.
    const vanishTimers = new Map()

    const enterEase = springEase(0.58, -3.5)
    let layer = null

    // Propiedades inline que escribe un motor de morph. Una copia visual que
    // las herede se queda invisible (opacity 0) o deformada (scale/blur).
    const SNAPSHOT_SKIP = [
        'opacity',
        'filter',
        'transform',
        'transformOrigin',
        'transition',
        'willChange',
    ]

    // Copia visual del contenido, tal y como se ve AHORA.
    //
    // Se toma cuando el contenido es de este modal y todavia no lo ha tocado
    // ningun motor. Es la unica fuente fiable del contenido viejo: cuando el
    // modal siguiente esta abriendo, Vue ya ha re-renderizado el nodo vivo con
    // el contenido nuevo, asi que clonarlo entonces da el texto equivocado.
    function captureSnapshot(item) {
        if (!(item.content instanceof HTMLElement)) return null

        const copy = item.content.cloneNode(true)

        for (const el of [copy, ...copy.querySelectorAll('*')]) {
            for (const property of SNAPSHOT_SKIP) {
                el.style[property] = ''
            }
        }

        return copy
    }
    let unsubscribe = null
    let onRemoved = null

    function configure(patch = {}) {
        const { morph, underSpring, ...rest } = patch
        Object.assign(config, rest)
        if (morph) Object.assign(config.morph, morph)
        if (underSpring) Object.assign(config.underSpring, underSpring)
    }

    function morphFor(item) {
        return resolveMorph(item?.morph, config.morph)
    }

    function targetOf() {
        if (mountTo instanceof HTMLElement) return mountTo
        return document.querySelector(mountTo) ?? document.getElementById('app') ?? document.body
    }

    function ensureMounted() {
        if (layer || typeof document === 'undefined') return
        layer = document.createElement('div')
        layer.className = 'apr-layer'
        layer.setAttribute('aria-live', 'off')
        targetOf().append(layer)
        document.addEventListener('keydown', onKeyDown)
    }

    function onKeyDown(event) {
        if (event.key !== 'Escape') return
        const top = [...store.getItems()].reverse().find((item) => !item.closing)
        if (!top || !top.dismissible) return
        event.preventDefault()
        store.close(top.id)
    }

    function liveNodes() {
        return store.getItems()
            .filter((item) => !item.closing)
            .map((item) => ({ item, node: nodes.get(item.id) }))
            .filter((entry) => entry.node)
    }

    function restack({ skipId = null } = {}) {
        const live = liveNodes()
        live.forEach(({ item, node }, index) => {
            const top = index === live.length - 1
            node.itemEl.inert = !top
            if (item.id === skipId || node.morphing || node.dragging) return
            motionOf(node.dialog).to(
                top ? { scale: 1, y: 0 } : { scale: config.underScale, y: config.underY },
                { spring: config.underSpring },
            )
        })
    }

    function fadeOverlay(overlay, opacity, duration = config.overlayDuration) {
        motionOf(overlay).to({ opacity }, {
            duration: prefersReducedMotion() ? 0 : duration,
            ease: Easing.easeOutCubic,
        })
    }

    function slideIn(dialog, done) {
        const motion = motionOf(dialog)
        motion.set({
            y: config.enterDistance,
            scale: config.enterScale,
            opacity: 0,
            blur: config.enterBlur,
        })
        motion.to({ y: 0, scale: 1, opacity: 1, blur: 0 }, {
            duration: config.enterDuration,
            ease: enterEase,
            onComplete: done,
        })
    }

    function slideOut(dialog, done) {
        const motion = motionOf(dialog)
        motion.kill()
        motion.to({
            y: motion.get('y') + config.exitDistance,
            scale: Math.min(config.enterScale, 0.92),
            opacity: 0,
            blur: config.exitBlur,
        }, {
            duration: config.exitDuration,
            ease: Easing.easeInCubic,
            onComplete: done,
        })
    }

    function place(node, item) {
        const placement = resolvePlacement(item.placement, item.origin)
        node.placement = placement
        applySize(node.dialog, item.size)
        if (placement === 'bottom' && item.size == null) {
            node.dialog.style.setProperty('--apr-max-width', 'min(480px, calc(100vw - 24px))')
        }
        layoutSlot(node.dialog, node.itemEl, item.origin, placement, {
            gap: config.placementGap,
            padding: config.placementPadding,
        })
    }

    function bindAria(dialog, body, item) {
        dialog.removeAttribute('aria-labelledby')
        dialog.removeAttribute('aria-label')
        if (item.labelledBy) {
            dialog.setAttribute('aria-labelledby', item.labelledBy)
            return
        }
        const title = body.querySelector('.apr-title')
        if (title?.id) dialog.setAttribute('aria-labelledby', title.id)
        else if (item.ariaLabel) dialog.setAttribute('aria-label', item.ariaLabel)
        else if (item.title) dialog.setAttribute('aria-label', item.title)
    }

    function startTracking(node, item) {
        node.untrack?.()
        node.untrack = null
        node.follow?.stop()
        node.follow = null
        if (!item.origin) return

        // El seguidor persigue el rect del origin en vez de escribirlo de una.
        // Vive en `placement.js` (es el dueno del slot) y solo toca left/top.
        const follow = createSlotFollow({
            dialog: node.dialog,
            itemEl: node.itemEl,
            read: () => ({
                placement: node.placement,
                gap: config.placementGap,
                padding: config.placementPadding,
                tau: config.placementFollow,
            }),
            isBusy: () => node.leaving
                || node.morphing
                || node.dragging
                || !!node.sizeMotion,
        })
        node.follow = follow

        node.untrack = trackOrigin(item.origin, () => {
            if (node.leaving) {
                if (node.closeTarget) {
                    const parentEl = node.closeTarget.closest('.apr-item')
                    if (parentEl && store.get(Number(parentEl.dataset.aprId))?.closing) {
                        node.untrack?.()
                        node.untrack = null
                        // El vuelo se aborta: no queda destino que perseguir.
                        node.follow?.stop()
                        if (node.morph?.abort) {
                            node.morph.abort()
                            return
                        }
                    }
                }
                node.morph?.retarget(node.closeTarget)
                return
            }
            if (node.placement === 'center') return
            if (node.morphing || node.dragging) return
            const current = store.get(item.id)
            if (!current || current.closing) return
            // La medida se hace aqui y no dentro de `layoutSlot` para que el
            // seguidor reciba el rect vivo. Con `placementFollow: 0` el
            // resultado es exactamente la escritura directa de siempre.
            follow.setTarget(current.origin.getBoundingClientRect())
        })
    }

    function attachGesture(node, item) {
        node.detachGesture?.()
        node.detachGesture = null
        const current = store.get(item.id) ?? item
        if (current.gesture === false) return
        node.detachGesture = attachDismissGesture({
            dialog: node.dialog,
            item,
            store,
            placement: node.placement,
            origin: item.origin,
            isBusy: () => node.morphing || node.leaving,
            onPull: (active) => { node.dragging = active },
        })
    }

    const LAYOUT_KEYS = ['apr-title', 'apr-description', 'apr-input', 'apr-actions']
    const SIZE_SPRING = { stiffness: 180, damping: 22, velocity: 0, restDelta: 0.5, restSpeed: 4 }

    function rectOf(el, shellRect) {
        const r = el.getBoundingClientRect()
        return {
            width: r.width,
            height: r.height,
            top: r.top - shellRect.top,
            left: r.left - shellRect.left,
        }
    }

    function snapshotLayout(body, shell) {
        const shellRect = shell.getBoundingClientRect()
        const shot = {}
        for (const key of LAYOUT_KEYS) {
            const el = body.querySelector(`.${key}`)
            if (el) shot[key] = rectOf(el, shellRect)
        }
        if (Object.keys(shot).length > 0) return shot
        const card = body.querySelector('.apr-card') ?? body
            ;[...card.children].forEach((el, i) => {
                shot[`n${i}`] = rectOf(el, shellRect)
            })
        return shot
    }

    function findLayoutEl(body, key) {
        if (!key.startsWith('n')) return body.querySelector(`.${key}`)
        const card = body.querySelector('.apr-card') ?? body
        return card.children[Number(key.slice(1))] ?? null
    }

    function pinContent(node, width) {
        const body = node.body
        body.style.alignSelf = 'flex-start'
        body.style.width = `${width}px`
        body.style.flex = '0 0 auto'
    }

    function unpinContent(node) {
        const body = node.body
        body.style.alignSelf = ''
        body.style.width = ''
        body.style.flex = ''
    }

    function unpinLayout(node) {
        for (const el of node.layoutPins ?? []) {
            el.style.height = ''
            el.style.overflow = ''
            el.style.flexShrink = ''
            el.style.boxSizing = ''
            el.style.transform = ''
        }
        node.layoutPins = []
    }

    function stopSizeMotion(node) {
        node.sizeMotion?.stop()
        node.sizeMotion = null
        unpinContent(node)
        unpinLayout(node)
    }

    function clearShellSize(node) {
        node.shell.style.width = ''
        node.shell.style.height = ''
    }

    function relayout(node) {
        if (node.placement === 'center' || node.leaving || !node.origin) return
        layoutSlot(node.dialog, node.itemEl, node.origin, node.placement, {
            gap: config.placementGap,
            padding: config.placementPadding,
        })
    }

    function measureTargets(node) {
        const shell = node.shell
        const prevWidth = shell.style.width
        const prevHeight = shell.style.height
        shell.style.width = ''
        shell.style.height = ''
        const rect = shell.getBoundingClientRect()
        const layout = snapshotLayout(node.body, shell)
        shell.style.width = prevWidth
        shell.style.height = prevHeight
        return { width: rect.width, height: rect.height, layout }
    }

    function pinLayoutEl(el, height) {
        el.style.boxSizing = 'border-box'
        el.style.height = `${height}px`
        el.style.overflow = 'hidden'
        el.style.flexShrink = '0'
    }

    function springHeight(node, from, fromLayout = {}) {
        stopSizeMotion(node)
        const shell = node.shell
        const body = node.body
        const to = measureTargets(node)
        const keys = new Set([...Object.keys(fromLayout), ...Object.keys(to.layout)])

        const heightHops = []
        for (const key of keys) {
            const el = findLayoutEl(body, key)
            const prev = fromLayout[key]
            const next = to.layout[key]
            if (!el || !next) continue
            const start = prev?.height ?? 0
            if (Math.abs(start - next.height) < 1) continue
            heightHops.push({ el, key, from: start, to: next.height })
        }

        const sizeChanged = Math.abs(from.width - to.width) >= 1
            || Math.abs(from.height - to.height) >= 1
        if (!sizeChanged && heightHops.length === 0) {
            clearShellSize(node)
            return
        }

        if (prefersReducedMotion()) {
            clearShellSize(node)
            relayout(node)
            return
        }

        pinContent(node, to.width)
        node.layoutPins = []
        for (const hop of heightHops) {
            pinLayoutEl(hop.el, hop.from)
            node.layoutPins.push(hop.el)
        }

        void body.offsetHeight
        const shellRect = shell.getBoundingClientRect()
        const shiftHops = []
        for (const key of keys) {
            const el = findLayoutEl(body, key)
            const prev = fromLayout[key]
            if (!el || !prev) continue
            const now = rectOf(el, shellRect)
            const dx = prev.left - now.left
            const dy = prev.top - now.top
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
            if (!node.layoutPins.includes(el)) node.layoutPins.push(el)
            shiftHops.push({ el, key, x: dx, y: dy })
        }

        shell.style.width = `${from.width}px`
        shell.style.height = `${from.height}px`

        const initial = { width: from.width, height: from.height }
        const targets = { width: to.width, height: to.height }
        const heights = Object.fromEntries(heightHops.map((hop) => [`h:${hop.key}`, hop.el]))
        const shifts = new Map()
        for (const hop of heightHops) {
            initial[`h:${hop.key}`] = hop.from
            targets[`h:${hop.key}`] = hop.to
        }
        for (const hop of shiftHops) {
            initial[`x:${hop.key}`] = hop.x
            initial[`y:${hop.key}`] = hop.y
            targets[`x:${hop.key}`] = 0
            targets[`y:${hop.key}`] = 0
            shifts.set(hop.el, { x: hop.x, y: hop.y })
            hop.el.style.transform = `translate(${hop.x}px, ${hop.y}px)`
        }

        const shiftByChannel = {}
        for (const hop of shiftHops) {
            shiftByChannel[`x:${hop.key}`] = hop.el
            shiftByChannel[`y:${hop.key}`] = hop.el
        }

        const pending = new Set()
        for (const key of Object.keys(targets)) {
            if (initial[key] !== targets[key]) pending.add(key)
        }

        if (pending.size === 0) {
            clearShellSize(node)
            relayout(node)
            return
        }

        const hop = spring(SIZE_SPRING)
        const transitions = Object.fromEntries([...pending].map((key) => [key, hop]))
        const motion = createMotion(initial, {
            onChange(key, value) {
                if (key === 'width' || key === 'height') {
                    shell.style[key] = `${value}px`
                } else if (key.startsWith('h:')) {
                    heights[key].style.height = `${value}px`
                } else {
                    const el = shiftByChannel[key]
                    const state = el && shifts.get(el)
                    if (state) {
                        if (key.startsWith('x:')) state.x = value
                        else state.y = value
                        el.style.transform = `translate(${state.x}px, ${state.y}px)`
                    }
                }
                relayout(node)
            },
            onSettle(key) {
                pending.delete(key)
                if (pending.size > 0 || node.sizeMotion !== motion) return
                stopSizeMotion(node)
                clearShellSize(node)
                relayout(node)
            },
        })
        node.sizeMotion = motion
        motion.animate(targets, transitions)
    }

    function springLayoutShift(node, fromWidth, fromHeight, toWidth, toHeight) {
        stopSizeMotion(node)
        const shell = node.shell

        shell.style.width = `${fromWidth}px`
        shell.style.height = `${fromHeight}px`

        const initial = { width: fromWidth, height: fromHeight }
        const targets = { width: toWidth, height: toHeight }

        const pending = new Set()
        if (initial.width !== targets.width) pending.add('width')
        if (initial.height !== targets.height) pending.add('height')

        if (pending.size === 0) {
            clearShellSize(node)
            node.lastWidth = shell.getBoundingClientRect().width
            node.lastHeight = shell.getBoundingClientRect().height
            return
        }

        const hop = spring(SIZE_SPRING)
        const transitions = { width: hop, height: hop }

        const motion = createMotion(initial, {
            onChange(key, value) {
                shell.style[key] = `${value}px`
            },
            onSettle(key) {
                pending.delete(key)
                if (pending.size > 0 || node.sizeMotion !== motion) return
                stopSizeMotion(node)
                clearShellSize(node)

                // Cache final size to prevent ResizeObserver loops
                node.lastWidth = shell.getBoundingClientRect().width
                node.lastHeight = shell.getBoundingClientRect().height
            },
        })
        node.sizeMotion = motion
        motion.animate(targets, transitions)
    }

    function refresh(item) {
        const node = nodes.get(item.id)
        if (!node || node.leaving || node.morphing) return
        if (node.rev === item.rev) return
        node.rev = item.rev

        const fromLayout = snapshotLayout(node.body, node.shell)
        const from = {
            width: node.shell.getBoundingClientRect().width,
            height: node.shell.getBoundingClientRect().height,
        }
        node.shell.style.width = `${from.width}px`
        node.shell.style.height = `${from.height}px`

        // El body solo se reconstruye si el contenido sigue siendo nuestro. Si
        // otro modal se lo llevo, `fillBody` se lo ROBARIA otra vez (dejando al
        // nuevo con el shell vacio) y encima mostraria aqui el contenido ajeno.
        const contentIsMine =
            !(item.content instanceof HTMLElement) ||
            contentOwner.get(item.content) === item.id

        if (contentIsMine && !(item.content instanceof HTMLElement && node.body.contains(item.content))) {
            node.cleanupContent?.()
            node.body.replaceChildren()
            const close = (result) => store.close(item.id, result)
            node.cleanupContent = fillBody(node.body, item, { close, id: item.id })
            bindAria(node.dialog, node.body, item)
            node.snapshot = captureSnapshot(item)
        }

        node.origin = item.origin
        place(node, item)
        startTracking(node, item)
        attachGesture(node, item)
        springHeight(node, from, fromLayout)
    }

    // El contenido que este modal va a usar puede estar todavia dentro de otro
    // modal vivo (se abrio antes y sigue cerrrandose). El nodo VIVO pasa al
    // modal nuevo -- es el que interactua, y una copia perderia los listeners
    // del framework -- y el viejo se queda con una copia visual y suelta el
    // contenido: deja de escribir en nodos que ya no son suyos.
    // Suelta el nodo vivo al EMPEZAR el cierre: la copia visual ocupa su sitio
    // en la card y el vivo vuelve a su staging.
    //
    // Tiene que pasar antes de que el motor de cierre mida (`collectGhostSpecs`),
    // o el vuelo de salida dibujaria el contenido que ya es del modal nuevo.
    function releaseContent(node, item) {
        if (!(item.content instanceof HTMLElement)) return
        if (contentOwner.get(item.content) !== item.id) return

        const card = node.body.querySelector('.apr-card')

        if (card && item.content.parentNode === card) {
            if (node.snapshot && node.snapshot.parentNode !== card) {
                card.insertBefore(node.snapshot, item.content)
            }

            // Devuelve el vivo a su padre original (el staging del wrapper). El
            // guard de `card.js` hace que la llamada posterior de `finish()` sea
            // un no-op.
            node.cleanupContent?.()
        }

        contentOwner.delete(item.content)
    }

    // Red de seguridad: el contenido de este modal todavia esta dentro de otro
    // modal vivo que NO se esta cerrando (apertura con `beforeClose` diferido, o
    // un `open()` crudo sin cerrar el anterior). El dueño se queda con SU copia
    // -- no con un clon del nodo vivo, que cuando llegamos aqui ya trae el
    // contenido del modal nuevo -- y suelta el nodo.
    function takeContent(item) {
        if (!(item.content instanceof HTMLElement)) return

        const ownerId = contentOwner.get(item.content)

        if (ownerId === undefined || ownerId === item.id) return

        const owner = nodes.get(ownerId)

        if (!owner) {
            contentOwner.delete(item.content)
            return
        }

        if (owner.snapshot && !owner.snapshot.parentNode) {
            const card = owner.body.querySelector('.apr-card')

            if (card) card.append(owner.snapshot)
        }

        owner.morph?.abandonContent?.()
        contentOwner.delete(item.content)
    }

    function enter(item) {
        ensureMounted()
        if (nodes.has(item.id)) return

        // Antes de tomar el contenido y de montar nada: si esta apertura es el
        // MISMO modal que todavia se esta cerrando, esa copia se apaga. Va
        // primero para que no compita por el mismo sitio en la pantalla ni un
        // frame. Con modales distintos no hace nada (ver `sameModal`).
        vanishSameModal(item)

        takeContent(item)

        const itemEl = document.createElement('div')
        itemEl.className = 'apr-item'
        itemEl.dataset.aprId = String(item.id)

        const overlay = document.createElement('div')
        overlay.className = 'apr-overlay'
        overlay.dataset.aprOverlay = ''

        // El overlay SIEMPRE bloquea y SIEMPRE cierra al picar fuera. Antes, con
        // `blocking: false`, se le ponia `pointer-events: none` y su propio
        // listener de abajo no podia dispararse nunca: el modal se quedaba sin
        // forma de cerrarse con el raton.
        //
        // Para abrir otro modal hay que cerrar este primero; con el lock
        // suelto al empezar el cierre y el trigger aun picable, el doble clic
        // de memoria muscular (fuera -> trigger) sigue funcionando.

        const dialog = document.createElement('div')
        dialog.className = 'apr-dialog'
        dialog.setAttribute('role', 'dialog')
        dialog.setAttribute('aria-modal', 'true')
        dialog.tabIndex = -1

        const shell = document.createElement('div')
        shell.className = 'apr-shell'
        shell.dataset.aprShell = ''

        const body = document.createElement('div')
        body.className = 'apr-body'
        body.dataset.aprBody = ''

        const close = (result) => store.close(item.id, result)
        const cleanupContent = fillBody(body, item, { close, id: item.id })
        bindAria(dialog, body, item)

        if (item.content instanceof HTMLElement) {
            contentOwner.set(item.content, item.id)
        }

        shell.append(body)
        dialog.append(shell)
        itemEl.append(overlay, dialog)
        layer.append(itemEl)

        overlay.addEventListener('click', (event) => {
            if (event.target !== overlay) return
            const current = store.get(item.id)
            if (current?.dismissible) store.close(item.id)
        })

        const node = {
            itemEl,
            overlay,
            dialog,
            shell,
            body,
            cleanupContent,

            // Copia visual del contenido que ESTE modal esta mostrando. Se toma
            // aqui: es el ultimo momento en que el nodo vivo es suyo de verdad
            // (el motor todavia no ha escrito estilos y Vue no lo ha
            // re-renderizado para el modal siguiente).
            snapshot: captureSnapshot(item),

            origin: item.origin,
            originHidden: false,
            morphing: false,
            leaving: false,
            dragging: false,
            morph: null,
            closeMorph: null,
            sizeMotion: null,
            layoutPins: [],
            untrack: null,
            follow: null,
            resizeObserver: null,
            lastWidth: 0,
            lastHeight: 0,
            lastLayout: {},
            detachGesture: null,
            closeTarget: null,
            placement: 'center',
            rev: item.rev ?? 0,
            vanishing: false,
            tornDown: false,
        }
        nodes.set(item.id, node)
        place(node, item)

        if (liveNodes().length === 1) lock.acquire(layer, item.origin)
        motionOf(overlay).set({ opacity: 0 })
        void itemEl.offsetWidth
        place(node, item)

        const origin = item.origin
        const mode = item.mode ?? 'travel'
        const morph = mode !== 'simple' && canMorphFrom(origin)
        const morphOptions = morphFor(item)

        const finish = () => {
            node.morphing = false
            node.morph = null
            startTracking(node, item)
            attachGesture(node, item)

            node.lastWidth = shell.getBoundingClientRect().width
            node.lastHeight = shell.getBoundingClientRect().height

            if (!node.resizeObserver && typeof ResizeObserver !== 'undefined') {
                node.resizeObserver = new ResizeObserver(() => {
                    if (node.morphing || node.leaving || node.sizeMotion) return

                    const newWidth = shell.getBoundingClientRect().width
                    const newHeight = shell.getBoundingClientRect().height

                    if (Math.abs(newWidth - node.lastWidth) >= 1 || Math.abs(newHeight - node.lastHeight) >= 1) {
                        springLayoutShift(node, node.lastWidth, node.lastHeight, newWidth, newHeight)
                    } else {
                        node.lastWidth = newWidth
                        node.lastHeight = newHeight
                    }
                })
                node.resizeObserver.observe(body)
            }

            if (!node.leaving) restack()
            const latest = store.get(item.id)
            if (latest && !latest.closing && latest.rev !== node.rev) refresh(latest)

            // Where focus lands once the morph settles.
            //
            // 'dialog' (default) keeps it on the dialog itself. 'first' is the
            // old behaviour: jump to the first focusable, which in any dialog
            // whose first control is Close reads as the close button stealing
            // focus -- and the focus ring -- the moment the modal opens.
            // 'none' leaves focus where it was.
            if (!node.leaving) {
                const autofocus =
                    item.autofocus ?? 'dialog'

                if (autofocus === 'first') {
                    focusFirst(dialog)
                } else if (autofocus !== 'none') {
                    dialog.focus({ preventScroll: true })
                }
            }
        }

        if (morph) {
            node.morphing = true
            node.originHidden = true

            const morphArgs = {
                dialogEl: dialog,
                shellEl: shell,
                bodyEl: body,
                origin,
                originStyle: item.originStyle,
                options: { ...morphOptions, mode },
                onSettle: finish,
            }

            // Si el motor de apertura LANZA, el item se queda clavado en su
            // frame cero: el shell congelado sobre el origin (`transition:
            // none`) y su overlay -- `opacity: 0` pero `pointer-events: auto` --
            // tapando la pagina entera. Medido con un `ReferenceError` dentro de
            // `morphFromOrigin`: el modal nacia congelado a los 150 ms, seguia
            // identico a los 1150, el clic fuera no llegaba a nada y el
            // `elementsFromPoint` del centro devolvia `apr-dialog`/`apr-overlay`
            // por encima del BODY. Eso es el raton muerto: la pagina entera deja
            // de responder y el modal no se puede ni cerrar.
            //
            // El cierre ya tiene su red (el `safety` de `leave`), pero la
            // apertura no tenia ninguna: los timers del motor se registran DESPUES
            // de la parte que puede lanzar, y `node.morph` se queda sin asignar,
            // asi que nadie podia desmontarlo. Aqui el modal se retira entero --
            // sin animacion, pero la pagina vuelve a responder.
            try {
                if (mode === 'gsap') {
                    node.morph = gsapMorphFromOrigin(morphArgs)
                } else {
                    node.morph = morphFromOrigin(morphArgs)
                }
            } catch (error) {
                console.error('[modal] la apertura lanzo; se retira sin animacion', error)

                node.morph = null
                node.morphing = false

                // El motor pudo esconder el trigger antes de reventar: devolverlo
                // es lo que hace que se pueda volver a intentar el clic.
                if (node.originHidden) {
                    node.originHidden = false
                    releaseOrigin(origin, node)
                }

                // En microtask, no aqui: esto corre dentro del `emit()` del
                // store y volver a entrar en el desde su propio aviso reordena
                // la lista mientras se recorre.
                queueMicrotask(() => store.close(item.id))
                return
            }

        } else {
            slideIn(dialog, finish)
        }

        fadeOverlay(overlay, 1)
        restack({ skipId: item.id })
        dialog.focus({ preventScroll: true })
    }

    function leave(item) {
        const node = nodes.get(item.id)
        if (!node || node.leaving) return
        node.leaving = true

        if (liveNodes().length === 0) lock.release()

        // Primero soltar el contenido y despues parar la apertura: asi la copia
        // visual ya esta en su sitio cuando el motor de cierre mida, y la
        // limpieza de la apertura (`reset`/`show`) encuentra el nodo vivo ya
        // liberado en vez de escribir en el contenido del modal de al lado.
        releaseContent(node, item)

        node.morph?.settle({ keepGeometry: true })
        node.morph = null
        node.morphing = false
        node.detachGesture?.()
        node.detachGesture = null

        // Se para la motion de tamaño y se sueltan los pines de LAYOUT, pero el
        // pin de CONTENIDO (el ancho del body) se queda. Es el ancho de reposo
        // de la copia, y es el que envuelve sus palabras: el body es hijo del
        // shell, asi que en `auto` el ancho lo pone el shell que va volando y el
        // titulo se mide apilado. Medido en rafaga (picadas cada 70 ms), con el
        // pin suelto la fuente del cierre sale en 3 hileras `s=[578.624.670]`
        // camino del trigger de 1 `t=[644.644.644]`, y las palabras se cruzaban
        // en el aire. Es el mismo slot que respeta el cierre (host.js:871 pasa
        // `keepGeometry: true` justo para eso): `stopSizeMotion` entero lo
        // deshacia dos lineas despues.
        node.sizeMotion?.stop()
        node.sizeMotion = null
        unpinLayout(node)

        const { overlay, dialog, shell, body, origin, originHidden } = node
        overlay.style.pointerEvents = 'none'
        dialog.style.pointerEvents = 'none'

        const morphOptions = morphFor(item)
        const closeTarget = canMorphFrom(item.closeOrigin) ? item.closeOrigin : origin
        const mode = item.mode ?? 'travel'
        let reverse = mode !== 'simple' && originHidden && canMorphFrom(closeTarget)

        if (reverse) {
            const parentEl = closeTarget.closest('.apr-item')
            if (parentEl) {
                const parentId = Number(parentEl.dataset.aprId)
                const parentState = store.get(parentId)
                if (parentState?.closing) {
                    reverse = false
                }
            }
        }

        const handoffDuration = reverse
            ? Math.max(0, Number(morphOptions.closeHandoffDuration) || 0)
            : 0

        // Restack immediately so the underlying modal smoothly scales back up.
        // The closing child will track the origin dynamically if it moves.
        restack()
        node.closeTarget = closeTarget

        let finished = false
        const finish = () => {
            if (finished) return
            finished = true
            clearTimeout(safety)

            // `dispose()` no destapa el origin (el motor no sabe si otro modal
            // vivo sigue saliendo de ese trigger); de eso se encargan las
            // llamadas con guardia del teardown. Su propio `onSettle` vuelve a
            // entrar aqui, pero `finished` ya esta puesto.
            teardownNode(item, node)
        }
        // Red de ultimo recurso. Tiene que quedar POR DETRAS del motor: si el
        // host gana la carrera, el motor no llega a hacer su cleanup y su vuelo
        // se queda colgado. El motor cierra a los `closeMaxDuration` (y ahora
        // tambien con su propio timeout de handoff), asi que aqui se le deja
        // margen de sobra.
        const safetyDuration = (morphOptions.closeMaxDuration ?? 480)
            + handoffDuration * 1000
            + 200;

        const safety = setTimeout(() => {
            finish()
        }, safetyDuration);

        fadeOverlay(overlay, 0, reverse ? config.overlayDuration * 0.8 : config.exitDuration)

        if (reverse) {
            if (closeTarget !== origin && originHidden && origin) {
                releaseOrigin(origin, node)
                node.originHidden = false

                // Oculto pero picable: el trigger desaparece de la vista pero
                // sigue recogiendo el clic. Es lo que hace que el doble clic de
                // memoria muscular (cerrar y volver a abrir) no se pierda.
                hideOriginForClose(closeTarget, { clickable: true })
            }

            const morphArgs = {
                dialogEl: dialog,
                shellEl: shell,
                bodyEl: body,
                origin: closeTarget,
                originStyle: closeTarget === origin ? item.originStyle : null,
                options: { ...morphOptions, mode },
                onSettle: () => {
                    if (closeTarget !== origin) releaseOrigin(closeTarget, node)
                    finish()
                },
                // El engine tampoco puede destapar el origin si otro modal vivo
                // salio del mismo trigger.
                shouldRestoreOrigin: () => !originInUse(closeTarget, node),
            }

            if (mode === 'gsap') {
                node.morph = gsapMorphToOrigin(morphArgs)
            } else {
                node.morph = morphToOrigin(morphArgs)
            }

            // El asa del motor de cierre. `node.morph` no sirve como asa: es la
            // que usa el gesto de arrastre y el `destroy()`, y aqui queda
            // apuntando al motor de cierre solo de paso. El teardown necesita
            // una propia para desmontar el vuelo si el cierre termina por el
            // safety y no por el motor.
            node.closeMorph = node.morph

            if (closeTarget === origin) node.originHidden = false
            return
        }

        if (originHidden && origin) {
            releaseOrigin(origin, node)
            node.originHidden = false
        }
        slideOut(dialog, finish)
    }

    function hideOriginForClose(element, { clickable = false } = {}) {
        // Era una copia del cuerpo de `hideOrigin` sin su registro: al no
        // guardar el `transition` anterior, el `restoreOrigin` no tenia que
        // devolver y el trigger se quedaba con `transition: none` para siempre.
        hideOrigin(element, { clickable })
    }

    // Devolver el origin a la vista, pero solo si nadie mas lo esta usando: en
    // una rafaga dos modales salen del mismo trigger, y el que se va primero no
    // puede destaparlo mientras el otro sigue abierto.
    function originInUse(element, exceptNode) {
        if (!(element instanceof HTMLElement)) return false
        return Array.from(nodes.values()).some((other) => other !== exceptNode && (other.origin === element || other.closeTarget === element))
    }

    function releaseOrigin(element, exceptNode) {
        if (!(element instanceof HTMLElement)) return
        if (originInUse(element, exceptNode)) return
        restoreOrigin(element, { instant: true })
    }

    // Teardown terminal de un nodo: suelta todo lo que el host le presto
    // (motor, tracking, gesto, observers, contenido) y quita el item del store.
    //
    // Es el UNICO camino que garantiza que no queda un `.apr-item` cubriendo la
    // pagina, asi que lo usan tanto el cierre normal como la red de `sync()`.
    // Su orden importa: `dispose()` va primero (el motor todavia tiene el vuelo
    // y el slot congelado), y el `itemEl.remove()` se lleva por delante lo que
    // quede dentro, incluido el host de fantasmas.
    // -------------------------------------------------------------------------
    // EL MISMO MODAL VOLVIENDO A ABRIRSE
    // -------------------------------------------------------------------------
    //
    // El doble clic de memoria muscular reabre el mismo modal mientras la copia
    // anterior todavia se esta cerrando, y entonces las dos se ven a la vez: el
    // vuelo de vuelta y el de ida dibujan dos copias de lo mismo cruzándose.
    // Medido en `#/gsap-morph` (pill -> pill en el mismo tick): los dos items
    // viven 450 ms con el MISMO juego de fantasmas (`Launch`, `Project`,
    // `Ciervo`, 🚀) y sus dos shells a 32 px el uno del otro. Eso es lo que el
    // dueño ve de fondo detras del modal nuevo.
    //
    // Con modales DISTINTOS no se toca nada: ahi el vuelo de salida del viejo
    // es justo lo que se quiere (su texto e icono acaban en la capa de atras del
    // nuevo). El apagon es solo para el mismo.
    //
    // La identidad va por `origin`, y no por `content`: `Modal.vue` comparte un
    // UNICO nodo de contenido entre todas sus aperturas (`contentRef`), asi que
    // el pill y el card llevan el mismo `content` y dos modales distintos
    // serian "el mismo". Medido: pill -> pill da dos items con el mismo
    // `origin`; pill -> card, dos items con `origin` distinto.
    //
    // El `content` se compara solo cuando no hay origin (aperturas
    // programaticas, sin trigger): ahi no hay nada mejor, y exigir tambien
    // titulo y variante deja fuera a los que se parecen sin serlo.
    function sameModal(a, b) {
        if (!a || !b || a === b) return false

        if (a.origin && b.origin) return a.origin === b.origin
        if (a.content && b.content) {
            return a.content === b.content
                && a.title === b.title
                && a.variant === b.variant
                && a.kind === b.kind
        }

        return false
    }

    function vanishNode(item, node) {
        if (node.vanishing) return
        node.vanishing = true

        const handle = node.closeMorph

        if (handle?.vanish) {
            handle.vanish()
            return
        }

        // Otros motores de cierre: su `abort` ya es instantaneo y tampoco
        // destapa el origin.
        if (handle?.abort) {
            handle.abort()
            return
        }

        // Sin motor (cierre por `slideOut`, o el cierre ya termino y solo falta
        // el desmonte): se apaga el item entero y se retira. Aqui no hay nada
        // que animar -- el modal nuevo ya esta entrando encima.
        node.itemEl.style.transition = `opacity ${VANISH_DURATION}s ease-out`
        node.itemEl.style.opacity = '0'

        vanishTimers.set(
            item.id,
            setTimeout(() => {
                vanishTimers.delete(item.id)
                teardownNode(item, node)
            }, VANISH_DURATION * 1000 + 20),
        )
    }

    function vanishSameModal(item) {
        for (const [id, node] of nodes) {
            if (id === item.id) continue

            const other = store.get(id)

            if (!other?.closing || !sameModal(other, item)) continue

            vanishNode(other, node)
        }
    }

    function teardownNode(item, node) {
        // Es el desmonte TERMINAL: tres caminos pueden pedirlo (el `finish` del
        // cierre, la red de `sync()` y el apagon del mismo modal). Con la
        // bandera, el segundo que llegue no vuelve a avisar de la retirada.
        if (node.tornDown) return
        node.tornDown = true

        if (vanishTimers.has(item.id)) {
            clearTimeout(vanishTimers.get(item.id))
            vanishTimers.delete(item.id)
        }

        node.closeMorph?.dispose?.()
        node.closeMorph = null
        node.morph = null
        node.morphing = false
        node.untrack?.()
        node.untrack = null
        node.follow?.stop()
        node.follow = null
        node.detachGesture?.()
        node.detachGesture = null
        stopSizeMotion(node)
        node.cleanupContent?.()
        node.resizeObserver?.disconnect()
        node.resizeObserver = null
        killMotion(node.overlay)
        killMotion(node.dialog)
        node.itemEl.remove()

        if (contentOwner.get(item.content) === item.id) {
            contentOwner.delete(item.content)
        }

        nodes.delete(item.id)
        const result = store.remove(item.id)

        releaseOrigin(node.origin, node)
        if (node.closeTarget && node.closeTarget !== node.origin) {
            releaseOrigin(node.closeTarget, node)
        }

        restack()
        onRemoved?.(item.id, result)
        return result
    }

    function sync(items = store.getItems()) {
        ensureMounted()
        for (const item of items) {
            // Si un paso del ciclo de vida LANZA, el item no puede quedarse de
            // cadaver: el nodo ya esta en el DOM y su overlay -- `opacity: 0`
            // pero `pointer-events: auto` -- tapa la pagina entera, asi que
            // nada responde y el modal no se puede ni cerrar. Medido: un throw
            // en `canMorphFrom` (antes incluso de que el motor midiera el
            // origin) dejaba el modal visible pero sin gesto de cierre, con el
            // `elementsFromPoint` del centro devolviendo `apr-dialog` /
            // `apr-overlay` por encima del BODY. Eso es el raton muerto. Aqui se
            // retira el modal entero -- sin animacion, pero la pagina revive.
            try {
                if (!item.closing && !nodes.has(item.id)) enter(item)
                else if (!item.closing && nodes.has(item.id)) refresh(item)
                if (item.closing && nodes.has(item.id)) leave(item)
            } catch (error) {
                console.error('[modal] el ciclo de vida lanzo; se retira el modal', error)

                const broken = nodes.get(item.id)
                if (broken) {
                    teardownNode(item, broken)
                } else {
                    // Ni nodo llego a tener: el item pudo quedarse en el DOM a
                    // medias. Quitarlo es idempotente.
                    document.querySelector(`.apr-item[data-apr-id="${item.id}"]`)?.remove()
                    store.remove(item.id)
                    restack()
                }
            }
        }

        // Red de seguridad del lock, no un arreglo de un fallo medido: si el
        // ultimo borde se pierde, la pagina se queda `inert` con el scroll
        // congelado y no responde a nada. Reconciliar es idempotente y solo
        // puede soltar el lock cuando ya no queda ningun modal vivo (estado en
        // el que, por contrato, no puede estar tomado).
        if (!liveNodes().length && lock.held()) lock.release()
    }

    function mount() {
        if (unsubscribe) return
        ensureMounted()
        unsubscribe = store.subscribe(sync)
        sync()
    }

    function destroy() {
        unsubscribe?.()
        unsubscribe = null
        for (const node of [...nodes.values()]) {
            node.morph?.settle()
            node.untrack?.()
            node.follow?.stop()
            node.detachGesture?.()
            stopSizeMotion(node)
            node.cleanupContent?.()
            node.resizeObserver?.disconnect()
            node.resizeObserver = null
            if (node.originHidden && node.origin) restoreOrigin(node.origin)
            killMotion(node.overlay)
            killMotion(node.dialog)
            node.itemEl.remove()
        }
        nodes.clear()
        contentOwner.clear()
        document.removeEventListener('keydown', onKeyDown)
        lock.destroy()
        layer?.remove()
        layer = null
    }

    function triggerRefresh(id) {
        const item = store.get(id)
        if (!item) return
        refresh(item)
    }

    return {
        mount,
        destroy,
        configure,
        sync,
        ensureMounted,
        set onRemoved(fn) { onRemoved = fn },
        refresh: triggerRefresh,
    }
}