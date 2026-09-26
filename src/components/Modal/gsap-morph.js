/**
 * Morph engine
 *
 * The element that opened the dialog becomes the dialog,
 * and on close the dialog becomes the original element again.
 *
 * The implementation is intentionally split into four concerns:
 *
 *   1. Geometry      -> shell position / size / radius
 *   2. Content      -> word boxes + icon mapping
 *   3. Flight       -> independent ghost layer
 *   4. Lifecycle    -> one authoritative transition per shell
 *
 * A new transition always invalidates the previous transition.
 * Stale callbacks/timers are therefore unable to clean up a newer
 * transition.
 */

import { createMotion, spring, easing } from '../../core/motion/engine.js'
import { Easing } from '../../core/motion/easing.js'
import { motionOf } from '../../core/motion/element.js'
import { gsap } from 'gsap'


// -----------------------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------------------

// Cuanto se espera entre apagar una copia (ver `vanish` en el cierre) y
// desmontarla del todo. Un tick basta: lo unico que hace falta es no mutar el
// mapa de nodos del host mientras `sync()` lo esta recorriendo.
const VANISH_TEARDOWN_DELAY = 20

export const MORPH_DEFAULTS = {
    stiffness: 144,
    damping: 14,
    velocity: 2400,

    sizeStiffness: 180,
    sizeDamping: 22,

    sizeDuration: 0.32,
    radiusDuration: 0.32,
    contentDuration: 0.32,

    colorDuration: 0.4,
    colorDelay: 0.15,

    shadowDuration: 0.6,
    shadowDelay: 0.05,

    contentScale: 2,
    contentBlur: 8,

    maxDuration: 1100,

    closeDamping: 20,
    closeSizeDamping: 26,
    closeVelocity: 1400,

    closeContentDuration: 0.16,
    closeHandoffDuration: 0,

    // De donde cuelga el texto que vuela:
    //
    //   'shell'    -> funcion del estado vivo del shell, pintada en el mismo
    //                 frame y con el mismo `roundT` que los radios.
    //   'timeline' -> el timeline GSAP de siempre (duracion + ease propios).
    //
    // Con 'timeline' el texto y la caja son dos relojes para un solo recorrido:
    // el mismo viaje termina en el frame 8 para el timeline y en el 38 para la
    // caja, asi que el texto no puede ir dentro. La perilla se queda para poder
    // comparar las dos fisicas en el playground (y para revertir con un valor).
    ghostPhysics: 'shell',

    // Cuanto del cambio de destino del fantasma (el scroll en pleno vuelo) se
    // aplica en cada frame. Es el unico ajuste que actua DESPUES de un
    // reapuntado: mientras el destino no se mueva, el polo vale 0 y el vuelo es
    // identico al de siempre. `1` = el salto en seco anterior.
    ghostAimSmooth: 0.2,

    // Aqui estaba `closeVanishDuration: 0.14`, el fundido con el que se apagaba
    // una copia que se va sin viaje de vuelta (el MISMO modal reabriendose
    // encima). Ese fundido era el bug: duraba lo justo para que se vieran las dos
    // superficies montadas una sobre otra. El apagon es instantaneo ahora, asi
    // que la clave no la lee nadie en este motor. El de `morph.js` conserva la
    // suya.

    contentFlightDuration: 0.6,
    contentFlightEase: 'power3.out',

    closeContentFlightDuration: 0.4,
    closeContentFlightEase: 'power2.out',

    ghostTargets: 'all',

    closeMaxDuration: 2500,
    closeRestDelta: 0.04,
    closeRestSpeed: 0.5,
}


// -----------------------------------------------------------------------------
// TRANSITION REGISTRY
// -----------------------------------------------------------------------------
//
// One shell can only have one authoritative transition.
//
// This is the most important lifecycle change in this version.
//
// If Vue/Modal starts a new opening while an old closing transition is still
// alive, the old transition is synchronously invalidated. Its timers,
// motion callbacks and GSAP timelines may still technically exist for a
// moment, but none of them are allowed to touch the DOM anymore.
//
// -----------------------------------------------------------------------------

const activeTransitions = new WeakMap()

let transitionSerial = 0


function createTransitionController(shellEl) {
    const id = ++transitionSerial

    const previous = activeTransitions.get(shellEl)

    if (previous) {
        previous.cancel('superseded')
    }

    let active = true

    const controller = {
        id,

        isCurrent() {
            return active && activeTransitions.get(shellEl) === controller
        },

        invalidate() {
            active = false
        },

        register() {
            activeTransitions.set(shellEl, controller)
        },

        release() {
            if (activeTransitions.get(shellEl) === controller) {
                activeTransitions.delete(shellEl)
            }

            active = false
        },

        cancel(reason = 'cancelled') {
            if (!active) return

            active = false

            if (typeof controller._cancelImpl === 'function') {
                controller._cancelImpl(reason)
            }

            if (activeTransitions.get(shellEl) === controller) {
                activeTransitions.delete(shellEl)
            }
        },

        _cancelImpl: null,
    }

    controller.register()

    return controller
}


// -----------------------------------------------------------------------------
// BASIC ORIGIN HELPERS
// -----------------------------------------------------------------------------

// `hideOrigin` pone `transition: none` para que ocultar el trigger no se anime,
// y hasta ahora no lo devolvia nunca: al reposo el trigger se quedaba con el
// `transition: none` inline puesto y perdia sus transiciones CSS para siempre.
// Guardar el valor anterior (el primero, el que no escribio una transicion)
// permite devolverlo al destaparlo.
const originTransitions =
    new WeakMap()

const originTransforms =
    new WeakMap()


export function hideOrigin(
    element,
    {
        // Un modal no bloqueante convive con la pagina: el origin se oculta
        // pero sigue siendo el sitio donde el usuario pica. Dejarlo sin clics
        // es lo que convertia "picar el trigger mientras el modal esta abierto
        // o cerrrandose" en un click que no hacia nada.
        clickable = false,
    } = {},
) {
    if (!(element instanceof HTMLElement)) return

    if (!originTransitions.has(element)) {
        originTransitions.set(
            element,
            element.style.transition,
        )
    }

    if (!originTransforms.has(element)) {
        originTransforms.set(
            element,
            element.style.transform,
        )
    }

    element.style.transition = 'none'
    element.style.transform = 'none'
    element.style.opacity = '0'

    // `clickable` tiene que PODER el clic, no solo no quitarselo: el trigger
    // llega aqui con el `pointer-events: none` que le puso la apertura, asi que
    // dejarlo sin tocar lo dejaba oculto y sordo justo en la ventana en la que
    // el dueño vuelve a picar (cerrar y reabrir de memoria muscular).
    if (!clickable) element.style.pointerEvents = 'none'
    else element.style.pointerEvents = 'auto'
}


export function restoreOrigin(
    element,
    {
        instant = false,
        duration = 300,
    } = {},
) {
    if (!(element instanceof HTMLElement)) return

    const savedTransition =
        originTransitions.get(element)
    const savedTransform =
        originTransforms.get(element)

    if (instant) {
        // Lo que hay puesto ahora: es lo que hay que devolver si nadie lo
        // apago desde aqui.
        const current =
            element.style.transition

        element.style.transition = 'none'
        element.style.opacity = ''
        element.style.pointerEvents = ''

        if (savedTransform !== undefined) {
            originTransforms.delete(element)
            element.style.transform = savedTransform
        } else {
            element.style.transform = ''
        }

        if (savedTransition !== undefined) {
            originTransitions.delete(element)
        }

        const restoreTo =
            savedTransition === undefined
                ? current
                : savedTransition

        if (restoreTo !== 'none') {
            // El reflow compromete el cambio de opacidad sin transicion antes
            // de devolver la que tenia: sin el, el navegador aplica las dos
            // escrituras juntas y rearma la animacion que se queria evitar.
            void element.offsetWidth

            element.style.transition =
                restoreTo
        }

        return
    }

    const durationMs = Math.max(0, Number(duration) || 0)

    element.style.transition = `opacity ${durationMs}ms ease`
    element.style.opacity = ''
    element.style.pointerEvents = ''

    if (savedTransform !== undefined) {
        originTransforms.delete(element)
        element.style.transform = savedTransform
    } else {
        element.style.transform = ''
    }

    window.setTimeout(() => {
        if (savedTransition === undefined) {
            element.style.transition = ''
            return
        }

        element.style.transition =
            savedTransition

        originTransitions.delete(element)
    }, durationMs + 20)
}


// -----------------------------------------------------------------------------
// GEOMETRY
// -----------------------------------------------------------------------------

function transparentShadow(shadow) {
    if (!shadow || shadow === 'none') return shadow

    return shadow.replace(
        /rgba?\([^)]*\)/g,
        'rgba(0,0,0,0)',
    )
}


function minSide(width, height) {
    return Math.max(
        1,
        Math.min(width, height),
    )
}


function effectiveRadius(cssValue, width, height) {
    const cap = minSide(width, height) / 2
    const raw = String(cssValue ?? '').trim()

    if (!raw || raw === 'none') {
        return 0
    }

    if (raw.endsWith('%')) {
        return Math.min(
            (parseFloat(raw) / 100) * minSide(width, height),
            cap,
        )
    }

    const px = parseFloat(raw)

    if (!Number.isFinite(px)) {
        return 0
    }

    return Math.min(
        Math.max(0, px),
        cap,
    )
}


function splitRadiusShorthand(value) {
    const raw = String(value ?? '').trim()

    if (!raw || raw === 'none') {
        return ['0px', '0px', '0px', '0px']
    }

    const parts = raw
        .split('/')[0]
        .trim()
        .split(/\s+/)

    const a = parts[0]
    const b = parts[1] ?? a
    const c = parts[2] ?? a
    const d = parts[3] ?? b

    if (parts.length === 1) {
        return [a, a, a, a]
    }

    if (parts.length === 2) {
        return [a, b, a, b]
    }

    if (parts.length === 3) {
        return [a, b, c, b]
    }

    return [a, b, c, d]
}


function cornerRoundness(
    computed,
    width,
    height,
    override = null,
) {
    const val = (css) => effectiveRadius(
        css,
        width,
        height,
    )

    if (
        override != null &&
        String(override).trim() !== ''
    ) {
        const [
            tl,
            tr,
            br,
            bl,
        ] = splitRadiusShorthand(override)

        return {
            tl: val(tl),
            tr: val(tr),
            br: val(br),
            bl: val(bl),
        }
    }

    return {
        tl: val(computed.borderTopLeftRadius),
        tr: val(computed.borderTopRightRadius),
        br: val(computed.borderBottomRightRadius),
        bl: val(computed.borderBottomLeftRadius),
    }
}


// -----------------------------------------------------------------------------
// FREEZE / UNFREEZE
// -----------------------------------------------------------------------------

function freezeSlot(
    dialogEl,
    shellEl,
    bodyEl,
) {
    const shellRect = shellEl.getBoundingClientRect()

    dialogEl.style.width = `${shellRect.width}px`
    dialogEl.style.height = `${shellRect.height}px`

    if (bodyEl) {
        bodyEl.style.width = `${bodyEl.getBoundingClientRect().width}px`
        bodyEl.style.flex = '0 0 auto'
    }

    return shellRect
}


function clearFrozen(
    dialogEl,
    shellEl,
    bodyEl,
) {
    for (const property of [
        'position',
        'top',
        'left',
        'width',
        'height',
        'borderRadius',
        'background',
        'boxShadow',
        'transform',
        'transition',
        'opacity',
        'display',
    ]) {
        shellEl.style[property] = ''
    }

    dialogEl.style.width = ''
    dialogEl.style.height = ''
    dialogEl.style.position = ''
    dialogEl.style.left = ''
    dialogEl.style.top = ''
    dialogEl.style.margin = ''

    if (bodyEl) {
        for (const property of [
            'transform',
            'transformOrigin',
            'filter',
            'opacity',
            'width',
            'flex',
            'transition',
        ]) {
            bodyEl.style[property] = ''
        }
    }
}


// -----------------------------------------------------------------------------
// SHELL PAINT
// -----------------------------------------------------------------------------

function paintShell(
    shellStyle,
    state,
    fromRound,
    toRound,
) {
    const t = state.roundT

    const r = (a, b) =>
        a + (b - a) * t

    shellStyle.transform =
        `translate(${state.x}px, ${state.y}px)`

    shellStyle.width =
        `${state.width}px`

    shellStyle.height =
        `${state.height}px`

    shellStyle.borderRadius =
        `${r(fromRound.tl, toRound.tl)}px ` +
        `${r(fromRound.tr, toRound.tr)}px ` +
        `${r(fromRound.br, toRound.br)}px ` +
        `${r(fromRound.bl, toRound.bl)}px`
}


// -----------------------------------------------------------------------------
// SPRINGS
// -----------------------------------------------------------------------------

// Tolerancia de asentado de la GEOMETRIA del morph (caja y radios).
//
// El motor cierra un canal asentandolo de golpe al destino (ver
// `Channel.step`): cuando el error entra en `restDelta` el valor SALTA al
// objetivo en un solo frame. Ese salto ES el error que quedaba, asi que
// `restDelta` no es una tolerancia cualquiera: es el tamano del ultimo tiron.
//
// Medido con 0.4 px (apertura del pill, 4 frames antes del asentado):
//   1989  paso 0.010 px    2007  paso 0.050 px    <- la caja ya parece quieta
//   2025  paso 0.430 px    2078  paso 0.450 px    <- y tira medio pixel
//   2131  paso 0.340 px
// Tres tirones de 0.34-0.45 px en frames sueltos, con el texto interno ya a
// opacidad 0.99: eso es lo que se ve como "el texto se mueve un poco". En el
// cierre, lo mismo (0.41 y 0.36 px). Con el texto ya invisible y la caja
// pequena el tiron pasa desapercibido, pero el defecto es el mismo.
//
// 0.1 px es una decima de pixel CSS: el salto deja de existir para el ojo y la
// cola solo se alarga los ~4 frames que el resorte tarda en cerrar ese resto
// (a 0.08 px/frame y acelerando: ~60 ms mas de vuelo, invisible porque el
// movimiento que queda esta por debajo de 0.1 px/frame).
const GEOMETRY_REST_DELTA = 0.04

// La velocidad se afina a 0.5 px/s para que el resorte no se quede congelado
// gateando los ultimos 120ms por debajo de 0.01px/frame.
const GEOMETRY_REST_SPEED = 0.5

// `restDelta` y `restSpeed` de `sizeSpring` son ABSOLUTOS, pero ese spring
// alimenta canales de dos escalas muy distintas: x/y/width/height en pixeles y
// `roundT` en un recorrido 0→1. Sobre `roundT`, un `restDelta` de 0.4 es el 40%
// de su viaje, y su velocidad punta (~4.7 u/s) nunca llega a superar el
// `restSpeed` de 4: asentaba en el frame 8 del cierre mientras `width` seguia
// volando hasta el 38. Como `paintShell` interpola los cuatro radios con
// `roundT`, los radios quedaban congelados los 500 ms restantes del vuelo.
//
// La tolerancia correcta para el canal normalizado son las MISMAS de la caja
// expresadas en el recorrido que ese canal representa. Asi no hace falta una
// constante magica: `roundT` asienta en el frame del canal de caja que asienta
// ultimo, sea cual sea el tamano del trigger.
//
// Medido con umbrales fijos (0.004 / 0.04 sobre un recorrido de caja de 154 px:
// 0.26% de la caja contra el 0.4% de `roundT`) el radio paraba 6 frames antes
// que el ancho. Derivarlos del recorrido quita esa constante de la ecuacion.
function normalizedRest(state, targetState) {
    const travel = Math.max(
        Math.abs(targetState.width - state.width),
        Math.abs(targetState.height - state.height),

        // Un recorrido de cero (una caja que solo se desplaza) daria umbrales
        // infinitos: `roundT` no asentaria nunca y el morph no cerraria.
        1,
    )

    return {
        restDelta: GEOMETRY_REST_DELTA / travel,
        restSpeed: GEOMETRY_REST_SPEED / travel,
    }
}

function sizeSpring(
    config,
    {
        close = false,
        restDelta = GEOMETRY_REST_DELTA,
        restSpeed = GEOMETRY_REST_SPEED,
    } = {},
) {
    return spring({
        stiffness: config.sizeStiffness,

        damping: close
            ? (
                config.closeSizeDamping ??
                config.closeDamping
            )
            : config.sizeDamping,

        velocity: 0,

        restDelta,
        restSpeed,
    })
}


function synchronizedGeometrySprings(
    config,
    state,
    targetState,
    { close = false } = {},
) {
    const dx = Math.abs(targetState.x - state.x)
    const dy = Math.abs(targetState.y - state.y)
    const dw = Math.abs(targetState.width - state.width)
    const dh = Math.abs(targetState.height - state.height)
    const maxTravel = Math.max(dx, dy, dw, dh, 1)

    const baseDelta = close
        ? (config.closeRestDelta ?? GEOMETRY_REST_DELTA)
        : GEOMETRY_REST_DELTA
    const baseSpeed = close
        ? (config.closeRestSpeed ?? GEOMETRY_REST_SPEED)
        : GEOMETRY_REST_SPEED

    const damping = close
        ? (
            config.closeSizeDamping ??
            config.closeDamping
        )
        : config.sizeDamping

    const createChSpring = (travel) => {
        const factor = Math.max(travel / maxTravel, 0.005)
        return spring({
            stiffness: config.sizeStiffness,
            damping,
            velocity: 0,
            restDelta: baseDelta * factor,
            restSpeed: baseSpeed * factor,
        })
    }

    return {
        x: createChSpring(dx),
        y: createChSpring(dy),
        width: createChSpring(dw),
        height: createChSpring(dh),
        roundSize: spring({
            stiffness: config.sizeStiffness,
            damping,
            velocity: 0,
            restDelta: baseDelta / maxTravel,
            restSpeed: baseSpeed / maxTravel,
        }),
    }
}


function roundnessEase(close) {
    return close
        ? Easing.bezier(0.5, 0.2, 0.2, 1)
        : Easing.bezier(0.8, 0.3, 0.5, 0.8)
}


// -----------------------------------------------------------------------------
// CONTENT DETECTION
// -----------------------------------------------------------------------------

function getFadingElements(bodyEl) {
    if (!bodyEl) return []

    const fading = []

    const sharedEls = Array.from(
        bodyEl.querySelectorAll(
            '[data-morph-split], [data-morph-icon], [data-apr-id]',
        ),
    )

    const containsShared = (el) =>
        sharedEls.some(
            (shared) => el.contains(shared),
        )

    const isSharedOrInside = (el) =>
        sharedEls.some(
            (shared) =>
                shared === el ||
                shared.contains(el),
        )

    function traverse(el) {
        if (isSharedOrInside(el)) {
            return
        }

        if (containsShared(el)) {
            Array.from(el.children)
                .forEach(traverse)
            return
        }

        const isInteractiveLeaf =
            el.tagName === 'BUTTON' ||
            el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            el.tagName === 'SELECT' ||
            el.tagName === 'A' ||
            el.tagName === 'IMG' ||
            el.tagName === 'SVG' ||
            el.matches?.('.btn, .apr-btn, [class*="btn"]')

        const isTextLeaf =
            el.tagName === 'P' ||
            el.tagName === 'LABEL' ||
            /^H[1-6]$/.test(el.tagName)

        if (isInteractiveLeaf || isTextLeaf || el.children.length === 0) {
            fading.push(el)
        } else {
            Array.from(el.children).forEach(traverse)
        }
    }

    Array.from(bodyEl.children)
        .forEach(traverse)

    return fading
}


// -----------------------------------------------------------------------------
// GHOST SYSTEM
// -----------------------------------------------------------------------------
//
// IMPORTANT:
//
// There is deliberately NO wiggle-room layout mutation anymore.
//
// The previous implementation changed the real source/target layout before
// taking measurements. That made the measurement itself dependent on the
// workaround and could leave the modal wider than its real target.
//
// Ghosts now use the actual measured boxes, and every ghost is anchored to the
// side it LANDS on: it is built with the destination's own metrics, in the
// destination's own line box, and it is the matrix that carries it there --
// starting scaled to the origin's box, ending at scale 1, where the ghost IS
// the native render of the target.
//
// That is why there is nothing left here that converges late, nothing divided
// by the scale, and no per-icon line box rule: the landing is exact by
// construction, so no pair of type sizes needs a patch of its own.
//
// -----------------------------------------------------------------------------

// An element that is NOT text (an svg, an image): its own rect IS its render, so
// the ghost that lands on it is a clone pinned to that rect, with no baseline to
// align to.
//
// Text -- including an emoji icon, which is a glyph like any other -- goes
// through wordBox() instead, because that one is measured with a Range rather
// than with the element's box.
function snapshotBox(el) {
    const rect = el.getBoundingClientRect()
    const cs = getComputedStyle(el)

    return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,

        // A clone is parked in the flight host, so it inherits from there and
        // not from the modal. Anything inside it that is painted with
        // currentColor -- an svg glyph, a border -- needs the colour to come
        // along, or it lands in the wrong ink.
        color: cs.color,
    }
}


// Type properties that move glyphs or change which glyph is drawn. A landing is
// aligned by a box measured on the real destination, so a ghost missing one of
// these would reproduce a different box than the one it is aligned by.
const TEXT_PROPS = [
    'fontStyle',
    'fontStretch',
    'fontKerning',
    'fontVariantCaps',
    'fontFeatureSettings',
    'textTransform',
    'textShadow',
    'textRendering',
    'textAlign',
    'webkitFontSmoothing',
    'mozOsxFontSmoothing',
]


// The baseline of the line an element renders on, measured with no canvas: an
// empty inline-block hangs its bottom edge on the baseline, so with no height
// its top edge IS the baseline's y.
//
// This is the only honest way to read it. The ascent is not derivable from the
// font-size -- Chrome rounds the font's ascent per size (17/23/31 at 18/24/32px)
// -- so ascent * scale is not the ascent, and the option that looks cheaper
// (deriving one box from the other) is the one that leaves the residue.
function baselineY(el) {
    const probe =
        document.createElement('span')

    probe.style.display =
        'inline-block'

    probe.style.width =
        '0'

    probe.style.height =
        '0'

    probe.style.margin =
        '0'

    el.appendChild(probe)

    const y =
        probe.getBoundingClientRect().top

    probe.remove()

    return y
}


// The ascent a set of metrics renders a word with, measured on a twin parked in
// the metrics host below: a copy of the word whose line box is pinned to its
// glyph box, so half-leading is zero and the probe reads the ascent straight off
// the box top.
//
// Pinning is also what makes the number independent of the line-height the word
// really renders in: the two sides are free to disagree about it (1.5 on the
// origin, 1.45 in the modal, on the card), which is exactly why the START of the
// flight is hung on a baseline and not on a box.
function makeTwin(box) {
    const twin =
        document.createElement('span')

    twin.textContent =
        box.text ?? ''

    twin.style.position =
        'absolute'

    twin.style.left =
        '0'

    twin.style.top =
        '0'

    twin.style.margin =
        '0'

    twin.style.whiteSpace =
        'nowrap'

    twin.style.fontSize =
        box.fontSize

    twin.style.fontFamily =
        box.fontFamily

    twin.style.fontWeight =
        box.fontWeight

    twin.style.fontStyle =
        box.fontStyle

    twin.style.fontStretch =
        box.fontStretch

    twin.style.letterSpacing =
        box.letterSpacing

    // Pinned to the glyph box, not to the element's line-height. See above.
    twin.style.lineHeight =
        box.lineHeight

    return twin
}


// Identity of a set of metrics: the ascent belongs to the font at a size, not to
// the word, so every word sharing one needs a single twin.
function ascentKey(box) {
    return [
        box.fontFamily,
        box.fontSize,
        box.fontWeight,
        box.fontStyle,
        box.fontStretch,
        box.lineHeight,
    ].join('|')
}


// Every distinct ascent a flight needs (each side's metrics), read in ONE hidden
// pass.
//
// The twins live in their own host, never in the flight host: a measurement node
// parked among the ghosts would be a node in the flight, visible to anything
// watching the DOM, and instruments that intercept removal (to freeze a ghost)
// would keep it there. This host is invisible, and it goes away as a whole.
function measureAscents(specs) {
    const host =
        document.createElement('div')

    host.className =
        'apr-ghost-metrics'

    host.style.position =
        'fixed'

    host.style.left =
        '0'

    host.style.top =
        '0'

    host.style.visibility =
        'hidden'

    host.style.pointerEvents =
        'none'

    document.body.appendChild(host)

    const entries = []
    const seen = new Set()

    specs.forEach(
        (spec) => {
            [
                spec.fromBox,
                spec.toBox,
            ].forEach(
                (box) => {
                    // An element ghost (an svg) has no glyph box and no
                    // baseline: it is aligned by box.
                    if (!box || !box.text) return

                    const key =
                        ascentKey(box)

                    if (seen.has(key)) return

                    seen.add(key)

                    entries.push([
                        key,
                        makeTwin(box),
                    ])
                },
            )
        },
    )

    entries.forEach(
        ([, twin]) =>
            host.appendChild(twin),
    )

    const ascents = new Map()

    entries.forEach(
        ([key, twin]) => {
            ascents.set(
                key,
                baselineY(twin) -
                twin.getBoundingClientRect().top,
            )
        },
    )

    // Not remove(): this host is outside the flight host on purpose, and going
    // away even when remove() is intercepted is the point of that.
    host.parentNode.removeChild(host)

    return ascents
}


// The ghost is built as the DESTINATION's render: its metrics, its line box, its
// box. This is the whole point of anchoring to the destination.
//
// A ghost built from the origin's metrics flew an approximation and had to be
// patched for every difference between the two sides -- size pair, weight,
// tracking, family, element vs text, and even the browser's per-size rounding of
// the hinting grid -- because it had to jump to the truth on the last frame. At
// scale 1 this one IS the native render of the target, so there is nothing left
// to jump to.
//
// The origin decides only where the flight starts (see flyGhosts), and that is
// the side the ghost covers while the origin itself sits hidden at opacity 0.
// A pair whose metrics differ therefore shows up at the start, never at the
// landing.
function makeGhost(
    styleSource,
    box,
    {
        clone = false,
    } = {},
) {
    // A picture (an svg, an image) is cloned because its box IS its render. So
    // is an emoji icon: it is a glyph, but the element around it may carry
    // styling a rebuilt span would lose.
    const ghost =
        clone
            ? styleSource.cloneNode(true)
            : document.createElement('span')

    ghost.removeAttribute('data-morph-split')
    ghost.removeAttribute('data-morph-icon')

    ghost.style.position =
        'absolute'

    ghost.style.margin =
        '0'

    ghost.style.left =
        '0'

    ghost.style.top =
        '0'

    ghost.style.pointerEvents =
        'none'

    ghost.style.transformOrigin =
        '0 0'

    ghost.style.transition =
        'none'

    ghost.style.opacity =
        '1'

    if (box.text) {
        if (!clone) {
            ghost.textContent =
                box.text
        }

        // No width/height: the ghost's own box has to be the box its glyphs
        // make, because that box -- measured with the same Range the
        // destination was measured with -- is what the landing is aligned by.
        ghost.style.whiteSpace =
            'nowrap'

        ghost.style.fontSize =
            box.fontSize

        ghost.style.fontFamily =
            box.fontFamily

        ghost.style.fontWeight =
            box.fontWeight

        ghost.style.letterSpacing =
            box.letterSpacing

        ghost.style.lineHeight =
            box.nativeLineHeight

        ghost.style.color =
            box.color

        const computed =
            getComputedStyle(
                styleSource ??
                document.body,
            )

        TEXT_PROPS.forEach(
            (prop) => {
                if (computed[prop] !== undefined) {
                    ghost.style[prop] =
                        computed[prop]
                }
            },
        )

        return ghost
    }

    // Not text: the box is the render, so it is pinned to the measured one. A
    // clone whose width came from its parent's layout (`width: 100%`) would
    // otherwise resolve against the flight host.
    ghost.style.width =
        `${box.width}px`

    ghost.style.height =
        `${box.height}px`

    ghost.style.color =
        box.color

    return ghost
}


// Capa de vuelo de UN modal.
//
// Vive dentro del `.apr-item` de su propio modal, no colgada de `document.body`.
// `.apr-item` tiene `isolation: isolate`, asi que el z-index de aqui adentro
// queda confinado a su contexto de apilado: el item que se cierra va antes en
// el DOM que el que entra, de modo que su texto e icono terminan la animacion
// POR DEBAJO del modal nuevo. Colgada de `body` con z-index 999999 volaba por
// encima de todo (la capa de modales es z-index 2300).
//
// El host se añade al final del item, o sea DESPUES del dialogo: el fantasma
// tiene que pintarse sobre el shell de su propio modal, que es opaco.
//
// `position: fixed` sigue resolviendo contra el viewport porque el item nunca
// lleva transform/filter/perspective (ver `placement.js`).
function makeFlightHost(container) {
    const host = document.createElement('div')

    host.className =
        'apr-ghost-flight'

    host.style.position =
        'fixed'

    host.style.inset =
        '0'

    host.style.zIndex =
        '999999'

    host.style.pointerEvents =
        'none'

    ;(container ?? document.body).appendChild(host)

    return host
}


// -----------------------------------------------------------------------------
// GHOST FLIGHT
// -----------------------------------------------------------------------------

/**
 * Interpolacion de color para el fantasma.
 *
 * `computed.color` siempre llega en `rgb()`/`rgba()` (viene de
 * `getComputedStyle`), asi que no hace falta un parser de CSS entero. Lo que no
 * se reconozca no se interpola: el fantasma se queda con el color de destino,
 * que es donde tiene que acabar, en vez de saltar a negro.
 */
function makeColorBlend(fromColor, toColor) {
    const parse = (value) => {
        const match =
            String(value || '')
                .match(
                    /rgba?\(([^)]+)\)/,
                )

        if (!match) return null

        const parts =
            match[1]
                .split(',')
                .map(
                    (part) =>
                        parseFloat(part),
                )

        return parts.length >= 3 &&
            parts
                .slice(0, 3)
                .every(Number.isFinite)
            ? parts
            : null
    }

    const from = parse(fromColor)
    const to = parse(toColor)

    if (!from || !to) {
        return () => toColor
    }

    const withAlpha =
        from.length > 3 ||
        to.length > 3

    const channels =
        [0, 1, 2].map(
            (i) => [
                from[i],
                to[i] - from[i],
            ],
        )

    const alpha = [
        from[3] ?? 1,
        (to[3] ?? 1) - (from[3] ?? 1),
    ]

    return (t) => {
        const rgb =
            channels
                .map(
                    ([base, delta]) =>
                        Math.round(
                            base + delta * t,
                        ),
                )
                .join(', ')

        if (!withAlpha) {
            return `rgb(${rgb})`
        }

        return `rgba(${rgb}, ${(alpha[0] + alpha[1] * t).toFixed(3)})`
    }
}


function flyGhosts(
    flightHost,
    specs,
    {
        duration = 0.5,
        ease = 'power3.out',
        physics = 'shell',
        aimSmooth = 0.2,

        // Pegado a la caja VIVA. `boxAt()` devuelve la esquina del shell en el
        // frame que se esta pintando; `boxStart`/`boxEnd` son las esquinas del
        // origen y del destino del vuelo (fijas). Con esto la posicion del
        // fantasma se compone como caja + offset interpolado, en vez de una
        // recta propia que comparte reloj con la caja solo de casualidad.
        //
        // Medido sin esto (scroll de 250 px en pleno cierre, placement center):
        // el texto salia de la caja hasta 53.3 px durante 14 frames -- el
        // reapuntado mueve el destino con un polo (0.2) mientras el shell lo
        // mueve con su resorte, y las dos curvas no son la misma. Ningun valor
        // del polo lo arregla: 1 daba 188.6 px, 0.05 daba 69.3 px.
        //
        // Sin `boxAt` el vuelo se comporta como antes (recta propia + polo), que
        // es lo que necesita el modo 'timeline'.
        boxAt,
        boxStart,
        boxEnd,

        onComplete,
    } = {},
) {
    if (!specs.length) {
        onComplete?.()

        return {
            kill() { },
            cleanup() { },
            isComplete() {
                return true
            },

            // Sin fantasmas no hay nada que pintar ni que reapuntar.
            paint() { },
            finish() { },
            retarget() { },
        }
    }

    // Con 'shell' el vuelo NO tiene reloj propio: es una funcion de `roundT`,
    // que es el progreso normalizado del morph. Con 'timeline' se conserva el
    // comportamiento anterior (duracion y ease propios) para poder comparar.
    const shellPhysics =
        physics === 'shell'

    // Every ascent the flight needs -- one per side's metrics -- read in a single
    // hidden pass, before anything is placed on screen.
    const ascents =
        measureAscents(specs)

    const entries = specs.map(
        (spec) => {
            const {
                fromBox,
                toBox,
            } = spec

            // Uniform scale, never X and Y separately: the two sides may carry
            // different line-heights (1.5 on the origin, 1.45 in the modal, on
            // the card) and a non-uniform scale distorts the glyphs.
            //
            // For one text the ratio of advance IS the ratio of font-size, so
            // fontScale() is the honest denominator; a width ratio would inherit
            // whatever artefact the measurement carries.
            const scale =
                spec.scale ??
                (
                    fromBox.width
                        ? toBox.width / fromBox.width
                        : 1
                )

            // The ghost is the destination's render, so the matrix travels the
            // other way: it is the START that is scaled, and the landing that is
            // scale 1.
            const startScale =
                scale
                    ? 1 / scale
                    : 1

            const ghost =
                makeGhost(
                    spec.revealEl ??
                    spec.revealContainer ??
                    spec.sourceContainer,
                    toBox,
                    {
                        clone:
                            spec.revealEl instanceof HTMLElement,
                    },
                )

            flightHost.appendChild(ghost)

            gsap.set(
                ghost,
                {
                    x: 0,
                    y: 0,

                    scale: 1,
                },
            )

            // The ghost's own ink box, read with the same Range instrument the
            // destination was measured with. Measuring the ghost instead of
            // assuming it reproduces its destination is what keeps the landing
            // honest: the alignment is done against numbers read off the two
            // real renders.
            const own =
                ghost.getBoundingClientRect()

            const ownInk =
                measureWords(ghost)[0]?.box

            const inkLeft =
                ownInk
                    ? ownInk.left - own.left
                    : 0

            const inkTop =
                ownInk
                    ? ownInk.top - own.top
                    : 0

            // The landing: the ghost's ink box exactly on the destination's ink
            // box, at scale 1. Exact by construction -- at scale 1 the ghost IS
            // the destination's render.
            const endX =
                toBox.left - own.left - inkLeft

            const endY =
                toBox.top - own.top - inkTop

            // The start: the same ghost scaled down to the origin's size, and
            // hung on the ORIGIN's baseline rather than on the origin's box.
            // Where the two sides disagree about line-height (1.5 against 1.45,
            // on the card) aligning boxes would leave the glyph off its line.
            const startX =
                fromBox.left - own.left - inkLeft * startScale

            let startY =
                fromBox.top - own.top - inkTop * startScale

            if (ownInk) {
                // The ghost's own baseline is its glyph box top plus the ascent
                // its own (destination) metrics give it. The ghost itself is
                // never probed: it is a node in the flight, and nothing of the
                // measurement belongs there.
                const ownBaseline =
                    inkTop +
                    ascents.get(ascentKey(toBox))

                // The origin word's baseline is its glyph box top plus the
                // ascent its own metrics give it. Hang the ghost on that one.
                startY =
                    fromBox.top +
                    ascents.get(ascentKey(fromBox)) -
                    own.top -
                    ownBaseline * startScale
            }

            return {
                ghost,
                startX,
                startY,
                startScale,
                endX,
                endY,

                // El aterrizaje vivo. `endX/endY` son el destino exacto (lo que
                // usa el timeline y lo que se clava al final); `wantX/wantY` es
                // a donde apunta `retarget`; `aimX/aimY` es lo que se pinta.
                // Sin reapuntado los tres valen lo mismo y el polo de `place`
                // vale exactamente 0: el vuelo normal no cambia ni un pixel.
                aimX: endX,
                aimY: endY,
                wantX: endX,
                wantY: endY,

                fromColor: fromBox.color,
                toColor: toBox.color,

                colorBlend:
                    makeColorBlend(
                        fromBox.color,
                        toBox.color,
                    ),

                // Para volver a apuntar el aterrizaje sin re-medir el fantasma:
                // `endX/endY` son offsets desde su caja base, y esa caja base no
                // se mueve (el fantasma vive en el flight host, que no se mueve).
                ownLeft:
                    own.left,

                ownTop:
                    own.top,

                inkLeft,
                inkTop,

                // Anclaje a la caja: offset de la TINTA del fantasma respecto de
                // la esquina de la caja, en los dos extremos del vuelo. Se
                // deriva de startX/endX, que ya son exactos, en vez de
                // reinterpretar la convencion de tinta: en t=0 y t=1 la cuenta
                // devuelve el mismo pixel que pintaba antes, asi que los dos
                // aterrizajes no cambian -- lo unico que cambia es el camino.
                glue:
                    boxAt && boxStart && boxEnd
                        ? {
                            x0:
                                startX +
                                own.left +
                                inkLeft * startScale -
                                boxStart.left,

                            y0:
                                startY +
                                own.top +
                                inkTop * startScale -
                                boxStart.top,

                            x1:
                                endX +
                                own.left +
                                inkLeft -
                                boxEnd.left,

                            y1:
                                endY +
                                own.top +
                                inkTop -
                                boxEnd.top,
                        }
                        : null,
            }
        },
    )

    let completed = false

    // Ultima clave pintada. En modo pegado la posicion del texto es funcion
    // EXACTA de (esquina de la caja, t): si los dos coinciden no hay nada nuevo
    // que escribir. Importa porque el bucle del motor y el ticker de gsap no
    // tienen por que caer en la misma tarea, y sin esto el mismo estado del
    // frame se volcaba dos veces.
    //
    // No vale en el camino del polo: ahi el fantasma sigue acercandose a su
    // destino con `t` constante, y saltarse el pintado lo congelaria a medio
    // camino -- que es justo lo que el polo existe para evitar.
    let lastKey = null

    const place = (entry, t, box) => {
        // Con `boxAt` el fantasma cuelga de la caja viva y el polo no participa:
        // la caja se lleva su propio resorte tambien en el reapuntado, asi que
        // texto y caja son el MISMO movimiento por construccion, no dos curvas
        // parecidas. El aterrizaje sigue siendo exacto: en t=1 el offset es el
        // del destino (x1/y1) y la esquina es la de la caja, que es el origen.
        if (entry.glue) {
            const scale =
                entry.startScale +
                (1 - entry.startScale) * t

            let x =
                box.left +
                entry.glue.x0 +
                (entry.glue.x1 - entry.glue.x0) * t -
                entry.ownLeft -
                entry.inkLeft * scale

            let y =
                box.top +
                entry.glue.y0 +
                (entry.glue.y1 - entry.glue.y0) * t -
                entry.ownTop -
                entry.inkTop * scale

            // Escritura directa, no `gsap.set`. El valor ya esta calculado aqui:
            // `gsap.set` solo anadia construir un tween (y consultar la matriz
            // viva del elemento) para volver a escribirlo. El fantasma tiene
            // `transform-origin: 0 0` y `left/top: 0`, que es exactamente lo que
            // `gsap.set(x, y, scale)` asume, asi que la cadena es equivalente y
            // no una aproximacion: `translate3d` conserva ademas el mismo camino
            // de composicion que usaba gsap.
            if (t >= 1) {
                const dpr = window.devicePixelRatio || 1
                x = Math.round(entry.endX * dpr) / dpr
                y = Math.round(entry.endY * dpr) / dpr
            } else if (t <= 0) {
                const dpr = window.devicePixelRatio || 1
                x = Math.round(entry.startX * dpr) / dpr
                y = Math.round(entry.startY * dpr) / dpr
            }

            const style =
                entry.ghost.style

            style.transform =
                `translate3d(${x}px, ${y}px, 0) scale(${t >= 1 ? 1 : scale})`

            if (entry.colorBlend) {
                style.color =
                    entry.colorBlend(t)
            }

            return
        }

        // El destino se mueve con el scroll (`retarget`) y aplicarlo en seco
        // mueve al fantasma `Δ·u` en un solo frame -- medido: 13.8 px de escape
        // de la caja con un scroll de 250 px en pleno vuelo, 40.4 px con 500.
        // El polo reparte ese salto en los frames que siguen, con una constante
        // de tiempo parecida a la del spring del shell, que tambien llega suave
        // a su destino nuevo. En `t = 1` se clava al valor exacto: el aterrizaje
        // no se negocia por suavizar. `aimSmooth: 1` = comportamiento anterior.
        if (t >= 1) {
            entry.aimX = entry.wantX
            entry.aimY = entry.wantY
        } else {
            entry.aimX += (entry.wantX - entry.aimX) * aimSmooth
            entry.aimY += (entry.wantY - entry.aimY) * aimSmooth
        }

        let px =
            entry.startX +
            (entry.aimX - entry.startX) * t

        let py =
            entry.startY +
            (entry.aimY - entry.startY) * t

        if (t >= 1) {
            const dpr = window.devicePixelRatio || 1
            px = Math.round(entry.endX * dpr) / dpr
            py = Math.round(entry.endY * dpr) / dpr
        } else if (t <= 0) {
            const dpr = window.devicePixelRatio || 1
            px = Math.round(entry.startX * dpr) / dpr
            py = Math.round(entry.startY * dpr) / dpr
        }

        const props = {
            x: px,
            y: py,
            scale:
                t >= 1
                    ? 1
                    : entry.startScale +
                      (1 - entry.startScale) * t,
        }

        // Colour is not a metric, it is the visible continuity of the flying
        // text, so it travels with the flight and lands on the destination's
        // value like everything else.
        if (entry.colorBlend) {
            props.color =
                entry.colorBlend(t)
        }

        gsap.set(
            entry.ghost,
            props,
        )
    }

    // En modo 'timeline' el vuelo se lo lleva GSAP y `paint` no interviene.
    let tl = null

    if (!shellPhysics) {
        tl = gsap.timeline({
            onComplete: () => {
                completed = true
                onComplete?.()
            },
        })

        entries.forEach(
            (entry) => {
                gsap.set(
                    entry.ghost,
                    {
                        x: entry.startX,
                        y: entry.startY,

                        scale: entry.startScale,

                        color: entry.fromColor,
                    },
                )

                // The motion ends a couple of frames before the handover, so the
                // removal of the ghost is painted after it stopped moving.
                const flightEnd =
                    Math.max(0.1, duration - 0.03)

                tl.to(
                    entry.ghost,
                    {
                        x: entry.endX,
                        y: entry.endY,

                        scale: 1,
                        color: entry.toColor,

                        duration: flightEnd,
                        ease,
                    },
                    0,
                )
            },
        )
    }

    /**
     * El vuelo del texto en `u`: 0 = salida, 1 = aterrizaje.
     */
    const paint = (u) => {
        if (!shellPhysics) return

        const t =
            u < 0
                ? 0
                : u > 1
                    ? 1
                    : u

        // La esquina viva se lee una vez por frame, no una vez por fantasma.
        const box =
            boxAt
                ? boxAt()
                : null

        if (box) {
            const key =
                `${box.left}|${box.top}|${t}`

            if (key === lastKey) {
                return
            }

            lastKey = key
        }

        entries.forEach(
            (entry) =>
                place(entry, t, box),
        )

        if (t >= 1 && !completed) {
            completed = true
            onComplete?.()
        }
    }

    // Colocacion inicial. En 'shell' el primer `paint` no llega hasta el primer
    // frame del morph, y un fantasma sin colocar se pinta en (0,0) durante ese
    // frame -- que es justo el parpadeo que no queremos.
    if (shellPhysics) {
        const box =
            boxAt
                ? boxAt()
                : null

        entries.forEach(
            (entry) =>
                place(entry, 0, box),
        )
    }

    return {
        paint,

        /**
         * Aterrizaje forzado. Lo llama el morph cuando el canal `roundT` se
         * asienta, para que el traspaso del texto no dependa de haber recibido
         * un `paint(1)` exacto. En 'timeline' no hace nada.
         */
        finish() {
            lastKey = null
            paint(1)
        },

        /**
         * El destino se movio (scroll): se vuelve a apuntar el aterrizaje con
         * las cajas vivas. Sin esto el texto vuela a donde estaba el trigger
         * ANTES del scroll -- medido: 250 px de desfase, 152 px con arrastre.
         *
         * Solo se re-apunta la POSICION. `startScale` y el color de salida
         * quedan como se construyeron: son el origen del vuelo y ya se
         * recorrieron; recalcularlos a mitad haria saltar al fantasma.
         *
         * El destino nuevo entra en `wantX/wantY`, no directo al pintado: el
         * polo de `place` lo alcanza en unos frames. `endX/endY` se mantienen
         * al dia igual porque son el valor final exacto.
         */
        retarget(boxes) {
            if (!shellPhysics) return

            // Con el texto colgado de la caja viva no hay destino que reapuntar:
            // el destino nuevo entra por la esquina del shell, que ya viaja con
            // su resorte. Reapuntar aqui moveria el aterrizaje dos veces.
            if (boxAt) return

            entries.forEach(
                (entry, i) => {
                    const box = boxes?.[i]

                    if (!box) return

                    entry.endX =
                        box.left -
                        entry.ownLeft -
                        entry.inkLeft

                    entry.endY =
                        box.top -
                        entry.ownTop -
                        entry.inkTop

                    entry.wantX = entry.endX
                    entry.wantY = entry.endY
                },
            )
        },

        kill() {
            tl?.kill()
        },

        cleanup() {
            entries.forEach(
                ({ ghost }) =>
                    ghost.remove(),
            )
        },

        isComplete() {
            return completed
        },
    }
}


// -----------------------------------------------------------------------------
// TEXT MEASUREMENT
// -----------------------------------------------------------------------------
//
// Word boxes are measured with Range rects, from the untouched DOM.
//
// This replaces measuring the boxes of a SplitText split, and that split is
// the bug: wrapping text in inline-blocks IS a layout mutation. It adds a
// line-break opportunity between every pair of words, so a title that fits on
// one line re-wraps into two the moment it is split; and an inline-block
// measures its LINE box (line-height) instead of its glyphs. Measured that way
// a ghost flies to a stacked position and lands off the baseline it is meant
// to meet.
//
// A Range rect is the glyph box instead: for one font it depends on font-size
// and on nothing else, which is what lets a single uniform scale map the
// source word exactly onto its counterpart.
//
// Two contracts follow, and both matter:
//
//   - Nothing here mutates the DOM, so nothing has to be reverted afterwards.
//   - `lineHeight` is pinned to the glyph box height, and `nativeLineHeight`
//     carries the line-height the word really renders in. The first one is what
//     makes a twin's baseline readable (no half-leading); the second one is what
//     the ghost takes, because the ghost is the destination's render and has to
//     sit in the destination's own line box.
//
// An element that is not text (an svg, an image) keeps using snapshotBox(),
// which measures an element rect rather than a Range.

function wordBox(rect, computed, text) {
    return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,

        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        fontWeight: computed.fontWeight,
        fontStyle: computed.fontStyle,
        fontStretch: computed.fontStretch,
        letterSpacing: computed.letterSpacing,

        // The glyph box height. Pinned onto a twin's line-height it makes
        // half-leading zero, which is how the origin's baseline is read (see
        // originAscent).
        lineHeight: `${rect.height}px`,

        // The line-height the word really renders in. This is the one the ghost
        // takes when it is built as the destination's render.
        nativeLineHeight: computed.lineHeight,

        color: computed.color,

        text,
    }
}


function measureWords(element) {
    const walker =
        document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
        )

    const nodes = []

    while (walker.nextNode()) {
        if (walker.currentNode.data.length) {
            nodes.push(walker.currentNode)
        }
    }

    if (!nodes.length) return []

    // Global character offset -> (text node, offset), so a word spanning more
    // than one text node is still one Range.
    const offsets = []

    nodes.forEach(
        (node) => {
            for (
                let i = 0;
                i < node.data.length;
                i++
            ) {
                offsets.push([node, i])
            }
        },
    )

    const text =
        nodes
            .map((node) => node.data)
            .join('')

    const words = []

    const pattern = /\S+/g

    let match

    while ((match = pattern.exec(text))) {
        const start =
            offsets[match.index]

        const end =
            offsets[
            match.index +
            match[0].length - 1
            ]

        if (!start || !end) continue

        const range =
            document.createRange()

        range.setStart(start[0], start[1])
        range.setEnd(end[0], end[1] + 1)

        const rect =
            range.getClientRects()[0] ??
            range.getBoundingClientRect()

        // A zero-sized box means the word is not being rendered at all (a
        // display:none origin, for instance). There is no flight to make.
        if (!rect || !rect.width || !rect.height) {
            continue
        }

        // The word's own style, so a styled word keeps its colour and size
        // instead of reporting the container's.
        const computed =
            getComputedStyle(
                start[0].parentElement ??
                element,
            )

        words.push({
            text: match[0],

            box:
                wordBox(
                    rect,
                    computed,
                    match[0],
                ),
        })
    }

    return words
}


// -----------------------------------------------------------------------------
// PLANO DE HILERAS
// -----------------------------------------------------------------------------
//
// Que las palabras se apilen (una por hilera) o no es una decision del DESTINO:
// el origen solo decide por donde empieza cada fantasma. Pero "una caja por
// palabra" no basta para que la regla se cumpla: si la medida de UNA palabra se
// va unos pixeles de su hilera -- dos metricas en la misma frase, un borde
// subpixel, un redondeo de tracking -- ese fantasma aterriza fuera de la fila y
// el vuelo se ve apilado aunque la frase sea de una sola hilera.
//
// Asi que las cajas se agrupan en hileras ANTES de volar, y las que comparten
// fila se pegan al top de su fila. La regla pasa a ser una propiedad del plano
// y no una casualidad de la medida:
//
//   origen 1 hilera  + destino 1 hilera  -> el vuelo es UNA hilera
//   origen apilado   + destino 1 hilera  -> empieza apilado y se corrige
//                                          (manda el destino: aterriza en una)
//   origen 1 hilera  + destino apilado   -> el vuelo se apila
//
// El agrupado es conservador a proposito: dos palabras son de la misma hilera
// si sus tops distan menos de media caja de glifo. Dos hileras DE VERDAD distan
// un interlineado entero (>= 1 caja de glifo), asi que no se pueden fundir y la
// tercera fila de la tabla no se puede perder. Medido en `#/gsap-morph`: las
// palabras de una hilera miden el mismo top al pixel, y las dos hileras de
// destino del pill estan a 46 px -- cero ambiguedad.
//
// El pegado va POR CLASE DE METRICA. Dos palabras de la misma frase con tamaños
// distintos comparten linea base pero NO comparten top (la caja de glifo de la
// grande empieza mas arriba), y pegarlas al mismo top las desalinearia del
// sitio donde el navegador las dibuja. Dentro de una clase la linea base es la
// misma, asi que pegar los tops es exactamente alinear los renglones.

function metricsKey(box) {
    return [
        box.fontFamily,
        box.fontSize,
        box.fontWeight,
        box.fontStyle,
        box.fontStretch,
        box.letterSpacing,
    ].join('|')
}


function snapRows(words) {
    const classes = new Map()

    for (const word of words) {
        const key = metricsKey(word.box)

        if (!classes.has(key)) classes.set(key, [])

        classes.get(key).push(word.box)
    }

    for (const boxes of classes.values()) {
        if (boxes.length < 2) continue

        const rows = []

        for (const box of boxes) {
            const tolerance = Math.max(1, box.height * 0.5)

            const row =
                rows.find(
                    (candidate) =>
                        Math.abs(candidate.anchor - box.top) <= tolerance,
                )

            if (row) {
                row.top = Math.min(row.top, box.top)
                row.boxes.push(box)
                continue
            }

            rows.push({
                anchor: box.top,
                top: box.top,
                boxes: [box],
            })
        }

        for (const row of rows) {
            for (const box of row.boxes) box.top = row.top
        }
    }

    return words
}


// Same font on both sides means the glyph box scales with font-size. A width
// ratio would inherit any width artefact of the measurement instead.
function fontScale(fromBox, toBox) {
    const from =
        parseFloat(fromBox.fontSize)

    const to =
        parseFloat(toBox.fontSize)

    if (from > 0 && to > 0) {
        return to / from
    }

    return fromBox.width
        ? toBox.width / fromBox.width
        : 1
}


function snapBoxToChassis(box, el, root) {
    if (!box || !el || !root || typeof window === 'undefined') return box
    const dpr = window.devicePixelRatio || 1
    if (dpr <= 0) return box

    // Only apply button-chassis snapping if root is a button or el is inside a button (.btn-text)
    const chassis = el.closest?.('.btn-text')
    const isButton = Boolean(
        chassis ||
        root.matches?.('.btn, .apr-btn, [class*="btn"], button') ||
        root.tagName === 'BUTTON'
    )

    if (!isButton) {
        return box
    }

    const container =
        chassis ||
        (el.parentElement && el.parentElement !== root && root.contains(el.parentElement) ? el.parentElement : null)

    if (!container) {
        return box
    }

    const rRoot = root.getBoundingClientRect()
    const rChassis = container.getBoundingClientRect()

    const rootTopDev = Math.round(rRoot.top * dpr)
    const rootLeftDev = Math.round(rRoot.left * dpr)
    const rootHDev = Math.round(rRoot.height * dpr)
    const rootWDev = Math.round(rRoot.width * dpr)

    const chassisHDev = Math.round(rChassis.height * dpr)
    const chassisWDev = Math.round(rChassis.width * dpr)

    const chassisTopDev = rootTopDev + Math.round((rootHDev - chassisHDev) / 2)
    const chassisLeftDev = rootLeftDev + Math.round((rootWDev - chassisWDev) / 2)

    const snappedChassisTop = chassisTopDev / dpr
    const snappedChassisLeft = chassisLeftDev / dpr

    const relTop = box.top - rChassis.top
    const relLeft = box.left - rChassis.left

    return {
        ...box,
        top: snappedChassisTop + relTop,
        left: snappedChassisLeft + relLeft,
    }
}


// -----------------------------------------------------------------------------
// GHOST SPEC COLLECTION
// -----------------------------------------------------------------------------

function collectGhostSpecs(
    fromRoot,
    toRoot,
) {
    const specs = []

    if (!fromRoot || !toRoot) {
        return { specs }
    }

    // -------------------------------------------------------------------------
    // TEXT
    // -------------------------------------------------------------------------

    const fromWords =
        fromRoot.querySelectorAll(
            '[data-morph-split], [data-apr-id="shared-text"]',
        )

    fromWords.forEach(
        (fromEl) => {
            const key =
                fromEl.getAttribute(
                    'data-morph-split',
                ) || fromEl.getAttribute(
                    'data-apr-id',
                )

            const toEl =
                toRoot.querySelector(
                    `[data-morph-split="${key}"], [data-apr-id="${key}"]`,
                )

            if (!toEl) return

            const sources =
                snapRows(
                    measureWords(
                        fromEl,
                    ),
                )

            const targets =
                measureWords(
                    toEl,
                )

            const count =
                Math.min(
                    sources.length,
                    targets.length,
                )

            for (
                let i = 0;
                i < count;
                i++
            ) {
                specs.push({
                    type: 'text',

                    // There is no split element to clone: the ghost is built
                    // from the word text and the measured box. Nothing in the
                    // DOM was touched, so these are the boxes on screen.
                    sourceEl: null,

                    index: i,

                    sourceContainer:
                        fromEl,

                    revealContainer:
                        toEl,

                    fromBox:
                        snapBoxToChassis(
                            sources[i].box,
                            fromEl,
                            fromRoot,
                        ),

                    toBox:
                        snapBoxToChassis(
                            targets[i].box,
                            toEl,
                            toRoot,
                        ),

                    scale:
                        fontScale(
                            sources[i].box,
                            targets[i].box,
                        ),

                    // Vuelve a medir la caja DESTINO viva, con el mismo
                    // instrumento que la midio la primera vez. Lo usa el
                    // reapuntado del cierre: si el trigger se movio con el
                    // scroll, el texto tiene que aterrizar donde esta AHORA.
                    measureToBox:
                        () => {
                            if (!toEl.isConnected) {
                                return null
                            }

                            const box =
                                measureWords(
                                    toEl,
                                )[i]?.box

                            return box
                                ? snapBoxToChassis(
                                    box,
                                    toEl,
                                    toRoot,
                                )
                                : null
                        },
                })
            }
        },
    )


    // -------------------------------------------------------------------------
    // ICONS
    // -------------------------------------------------------------------------

    const fromIcons =
        fromRoot.querySelectorAll(
            '[data-morph-icon], [data-apr-id="shared-icon"]',
        )

    fromIcons.forEach(
        (fromEl) => {
            const key =
                fromEl.getAttribute(
                    'data-morph-icon',
                ) || fromEl.getAttribute(
                    'data-apr-id',
                )

            const toEl =
                toRoot.querySelector(
                    `[data-morph-icon="${key}"], [data-apr-id="${key}"]`,
                )

            if (!toEl) return

            // An icon that is text (an emoji) is measured exactly like text:
            // glyph box + font-size scale. That keeps its baseline -- and so
            // its ink -- under the same rule as the words, instead of taking a
            // scale from a box whose width and line box do not scale with the
            // font. Anything else (an svg, an image) has no glyph box, so it
            // keeps the element rect and the width ratio.
            const sources =
                measureWords(
                    fromEl,
                )

            const targets =
                measureWords(
                    toEl,
                )

            const glyph =
                sources.length === 1 &&
                targets.length === 1

            specs.push({
                type: 'icon',

                sourceEl:
                    glyph
                        ? null
                        : fromEl,

                revealEl: toEl,

                sourceContainer:
                    fromEl,

                revealContainer:
                    toEl,

                index: 0,

                glyph,

                fromBox:
                    snapBoxToChassis(
                        glyph
                            ? sources[0].box
                            : snapshotBox(
                                fromEl,
                            ),
                        fromEl,
                        fromRoot,
                    ),

                toBox:
                    snapBoxToChassis(
                        glyph
                            ? targets[0].box
                            : snapshotBox(
                                toEl,
                            ),
                        toEl,
                        toRoot,
                    ),

                scale:
                    glyph
                        ? fontScale(
                            sources[0].box,
                            targets[0].box,
                        )
                        : null,

                // Ver el spec de texto: misma caja destino, viva.
                measureToBox:
                    () => {
                        if (!toEl.isConnected) {
                            return null
                        }

                        const box = glyph
                            ? (
                                measureWords(
                                    toEl,
                                )[0]?.box ??
                                null
                            )
                            : snapshotBox(
                                toEl,
                            )

                        return box
                            ? snapBoxToChassis(
                                box,
                                toEl,
                                toRoot,
                            )
                            : null
                    },
            })
        },
    )


    // No revert closure: measuring never touched the DOM.

    return { specs }
}


function filterGhostSpecs(
    specs,
    ghostTargets = 'all',
) {
    if (ghostTargets === 'icon') {
        return specs.filter(
            (spec) =>
                spec.type === 'icon',
        )
    }

    if (ghostTargets === 'text') {
        return specs.filter(
            (spec) =>
                spec.type !== 'icon',
        )
    }

    return specs
}


// -----------------------------------------------------------------------------
// GHOST VISIBILITY OWNERSHIP
// -----------------------------------------------------------------------------
//
// La propiedad va por ELEMENTO, con recuento. No por transicion.
//
// Los vuelos se solapan: una rafaga al mismo trigger mantiene tres transiciones
// vivas escondiendo el icono y el texto del MISMO origin. Guardar en cada
// controlador el `style.opacity` que se leyo al construirse NO los protege --
// el segundo lee el '0' que escribio el primero y al soltar lo deja en '0'.
//
// Medido con un MutationObserver sobre el trigger, desde pagina limpia: la
// ultima escritura de una rafaga es `'' -> '0'` sobre el icono y el texto,
// con 0 items y 0 vuelos vivos. No es un `hide()`: es el `show()` de una
// transicion vieja devolviendo un '0' que capturo mientras otra escondia. A
// partir de ahi la fuga se auto-perpetua, porque escribir '0' sobre '0' no
// cambia el atributo: cada transicion siguiente vuelve a capturar '0'. El
// origin queda vacio para siempre (su icono y su texto con opacity 0 inline,
// pase lo que pase). El mismo `show()` fuera de orden, cuando le toca escribir
// '' mientras un vuelo nuevo sigue en el aire, es el texto duplicado que se ve
// en una rafaga.
//
// Con recuento: el PRIMERO guarda el valor natural (el que no escribio ninguna
// transicion) y el ULTIMO en soltar lo devuelve. El orden deja de importar.
//
// Todas las salidas liberan: `cleanup()` (settle, abort, _cancelImpl, dispose)
// y `abandonContent()`, en las dos transiciones.
// -----------------------------------------------------------------------------

const opacityClaims =
    new WeakMap()


function claimOpacity(el) {
    let claim =
        opacityClaims.get(el)

    if (!claim) {
        claim = {
            count: 0,
            natural:
                el.style.opacity,
        }

        opacityClaims.set(el, claim)
    }

    claim.count += 1

    el.style.opacity = '0'
}


function releaseOpacity(el) {
    const claim =
        opacityClaims.get(el)

    if (!claim) return

    claim.count -= 1

    if (claim.count > 0) return

    opacityClaims.delete(el)

    el.style.opacity =
        claim.natural
}


function createVisibilityController(
    elements,
) {
    const owned = []

    let hidden = false
    let restored = false

    const hide = () => {
        if (hidden || restored) return

        hidden = true

        elements.forEach(
            (el) => {
                if (owned.includes(el)) return

                owned.push(el)

                claimOpacity(el)
            },
        )
    }

    const show = () => {
        if (restored) return

        restored = true

        for (
            let i = owned.length - 1; i >= 0; i -= 1
        ) {
            releaseOpacity(
                owned[i],
            )
        }

        owned.length = 0
    }

    return {
        hide,
        show,

        // Soltar es lo mismo que restaurar: con recuento, si otro vuelo sigue
        // reclamando el elemento el valor natural no vuelve hasta que ese otro
        // suelte. Antes se descartaban los registros SIN soltar nada, asi que
        // una reclamacion podia quedarse viva para siempre.
        clear: show,
    }
}


// -----------------------------------------------------------------------------
// CONTENT VISUAL CONTROLLER
// -----------------------------------------------------------------------------

function createContentController(
    bodyEl,
    config,
    opening,
) {
    let fadingElements = []

    // El contenido puede dejar de ser de esta transicion: el nodo vivo se lo
    // queda otro modal (el nuevo, el que si interactua) y aqui solo queda una
    // copia. Desde ese momento este control deja de escribir, o estaria
    // moviendo el contenido del modal de al lado.
    let detached = false

    if (!bodyEl) {
        return {
            fadingElements,

            prepare() { },
            animateIn() { },
            animateOut() { },
            restore() { },
            reset() { },
            setScale() { },
            setBlur() { },
        }
    }

    bodyEl.style.transformOrigin =
        'center center'

    const blurPx = Number(config.contentBlur) || 12
    const scaleVal = Number(config.contentScale) || 0.96

    if (config.mode === 'gsap') {
        fadingElements =
            getFadingElements(
                bodyEl,
            )

        if (opening) {
            fadingElements.forEach(
                (el) => {
                    el.style.transition = 'none'
                    el.style.filter = `blur(${blurPx}px)`
                    el.style.opacity = '0'
                    el.style.transform = `translate(-10px, -10px) scale(${scaleVal})`
                },
            )
        } else {
            fadingElements.forEach(
                (el) => {
                    el.style.transition = 'none'
                    el.style.filter = 'none'
                    el.style.opacity = '1'
                    el.style.transform = 'none'
                },
            )
        }
    }

    return {
        fadingElements,

        detach() {
            detached = true
        },

        prepare() {
            if (config.mode !== 'gsap') {
                bodyEl.style.transition =
                    'none'

                bodyEl.style.transform =
                    `scale(${opening ? config.contentScale : 1})`

                bodyEl.style.filter =
                    `blur(${opening ? config.contentBlur : 0}px)`

                bodyEl.style.opacity =
                    opening ? '0' : '1'
            }
        },

        animateIn() {
            if (config.mode === 'gsap') {
                if (detached || !fadingElements.length) return

                const bodyRect = bodyEl.getBoundingClientRect()
                const diags = fadingElements.map((el) => {
                    const r = el.getBoundingClientRect()
                    return (r.top - bodyRect.top) + (r.left - bodyRect.left)
                })

                const minDiag = Math.min(...diags)
                const maxDiag = Math.max(...diags)
                const range = Math.max(maxDiag - minDiag, 1)

                const baseDelay = Number(config.colorDelay) || 0.12
                const sweepSpread = 0.18
                const duration = Number(config.contentDuration) || 0.35
                const ease = 'cubic-bezier(0.16, 1, 0.3, 1)'

                // Force reflow before applying transitions
                void bodyEl.offsetWidth

                fadingElements.forEach(
                    (el, i) => {
                        const norm = (diags[i] - minDiag) / range
                        const delay = baseDelay + norm * sweepSpread

                        el.style.transition = [
                            `opacity ${duration}s ${ease} ${delay.toFixed(3)}s`,
                            `filter ${duration}s ${ease} ${delay.toFixed(3)}s`,
                            `transform ${duration}s ${ease} ${delay.toFixed(3)}s`
                        ].join(', ')

                        el.style.opacity = '1'
                        el.style.filter = 'blur(0px)'
                        el.style.transform = 'translate(0px, 0px) scale(1)'
                    },
                )

                return
            }

            bodyEl.style.transition =
                `opacity ${config.colorDuration}s ease-out ${config.colorDelay}s`

            bodyEl.style.opacity =
                '1'
        },

        animateOut() {
            if (config.mode === 'gsap') {
                if (detached || !fadingElements.length) return

                const bodyRect = bodyEl.getBoundingClientRect()
                const diags = fadingElements.map((el) => {
                    const r = el.getBoundingClientRect()
                    return (r.top - bodyRect.top) + (r.left - bodyRect.left)
                })

                const minDiag = Math.min(...diags)
                const maxDiag = Math.max(...diags)
                const range = Math.max(maxDiag - minDiag, 1)

                const closeDuration = Number(config.closeContentDuration) || 0.18
                const closeEase = 'cubic-bezier(0.4, 0, 1, 1)'

                fadingElements.forEach(
                    (el, i) => {
                        const norm = (diags[i] - minDiag) / range
                        const delay = (1 - norm) * 0.08

                        el.style.transition = [
                            `opacity ${closeDuration}s ${closeEase} ${delay.toFixed(3)}s`,
                            `filter ${closeDuration}s ${closeEase} ${delay.toFixed(3)}s`,
                            `transform ${closeDuration}s ${closeEase} ${delay.toFixed(3)}s`
                        ].join(', ')

                        el.style.opacity = '0'
                        el.style.filter = `blur(${blurPx}px)`
                        el.style.transform = `translate(-10px, -10px) scale(${scaleVal})`
                    },
                )

                return
            }

            bodyEl.style.transition =
                `opacity ${config.closeContentDuration}s ease-in`

            bodyEl.style.opacity =
                '0'
        },

        setScale(value) {
            if (config.mode === 'gsap') {
                return
            }

            bodyEl.style.transform =
                `scale(${value})`
        },

        setBlur(value) {
            if (config.mode === 'gsap') {
                return
            }

            bodyEl.style.filter =
                `blur(${value}px)`
        },

        // Restaura los elementos del contenido aunque esta transicion ya no sea
        // su dueña. `reset()` se los salta cuando el nodo vivo se fue a otro
        // modal, y si no se limpiara aqui quedarian con la opacidad 0 (y el
        // scale/blur) que grabo esta apertura: el modal que los hereda los
        // devolveria invisibles.
        restore() {
            if (config.mode !== 'gsap') {
                return
            }

            fadingElements.forEach(
                (el) => {
                    el.style.opacity = ''
                    el.style.filter = ''
                    el.style.transform = ''
                    el.style.transition = ''
                },
            )
        },

        reset() {
            if (config.mode === 'gsap') {
                if (!detached) {
                    fadingElements.forEach(
                        (el) => {
                            el.style.opacity = ''
                            el.style.filter = ''
                            el.style.transform = ''
                            el.style.transition = ''
                        },
                    )
                }
            }

            bodyEl.style.transformOrigin = ''
            bodyEl.style.transform = ''
            bodyEl.style.filter = ''
            bodyEl.style.opacity = ''
            bodyEl.style.transition = ''
        },
    }
}


// -----------------------------------------------------------------------------
// MOTION CREATION
// -----------------------------------------------------------------------------

function createMorphMotion(
    initialState,
    state,
    shellStyle,
    fromRound,
    toRound,
    bodyEl,
    contentController,
    controller,
    onComplete,

    // Accesor DIFERIDO, no el fantasma: este motion se construye antes que el
    // vuelo del texto (hay que medir la caja destino antes de saber que vuela),
    // asi que aqui todavia no existe nada que pasar. Se resuelve en cada frame.
    getGhosts = () => null,
) {
    const pending = new Set([
        'x',
        'y',
        'width',
        'height',
        'roundT',
        'contentScale',
        'contentBlur',
    ])

    let finished = false

    // ── Un volcado al DOM por frame, no uno por canal ───────────────────────
    //
    // `onChange` se llama una vez POR CANAL, y en un vuelo de caja cambian x, y,
    // width, height y roundT dentro del mismo frame: cinco llamadas, cinco
    // `paintShell` y cinco pintados de fantasma sobre el mismo elemento. El
    // navegador solo pinta el estado FINAL del frame, asi que los anteriores son
    // trabajo que nadie ve.
    //
    // Los canales se actualizan dentro de UNA sola tarea (`MotionLoop.tick`
    // recorre todos los canales seguidos), asi que una microtarea -- que corre al
    // vaciarse la pila de esa tarea, antes de que el navegador pinte -- junta las
    // cinco llamadas en un solo volcado con los valores ya finales: ni un frame
    // de retraso ni un valor a medias.
    let flushed = false

    const flush = () => {
        flushed = false

        if (!controller.isCurrent()) {
            return
        }

        paintShell(
            shellStyle,
            state,
            fromRound,
            toRound,
        )

        // El texto que vuela cuelga del MISMO reloj que la caja: `roundT` es el
        // progreso normalizado del morph, el mismo del que `paintShell` saca los
        // cuatro radios. Asi el texto y la caja se pintan en el mismo frame y
        // con el mismo valor, que es lo que mantiene al texto dentro de la caja.
        //
        // Se repinta con CUALQUIER canal de caja, no solo con `roundT`: en modo
        // gsap `roundT` es una easing de `radiusDuration` (0.32 s) y asienta
        // antes que el resorte de x/y, asi que un texto pintado solo con
        // `roundT` se quedaba clavado mientras la caja seguia viajando -- medido
        // en el reapuntado del scroll: 53.3 px de escape.
        getGhosts()
            ?.paint(state.roundT)
    }

    const scheduleFlush = () => {
        if (flushed) {
            return
        }

        flushed = true
        queueMicrotask(flush)
    }

    const motion = createMotion(
        {
            ...initialState,
        },
        {
            onChange(key, value) {
                if (!controller.isCurrent()) {
                    return
                }

                if (key in state) {
                    state[key] = value

                    scheduleFlush()

                    return
                }

                if (
                    key === 'contentScale' &&
                    bodyEl
                ) {
                    contentController
                        .setScale(value)

                    return
                }

                if (
                    key === 'contentBlur' &&
                    bodyEl
                ) {
                    contentController
                        .setBlur(value)
                }
            },

            onSettle(key) {
                if (!controller.isCurrent()) {
                    return
                }

                // Lo pendiente se vuelca ANTES de dar el canal por asentado: el
                // traspaso del contenido mide el DOM vivo, y tiene que medir el
                // estado final del frame, no el anterior.
                if (flushed) {
                    flush()
                }

                pending.delete(key)

                if (
                    pending.size === 0 &&
                    !finished
                ) {
                    getGhosts()
                        ?.finish()
                    finished = true
                    onComplete?.()
                }
            },
        },
    )

    return {
        motion,

        // Volcado a mano. Lo necesita el cierre: el scroll mueve el destino sin
        // tocar ningun canal (ver `pageCorr`), y el volcado normal cuelga de
        // `onChange` -- un canal ya asentado no vuelve a llamar, asi que sin
        // esta entrada el shell se quedaria clavado en la ultima posicion
        // pintada mientras la pagina sigue moviendose debajo.
        flush,

        get finished() {
            return finished
        },
    }
}


// -----------------------------------------------------------------------------
// MORPH FROM ORIGIN
// -----------------------------------------------------------------------------

export function gsapMorphFromOrigin({
    dialogEl,
    shellEl,
    bodyEl,
    origin,
    originStyle,
    options = {},
    onSettle,
}) {
    const config = {
        ...MORPH_DEFAULTS,
        ...options,
    }

    const controller =
        createTransitionController(
            shellEl,
        )

    let settled = false
    let safetyTimer = null

    let ghostFlight = null
    let flightHost = null

    let visibilityController = null

    let contentController = null

    let motionController = null

    let ghostFinished = false
    let motionFinished = false

    // Lo pone `settle({ keepGeometry: true })`: el cierre que nos releva va a
    // medir la geometria VIVA justo despues, asi que el slot no se suelta.
    let keepFrozen = false

    // El DESTINO del dialogo no lo escribe este motor: lo escribe el host en
    // `layoutSlot` (position/left/top inline) antes de que empecemos a volar.
    // `clearFrozen` los borra igual, y el dialogo cae entonces al `flex-start`
    // de `.apr-item`, que es la esquina (0,0) del viewport. Medido en
    // `#/gsap-morph`, apertura de `.trigger-card`, un frame por sample a 60 fps:
    //
    //   t=23539  pos="" top="" left=""   rect [0,0 373x367]   <- EL FRAME MALO
    //   t=23555  pos="absolute" top="344.9px" left="97.7875px" rect [98,345 ...]
    //
    // y vuelve solo porque el `trackOrigin` del host corre en el rAF siguiente
    // y re-coloca. O sea: un frame pintado en (0,0) justo al asentar, que es el
    // parpadeo que ve el dueno.
    //
    // `center` se libra por construccion: `layoutSlot` le deja las tres
    // propiedades en `''`, asi que borrarlas es un no-op. Las otras diez
    // variantes (`anchor`, `bottom`, `inplace-*`) las llevan inline y son las
    // que parpadean -- medido: 1 frame en (0,0) en las diez, 0 en `center`.
    //
    // Se guardan aqui, antes de que el vuelo toque nada, y se devuelven tal
    // cual: son los valores que `place()` ya calculo, asi que no hay medida
    // nueva ni riesgo de saltar. El motor de CIERRE si escribe estas tres
    // (para clavar el dialogo mientras mide) y por eso su cleanup tiene que
    // seguir borrandolas -- por eso la restauracion va en el `if (!keepFrozen)`
    // de aqui abajo, que es el unico de los dos que no las escribio.
    const slotOwnedByHost = {
        position: dialogEl.style.position,
        top: dialogEl.style.top,
        left: dialogEl.style.left,
    }

    // -------------------------------------------------------------------------
    // INTERNAL CLEANUP
    // -------------------------------------------------------------------------

    const cleanup = ({
        restoreOriginElement = false,
        hideShell = false,
        notify = false,
    } = {}) => {
        if (settled) return

        settled = true

        if (safetyTimer) {
            clearTimeout(safetyTimer)
            safetyTimer = null
        }

        motionController?.motion?.stop()

        ghostFlight?.kill()
        ghostFlight?.cleanup()

        ghostFlight = null

        if (flightHost) {
            flightHost.remove()
            flightHost = null
        }

        visibilityController?.show()

        contentController?.reset()

        if (restoreOriginElement) {
            restoreOrigin(
                origin,
                {
                    instant: true,
                },
            )
        }

        // Si el cierre nos releva a media apertura, el slot congelado se
        // queda: soltarlo aqui haria que su freezeSlot midiera la geometria
        // natural y el modal saltaria a tamano completo antes de cerrarse.
        if (!keepFrozen) {
            clearFrozen(
                dialogEl,
                shellEl,
                bodyEl,
            )

            // `clearFrozen` suelta tambien las tres propiedades del DESTINO,
            // que no son suyas (ver `slotOwnedByHost`): sin devolverlas, el
            // dialogo se pinta un frame en (0,0) al asentar. Se devuelven en
            // este mismo tick, antes de que el navegador pinte, asi que el
            // frame malo no llega a existir.
            dialogEl.style.position =
                slotOwnedByHost.position

            dialogEl.style.top =
                slotOwnedByHost.top

            dialogEl.style.left =
                slotOwnedByHost.left
        }

        // Despues de clearFrozen a proposito: entre las propiedades que suelta
        // esta `display`, asi que al reves el hideShell quedaba en nada.
        if (hideShell) {
            shellEl.style.display =
                'none'
        }

        controller.release()

        if (notify) {
            onSettle?.()
        }
    }


    // -------------------------------------------------------------------------
    // COMPLETE ONLY AFTER BOTH MOTION + GHOST HAVE FINISHED
    // -------------------------------------------------------------------------

    const tryFinish = () => {
        if (!controller.isCurrent()) {
            return
        }

        if (settled) {
            return
        }

        if (!motionFinished) {
            return
        }

        if (!ghostFinished) {
            return
        }

        cleanup({
            notify: true,
        })
    }


    // -------------------------------------------------------------------------
    // INITIAL GEOMETRY
    // -------------------------------------------------------------------------

    const shellRect =
        freezeSlot(
            dialogEl,
            shellEl,
            bodyEl,
        )


    // -------------------------------------------------------------------------
    // GHOST COLLECTION
    // -------------------------------------------------------------------------

    let ghostSpecs = []

    // Neutralizar cualquier resorte activo (:active o transicion de clic) antes
    // de medir para que tanto los fantasmas como el originRect nazcan en la
    // geometria de reposo natural al 100%.
    if (origin instanceof HTMLElement && getComputedStyle(origin).transform !== 'none') {
        if (!originTransitions.has(origin)) {
            originTransitions.set(origin, origin.style.transition)
        }
        if (!originTransforms.has(origin)) {
            originTransforms.set(origin, origin.style.transform)
        }
        origin.style.transition = 'none'
        origin.style.transform = 'none'
        void origin.offsetWidth
    }

    if (config.mode === 'gsap') {
        const collection =
            collectGhostSpecs(
                origin,
                dialogEl,
            )

        ghostSpecs =
            filterGhostSpecs(
                collection.specs,
                config.ghostTargets,
            )
    }


    // -------------------------------------------------------------------------
    // ORIGIN GEOMETRY
    // -------------------------------------------------------------------------

    const originRect =
        origin.getBoundingClientRect()

    const fromX =
        originRect.left -
        shellRect.left

    const fromY =
        originRect.top -
        shellRect.top


    // -------------------------------------------------------------------------
    // COLORS / RADIUS
    // -------------------------------------------------------------------------

    const originComputed =
        getComputedStyle(origin)

    const fromBackground =
        originStyle?.background ??
        originComputed.background

    const fromShadow =
        originStyle?.boxShadow ??
        originComputed.boxShadow

    const fromRound =
        cornerRoundness(
            originComputed,
            originRect.width,
            originRect.height,
            originStyle?.borderRadius,
        )


    const shellComputed =
        getComputedStyle(shellEl)

    const toBackground =
        shellComputed.background

    const toShadow =
        shellComputed.boxShadow

    const toRound =
        cornerRoundness(
            shellComputed,
            shellRect.width,
            shellRect.height,
        )

    const startShadow =
        transparentShadow(
            toShadow,
        )


    // -------------------------------------------------------------------------
    // LAUNCH DIRECTION
    // -------------------------------------------------------------------------

    const launchX =
        (
            originRect.left +
            originRect.width / 2
        ) < window.innerWidth / 2
            ? 1
            : -1

    const launchY =
        (
            originRect.top +
            originRect.height / 2
        ) < window.innerHeight / 2
            ? 1
            : -1


    // -------------------------------------------------------------------------
    // STATE
    // -------------------------------------------------------------------------

    const shellStyle =
        shellEl.style

    const state = {
        x: fromX,
        y: fromY,

        width:
            originRect.width,

        height:
            originRect.height,

        roundT: 0,
    }


    shellStyle.position =
        'absolute'

    shellStyle.top =
        '0px'

    shellStyle.left =
        '0px'

    shellStyle.opacity =
        '1'

    shellStyle.transition =
        'none'

    paintShell(
        shellStyle,
        state,
        fromRound,
        toRound,
    )

    shellStyle.background =
        fromBackground

    shellStyle.boxShadow =
        startShadow


    // -------------------------------------------------------------------------
    // CONTENT
    // -------------------------------------------------------------------------

    contentController =
        createContentController(
            bodyEl,
            config,
            true,
        )

    contentController.prepare()


    // -------------------------------------------------------------------------
    // HIDE ORIGIN
    // -------------------------------------------------------------------------

    // `clickable: true` siempre: el trigger se oculta a la vista pero sigue
    // recogiendo el clic. Con el modal abierto la pagina esta `inert`, asi que
    // la primera picada la recoge el overlay y cierra; en cuanto el cierre
    // empieza (y el lock se suelta) el trigger vuelve a responder, que es lo
    // que hace posible el doble clic de memoria muscular.
    hideOrigin(
        origin,
        {
            clickable: true,
        },
    )


    // -------------------------------------------------------------------------
    // VISIBILITY OWNERSHIP
    // -------------------------------------------------------------------------

    if (config.mode === 'gsap') {
        const elementsToHide = []

        ghostSpecs.forEach(
            (spec) => {
                if (
                    spec.sourceContainer &&
                    !elementsToHide.includes(
                        spec.sourceContainer,
                    )
                ) {
                    elementsToHide.push(
                        spec.sourceContainer,
                    )
                }

                if (
                    spec.revealContainer &&
                    !elementsToHide.includes(
                        spec.revealContainer,
                    )
                ) {
                    elementsToHide.push(
                        spec.revealContainer,
                    )
                }
            },
        )

        visibilityController =
            createVisibilityController(
                elementsToHide,
            )

        visibilityController.hide()
    }


    // -------------------------------------------------------------------------
    // START CSS VISUAL TRANSITION
    // -------------------------------------------------------------------------

    void shellEl.offsetWidth

    shellStyle.transition = [
        `background ${config.colorDuration}s ease-out ${config.colorDelay}s`,
        `box-shadow ${config.shadowDuration}s ease-out ${config.shadowDelay}s`,
    ].join(', ')

    shellStyle.background =
        toBackground

    shellStyle.boxShadow =
        toShadow

    contentController.animateIn()


    // -------------------------------------------------------------------------
    // MOTION
    // -------------------------------------------------------------------------

    const initialState = {
        ...state,

        contentScale:
            config.contentScale,

        contentBlur:
            config.contentBlur,
    }

    motionController =
        createMorphMotion(
            initialState,
            state,
            shellStyle,
            fromRound,
            toRound,
            bodyEl,
            contentController,
            controller,
            () => {
                motionFinished = true
                tryFinish()
            },

            // El vuelo del texto, resuelto en cada frame: aqui todavia no
            // existe (se construye mas abajo, despues de medir el destino).
            () => ghostFlight,
        )


    const isTransform =
        config.mode === 'transform' ||
        config.mode === 'gsap'


    const travel = {
        stiffness:
            config.stiffness,

        damping:
            config.damping,

        velocity:
            config.velocity,
    }


    const size =
        sizeSpring(config)


    const targetState = {
        x: 0,
        y: 0,

        width:
            shellRect.width,

        height:
            shellRect.height,

        roundT: 1,

        contentScale: 1,
        contentBlur: 0,
    }

    const geomSprings =
        synchronizedGeometrySprings(
            config,
            state,
            targetState,
            { close: false },
        )

    const springs = {
        x:
            isTransform
                ? geomSprings.x
                : spring({
                    ...travel,
                    direction: launchX,
                }),

        y:
            isTransform
                ? geomSprings.y
                : spring({
                    ...travel,
                    direction: launchY,
                }),

        width:
            geomSprings.width,

        height:
            geomSprings.height,

        roundT:
            isTransform
                ? geomSprings.roundSize
                : easing({
                    duration:
                        config.radiusDuration,

                    ease:
                        roundnessEase(false),
                }),

        contentScale:
            easing({
                duration:
                    config.contentDuration,

                ease:
                    Easing.easeOut,
            }),

        contentBlur:
            easing({
                duration:
                    config.contentDuration,

                ease:
                    Easing.easeOut,
            }),
    }


    // -------------------------------------------------------------------------
    // GHOST FLIGHT
    // -------------------------------------------------------------------------

    if (ghostSpecs.length) {
        flightHost =
            makeFlightHost(
                dialogEl.parentElement,
            )

        ghostFlight =
            flyGhosts(
                flightHost,
                ghostSpecs,
                {
                    physics:
                        config.ghostPhysics,

                    // Apertura: el shell nace en el trigger y aterriza en su
                    // rect de reposo, asi que el texto se cuelga de esa esquina
                    // viva y no de una recta propia.
                    boxAt: () => ({
                        left:
                            shellRect.left +
                            state.x,

                        top:
                            shellRect.top +
                            state.y,
                    }),

                    boxStart: {
                        left:
                            originRect.left,

                        top:
                            originRect.top,
                    },

                    boxEnd: {
                        left:
                            shellRect.left,

                        top:
                            shellRect.top,
                    },

                    duration:
                        config.contentFlightDuration ??
                        0.6,

                    ease:
                        config.contentFlightEase ??
                        'power3.out',

                    // Inerte en la apertura: aqui no hay `retarget`, asi que el
                    // destino nunca se mueve y el polo vale 0.
                    aimSmooth:
                        config.ghostAimSmooth ??
                        0.2,

                    onComplete() {
                        if (
                            !controller.isCurrent()
                        ) {
                            return
                        }

                        ghostFinished = true
                        tryFinish()
                    },
                },
            )
    } else {
        ghostFinished = true
    }


    // -------------------------------------------------------------------------
    // START MOTION
    // -------------------------------------------------------------------------

    motionController.motion.animate(
        targetState,
        springs,
    )


    // -------------------------------------------------------------------------
    // SAFETY
    // -------------------------------------------------------------------------

    safetyTimer =
        window.setTimeout(
            () => {
                if (
                    !controller.isCurrent() ||
                    settled
                ) {
                    return
                }

                // Safety is allowed to force completion,
                // but only for the current transition.
                motionController.motion.stop()

                ghostFlight?.kill()

                ghostFinished = true
                motionFinished = true

                cleanup({
                    notify: true,
                })
            },
            config.maxDuration,
        )


    // -------------------------------------------------------------------------
    // PUBLIC SETTLE
    // -------------------------------------------------------------------------

    const settle = ({ keepGeometry = false } = {}) => {
        if (!controller.isCurrent()) {
            return
        }

        // Lo pide el host al cerrar (host.leave): el cierre que nos releva va a
        // medir la geometria VIVA justo despues, asi que el slot congelado no
        // se suelta aqui (ver `keepFrozen`, que lo lee el cleanup).
        if (keepGeometry) keepFrozen = true

        motionController.motion.stop()

        motionFinished = true

        // A manual settle must not leave an active ghost behind.
        ghostFlight?.kill()

        ghostFinished = true

        tryFinish()
    }


    // -------------------------------------------------------------------------
    // PUBLIC ABORT
    // -------------------------------------------------------------------------

    const abort = () => {
        if (!controller.isCurrent()) {
            return
        }

        cleanup({
            restoreOriginElement: true,
            notify: true,
        })
    }


    // -------------------------------------------------------------------------
    // PUBLIC ABANDON CONTENT
    // -------------------------------------------------------------------------
    //
    // El nodo vivo del contenido se lo quedo otro modal (el nuevo, el que
    // interactua). Esta apertura deja de escribir en sus elementos y los
    // restaura, o quedarian con la opacidad 0 que grabo `prepare()`.
    //
    // Faltaba: `host.takeContent` llamaba `node.morph?.abandonContent?.()` y en
    // una apertura en vuelo eso era un no-op silencioso.

    const abandonContent = () => {
        contentController?.detach()
        contentController?.restore()
        visibilityController?.show()
    }


    // -------------------------------------------------------------------------
    // TRANSITION CANCELLATION
    // -------------------------------------------------------------------------

    controller._cancelImpl = () => {
        if (settled) {
            return
        }

        cleanup({
            restoreOriginElement: true,
            notify: false,
        })
    }


    return {
        settle,
        abort,
        abandonContent,
    }
}


// -----------------------------------------------------------------------------
// MORPH TO ORIGIN
// -----------------------------------------------------------------------------

export function gsapMorphToOrigin({
    dialogEl,
    shellEl,
    bodyEl,
    origin,
    originStyle,
    options = {},
    onSettle,
    shouldRestoreOrigin,
}) {
    const config = {
        ...MORPH_DEFAULTS,
        ...options,
    }

    const controller =
        createTransitionController(
            shellEl,
        )

    let settled = false
    let safetyTimer = null

    let ghostFlight = null
    let flightHost = null

    let visibilityController = null

    let contentController = null

    let motionController = null

    let ghostFinished = false
    let motionFinished = false

    let handoffHandler = null
    let handoffTimer = null

    let vanishTimer = null

    // La copia ya se esta apagando (`vanish`). No puede ser `settled`: `cleanup`
    // corre en diferido (un tick, `VANISH_TEARDOWN_DELAY`) y su guardia es justo
    // `settled`, asi que marcarlo aqui dejaria la copia sin desmontar. Lo que
    // cierra `vanished` son los caminos publicos que pueden resucitar el vuelo de
    // una copia ya apagada -- medido, ver `retarget`.
    let vanished = false

    // El aterrizaje final (pintar el shell sobre el origin, destaparlo y
    // desvanecer) se hace una sola vez, lo pida quien lo pida.
    let handoffStarted = false
    let handoffDone = false


    // -------------------------------------------------------------------------
    // INTERNAL CLEANUP
    // -------------------------------------------------------------------------

    const cleanup = ({
        restoreOriginElement = false,
        hideShell = false,
        notify = false,
    } = {}) => {
        if (settled) return

        settled = true

        if (safetyTimer) {
            clearTimeout(safetyTimer)
            safetyTimer = null
        }

        // El cierre ya termino: ni el listener ni su respaldo tienen nada que
        // hacer a partir de aqui.
        handoffDone = true

        if (handoffHandler) {
            shellEl.removeEventListener(
                'transitionend',
                handoffHandler,
            )
            handoffHandler = null
        }

        if (handoffTimer) {
            clearTimeout(handoffTimer)
            handoffTimer = null
        }

        // Si la copia ya estaba apagandose, su timer no puede volver a entrar:
        // `cleanup` ya corre aqui y dejaria un `onSettle` de mas.
        if (vanishTimer) {
            clearTimeout(vanishTimer)
            vanishTimer = null
        }

        motionController?.motion?.stop()

        ghostFlight?.kill()
        ghostFlight?.cleanup()

        ghostFlight = null

        if (flightHost) {
            flightHost.remove()
            flightHost = null
        }

        visibilityController?.show()

        contentController?.reset()

        if (restoreOriginElement) {
            restoreOrigin(
                origin,
                {
                    instant: true,
                },
            )
        }

        clearFrozen(
            dialogEl,
            shellEl,
            bodyEl,
        )

        // Despues de clearFrozen a proposito: entre las propiedades que suelta
        // esta `display`, asi que al reves el hideShell quedaba en nada.
        if (hideShell) {
            shellEl.style.display =
                'none'
        }

        controller.release()

        if (notify) {
            onSettle?.()
        }
    }


    // -------------------------------------------------------------------------
    // HIDDEN CONTENT + GHOST COMPLETION
    // -------------------------------------------------------------------------

    const finishMotionPhase = () => {
        if (!controller.isCurrent()) {
            return
        }

        motionFinished = true

        tryFinish()
    }


    const tryFinish = () => {
        if (!controller.isCurrent()) {
            return
        }

        if (settled) {
            return
        }

        if (!motionFinished) {
            return
        }

        if (!ghostFinished) {
            return
        }

        // ---------------------------------------------------------------------
        // El handoff se hace UNA vez.
        //
        // El safety timer (closeMaxDuration) vuelve a entrar aqui cuando el
        // vuelo no llego a su destino: si volviera a pintar el shell y a
        // registrar otro listener, el anterior quedaria perdido y el cierre
        // no terminaria nunca. A partir de la segunda entrada se cierra ya.
        // ---------------------------------------------------------------------

        if (handoffStarted) {
            cleanup({
                hideShell: true,
                notify: true,
            })

            return
        }

        handoffStarted = true

        // ---------------------------------------------------------------------
        // At this point the actual modal has reached the origin geometry AND
        // the ghost has reached the target. The shell is pinned to that exact
        // geometry, then the real origin is revealed underneath it.
        // ---------------------------------------------------------------------

        const liveOriginRect =
            origin.getBoundingClientRect()

        const liveToX =
            liveOriginRect.left -
            shellBaseRect.left

        const liveToY =
            liveOriginRect.top -
            shellBaseRect.top

        pageCorr.x = 0
        pageCorr.y = 0
        pageCorr.scrollX = window.scrollX
        pageCorr.scrollY = window.scrollY

        pure.x = liveToX
        pure.y = liveToY

        state.width =
            liveOriginRect.width

        state.height =
            liveOriginRect.height

        state.roundT = 1

        paintShell(
            shellStyle,
            state,
            fromRound,
            toRound,
        )

        // ---------------------------------------------------------------------
        // RELEVO DEL ORIGIN
        // ---------------------------------------------------------------------

        ghostFlight?.finish()
        visibilityController?.show()

        const canRevealOrigin =
            typeof shouldRestoreOrigin !== 'function' ||
            shouldRestoreOrigin()

        if (canRevealOrigin) {
            restoreOrigin(
                origin,
                {
                    instant: true,
                },
            )
        } else {
            hideOrigin(
                origin,
                {
                    clickable: true,
                },
            )
        }

        cleanup({
            hideShell: true,
            notify: true,
        })

        return


        // ---------------------------------------------------------------------
        // HANDOFF
        //
        // The origin is already revealed underneath (see the block above), so
        // this fade happens black over black: invisible. It only runs when
        // there IS a revealed origin to absorb it.
        // ---------------------------------------------------------------------

        shellStyle.transition =
            'none'

        shellStyle.opacity =
            '1'

        void shellEl.offsetWidth

        shellStyle.transition =
            `opacity ${handoffDuration}s ease-out`

        shellStyle.opacity =
            '0'


        // ---------------------------------------------------------------------
        // FIN DEL CIERRE
        //
        // El transitionend es el camino normal, pero NO se puede confiar en el:
        // una ventana oculta/throttleada, un cambio de estilo coalescido o una
        // transicion interrumpida lo dejan sin llegar. Sin un respaldo, este
        // cierre no terminaria jamas: ni store.remove, ni el item fuera, ni el
        // vuelo de fantasmas fuera (fuga permanente).
        //
        // El motor viejo ya lo hacia asi (morph.js): un setTimeout con el
        // mismo trabajo. Aqui van los dos, y el primero que llegue cierra.
        // ---------------------------------------------------------------------

        const finishHandoff = () => {
            if (handoffDone) {
                return
            }

            handoffDone = true

            if (handoffTimer) {
                clearTimeout(handoffTimer)
                handoffTimer = null
            }

            if (handoffHandler) {
                shellEl.removeEventListener(
                    'transitionend',
                    handoffHandler,
                )
                handoffHandler = null
            }

            if (!controller.isCurrent() || settled) {
                return
            }

            cleanup({
                hideShell: true,
                notify: true,
            })
        }

        handoffHandler = (event) => {
            if (event.target !== shellEl) {
                return
            }

            if (event.propertyName !== 'opacity') {
                return
            }

            finishHandoff()
        }

        shellEl.addEventListener(
            'transitionend',
            handoffHandler,
        )

        handoffTimer =
            window.setTimeout(
                finishHandoff,
                handoffDuration * 1000 + 20,
            )
    }


    // -------------------------------------------------------------------------
    // START BY REMOVING DIALOG TRANSFORM
    // -------------------------------------------------------------------------

    const savedTransform =
        dialogEl.style.transform

    dialogEl.style.transform =
        'none'


    const unrotatedRect =
        dialogEl.getBoundingClientRect()


    // Keep the dialog anchored to the exact unrotated viewport position while
    // the source boxes are measured.
    //
    // El traspaso puede entrar dos veces sobre el MISMO dialogo (el cierre lo
    // re-dispara al emitir el store). La segunda vez ya esta anclado y el valor
    // medido coincide con el escrito salvo ruido sub-pixel: re-escribirlo re-
    // snap-ea la posicion y eso se ve como un paso/temblor de ~0.1px al
    // aterrizar. Si ya esta anclado dentro de medio pixel, no hay nada que
    // anclar y la escritura solo puede moverlo.
    const yaAnclado =
        dialogEl.style.position === 'absolute'
        && Math.abs(parseFloat(dialogEl.style.left) - unrotatedRect.left) < 0.5
        && Math.abs(parseFloat(dialogEl.style.top) - unrotatedRect.top) < 0.5

    if (!yaAnclado) {
        dialogEl.style.position =
            'absolute'

        dialogEl.style.left =
            `${unrotatedRect.left}px`

        dialogEl.style.top =
            `${unrotatedRect.top}px`

        dialogEl.style.margin =
            '0'
    }


    // -------------------------------------------------------------------------
    // SLOT CONGELADO (respetando el de la apertura que este cierre releva)
    //
    // El pin del dialogo y del body es lo que fija el ancho con el que se
    // envuelve el texto: el body es hijo del shell, asi que su ancho pineado es
    // el que manda, no el del shell que vuela. La apertura lo pinea a la
    // geometria de REPOSO y el titulo se queda en las hileras que el usuario ve.
    //
    // Volver a pinearlo aqui con la medida viva -- el shell a media apertura,
    // que va estrecho camino del origen -- re-envuelve la copia en las hileras
    // del VUELO, que no son las de nadie: medido en rafaga (14 picadas a 70 ms),
    // fuente en 2 hileras `s=[537.584.584]` contra el trigger de 1
    // `t=[644.644.644]`, y las palabras se cruzaban en el aire de vuelta.
    //
    // Asi que el pin se respeta; solo se congela cuando no hay ninguno, que es
    // el caso de una copia ya asentada (apertura terminada, `clearFrozen` solto
    // el slot) y coincide con su propia geometria de reposo.
    // -------------------------------------------------------------------------

    const shellRect =
        shellEl.getBoundingClientRect()

    if (dialogEl.style.width === '') {
        freezeSlot(
            dialogEl,
            shellEl,
            bodyEl,
        )
    }


    // -------------------------------------------------------------------------
    // BASE RECT (el shell sin su transform vivo)
    //
    // El slot congelado deja el shell donde lo dejo el vuelo vivo, y una
    // apertura interrumpida lleva el translate a medias. paintShell() pinta
    // desde translate(0, 0), que es la base del shell: las escrituras de
    // position/left/top de mas abajo caen en el padding box del dialogo, el
    // mismo sitio donde el shell esta en flujo.
    //
    // Por eso el destino se mide contra la base y el movimiento ARRANCA en el
    // translate vivo. Medir el destino contra shellRect (que ya lleva el
    // translate dentro) dejaba el aterrizaje corto exactamente por ese
    // translate: 0 px si la apertura habia asentado, ~19 px si se interrumpia a
    // mitad de camino -- y el salto al destapar el origin de verdad.
    // -------------------------------------------------------------------------

    const liveShellTransform =
        shellEl.style.transform

    shellEl.style.transform =
        'none'

    const shellBaseRect =
        shellEl.getBoundingClientRect()

    shellEl.style.transform =
        liveShellTransform


    // -------------------------------------------------------------------------
    // COLLECT GHOSTS BEFORE RESTORING DIALOG TRANSFORM
    // -------------------------------------------------------------------------

    let ghostSpecs = []

    if (config.mode === 'gsap') {
        const collection =
            collectGhostSpecs(
                dialogEl,
                origin,
            )

        ghostSpecs =
            filterGhostSpecs(
                collection.specs,
                config.ghostTargets,
            )
    }


    // -------------------------------------------------------------------------
    // RESTORE REAL DIALOG TRANSFORM
    // -------------------------------------------------------------------------

    dialogEl.style.transform =
        savedTransform


    // -------------------------------------------------------------------------
    // UPDATE GHOST VISUAL START POSITIONS
    //
    // Dimensions remain the unrotated dimensions.
    // Position comes from the actual rotated visual box.
    // -------------------------------------------------------------------------

    if (config.mode === 'gsap') {
        // Text ghosts have no source element to measure, so their live glyph
        // boxes are re-read per container, in the same word order.
        const liveWords = new Map()

        const liveBoxes = (container) => {
            if (!liveWords.has(container)) {
                liveWords.set(
                    container,
                    measureWords(container),
                )
            }

            return liveWords.get(container)
        }

        ghostSpecs.forEach(
            (spec) => {
                const live =
                    spec.sourceEl instanceof HTMLElement
                        ? spec.sourceEl
                            .getBoundingClientRect()
                        : liveBoxes(
                            spec.sourceContainer,
                        )[spec.index]?.box

                if (!live) return

                spec.fromBox.left =
                    live.left

                spec.fromBox.top =
                    live.top
            },
        )

    }


    // -------------------------------------------------------------------------
    const originRect =
        origin.getBoundingClientRect()

    // Destino CAPTURADO del viaje, y ya no se re-apunta: si el trigger se mueve
    // con el scroll, ese desplazamiento no entra por aqui (los canales viajarian
    // detras de el) sino por `pageCorr`, que se suma a la lectura. Con el scroll
    // parado esto es exactamente donde tiene que aterrizar el shell.
    const toX =
        originRect.left -
        shellBaseRect.left

    const toY =
        originRect.top -
        shellBaseRect.top


    // -------------------------------------------------------------------------
    // COLORS / RADIUS
    // -------------------------------------------------------------------------

    const originComputed =
        getComputedStyle(origin)

    const toBackground =
        originStyle?.background ??
        originComputed.background

    const toRound =
        cornerRoundness(
            originComputed,
            originRect.width,
            originRect.height,
            originStyle?.borderRadius,
        )


    const shellComputed =
        getComputedStyle(shellEl)

    const fromShadow =
        shellComputed.boxShadow

    const fromRound =
        cornerRoundness(
            shellComputed,
            shellRect.width,
            shellRect.height,
        )

    const originShadow =
        originStyle?.boxShadow ??
        originComputed.boxShadow

    const toShadow =
        originShadow &&
            originShadow !== 'none'
            ? originShadow
            : transparentShadow(
                fromShadow,
            )


    // -------------------------------------------------------------------------
    // STATE
    // -------------------------------------------------------------------------

    const shellStyle =
        shellEl.style

    // -------------------------------------------------------------------------
    // CORRECCION DE ESPACIO DE PAGINA
    //
    // Este vuelo tiene el destino (el trigger) en la PAGINA y el shell en el
    // viewport (el dialogo esta fijo). Si el usuario no deja de hacer scroll, el
    // trigger se mueve en el viewport y el shell no. El reapuntado lo
    // perseguia: `animate` + `spring(velocity: 0)` en cada tick del scroll es un
    // filtro de primer orden que sigue ~27% del movimiento (medido con vaiven de
    // 45 px/frame: 250-350 px de desfase), asi que los canales no asentaban
    // NUNCA y el remate de `closeMaxDuration` revelaba el trigger con el texto
    // todavia en camino: el teletransporte.
    //
    // El arreglo no es perseguir mejor, es dejar de perseguir. El desplazamiento
    // del destino se SUMA a la lectura de x/y (no a los canales): el resorte
    // recorre su viaje contra un destino quieto -- asienta cuando le toca, sin
    // scroll que lo retrase -- y el shell, con el texto colgado de su esquina,
    // acompana a la pagina pixel a pixel. Con el scroll parado la correccion es
    // exactamente 0: el vuelo de siempre, sin tocar.
    // -------------------------------------------------------------------------

    const pageCorr = {
        // Lo que el destino se movio respecto de su rect capturado, medido en
        // el ultimo reapuntado.
        x: 0,
        y: 0,

        // El scroll de la ventana en ese mismo instante. Entre reapuntados la
        // parte que se mueve con el scroll se recalcula aqui: leer scrollX/Y no
        // provoca layout, asi que la correccion no depende de la cadencia de los
        // eventos.
        scrollX:
            window.scrollX,

        scrollY:
            window.scrollY,
    }

    // Los canales viven en espacio puro (el setter) y todo el que pinta lee
    // espacio de pagina (el getter): el shell en `paintShell`, la esquina viva
    // del `boxAt` del vuelo del texto y el clavado del relevo.
    const pure = {
        // El movimiento arranca donde esta el shell de verdad (translate vivo),
        // no en su base: si no, el primer frame pega el salto de vuelta a la
        // base y el aterrizaje se queda corto por ese mismo translate.
        x:
            shellRect.left -
            shellBaseRect.left,

        y:
            shellRect.top -
            shellBaseRect.top,
    }

    const state = {
        get x() {
            return (
                pure.x +
                pageCorr.x +
                pageCorr.scrollX -
                window.scrollX
            )
        },

        set x(value) {
            pure.x = value
        },

        get y() {
            return (
                pure.y +
                pageCorr.y +
                pageCorr.scrollY -
                window.scrollY
            )
        },

        set y(value) {
            pure.y = value
        },

        width:
            shellRect.width,

        height:
            shellRect.height,

        roundT: 0,
    }

    // La direccion del tiron de salida es la del recorrido que queda
    // (destino menos posicion actual), que es lo que hace el motor por defecto.
    const launchX =
        Math.sign(toX - state.x) || 1

    const launchY =
        Math.sign(toY - state.y) || 1


    shellStyle.position =
        'absolute'

    shellStyle.top =
        '0px'

    shellStyle.left =
        '0px'

    shellStyle.opacity =
        '1'

    shellStyle.transition =
        'none'


    paintShell(
        shellStyle,
        state,
        fromRound,
        toRound,
    )


    // -------------------------------------------------------------------------
    // CONTENT
    // -------------------------------------------------------------------------

    contentController =
        createContentController(
            bodyEl,
            config,
            false,
        )

    contentController.prepare()


    // -------------------------------------------------------------------------
    // GHOST VISIBILITY
    // -------------------------------------------------------------------------

    if (config.mode === 'gsap') {
        const elementsToHide = []

        ghostSpecs.forEach(
            (spec) => {
                if (
                    spec.sourceContainer &&
                    !elementsToHide.includes(
                        spec.sourceContainer,
                    )
                ) {
                    elementsToHide.push(
                        spec.sourceContainer,
                    )
                }

                if (
                    spec.revealContainer &&
                    !elementsToHide.includes(
                        spec.revealContainer,
                    )
                ) {
                    elementsToHide.push(
                        spec.revealContainer,
                    )
                }
            },
        )

        visibilityController =
            createVisibilityController(
                elementsToHide,
            )

        visibilityController.hide()
    }


    // -------------------------------------------------------------------------
    // CSS VISUALS
    // -------------------------------------------------------------------------

    void shellEl.offsetWidth

    shellStyle.transition = [
        `background ${config.colorDuration}s ease-in`,
        `box-shadow ${config.shadowDuration * 0.5}s ease-in`,
    ].join(', ')

    shellStyle.background =
        toBackground

    shellStyle.boxShadow =
        toShadow

    contentController.animateOut()


    // -------------------------------------------------------------------------
    // MOTION
    // -------------------------------------------------------------------------

    const initialState = {
        ...state,

        // Espacio PURO: los canales arrancan donde arranca el viaje, sin la
        // correccion de pagina (que a estas alturas ya puede no ser 0 si el
        // scroll se movio entre la captura y este punto). Si entrara aqui, el
        // shell saldria con la correccion contada dos veces.
        x:
            pure.x,

        y:
            pure.y,

        contentScale: 1,
        contentBlur: 0,
    }


    motionController =
        createMorphMotion(
            initialState,
            state,
            shellStyle,
            fromRound,
            toRound,
            bodyEl,
            contentController,
            controller,
            finishMotionPhase,

            // El vuelo del texto, resuelto en cada frame: aqui todavia no
            // existe (se construye mas abajo, despues de medir el destino).
            () => ghostFlight,
        )


    const isTransform =
        config.mode === 'transform' ||
        config.mode === 'gsap'


    const travel = {
        stiffness:
            config.stiffness,

        damping:
            config.closeDamping,

        velocity:
            config.closeVelocity,

        restDelta:
            config.closeRestDelta,

        restSpeed:
            config.closeRestSpeed,
    }


    const targetState = {
        x: toX,
        y: toY,

        width:
            originRect.width,

        height:
            originRect.height,

        roundT: 1,

        // ---------------------------------------------------------------------
        // IMPORTANT:
        //
        // The modal content is not snapped to scale(1) immediately.
        // It remains on the same scale trajectory while the shell travels.
        //
        // The actual matched elements are represented by the ghosts.
        // The non-matched content follows the normal content animation.
        // ---------------------------------------------------------------------

        contentScale:
            config.contentScale,

        contentBlur:
            config.contentBlur,
    }

    const geomSprings =
        synchronizedGeometrySprings(
            config,
            state,
            targetState,
            { close: true },
        )


    const springs = {
        x:
            isTransform
                ? geomSprings.x
                : spring({
                    ...travel,
                    direction: launchX,
                }),

        y:
            isTransform
                ? geomSprings.y
                : spring({
                    ...travel,
                    direction: launchY,
                }),

        width:
            geomSprings.width,

        height:
            geomSprings.height,

        roundT:
            isTransform
                ? geomSprings.roundSize
                : easing({
                    duration:
                        config.radiusDuration,

                    ease:
                        roundnessEase(true),
                }),

        contentScale:
            easing({
                duration:
                    config.closeContentDuration,

                ease:
                    Easing.easeInCubic,
            }),

        contentBlur:
            easing({
                duration:
                    config.closeContentDuration,

                ease:
                    Easing.easeInCubic,
            }),
    }


    // -------------------------------------------------------------------------
    // GHOST FLIGHT
    // -------------------------------------------------------------------------

    if (ghostSpecs.length) {
        flightHost =
            makeFlightHost(
                dialogEl.parentElement,
            )

        ghostFlight =
            flyGhosts(
                flightHost,
                ghostSpecs,
                {
                    physics:
                        config.ghostPhysics,

                    // Cierre: el shell sale de su caja viva y aterriza en el
                    // trigger. La esquina se lee del estado en cada frame, asi
                    // que el scroll del reapuntado se lleva el texto con la caja
                    // en vez de repartirlo con un polo aparte.
                    boxAt: () => ({
                        left:
                            shellBaseRect.left +
                            state.x,

                        top:
                            shellBaseRect.top +
                            state.y,
                    }),

                    boxStart: {
                        left:
                            shellRect.left,

                        top:
                            shellRect.top,
                    },

                    boxEnd: {
                        left:
                            originRect.left,

                        top:
                            originRect.top,
                    },

                    duration:
                        config.closeContentFlightDuration ??
                        0.4,

                    ease:
                        config.closeContentFlightEase ??
                        'power2.out',

                    aimSmooth:
                        config.ghostAimSmooth ??
                        0.2,

                    onComplete() {
                        if (
                            !controller.isCurrent()
                        ) {
                            return
                        }

                        ghostFinished = true
                        tryFinish()
                    },
                },
            )
    } else {
        ghostFinished = true
    }


    // -------------------------------------------------------------------------
    // START MOTION
    // -------------------------------------------------------------------------

    motionController.motion.animate(
        targetState,
        springs,
    )


    // -------------------------------------------------------------------------
    // DIALOG PHYSICS
    //
    // This is intentionally kept, but it no longer owns the transition
    // lifecycle. The shell remains the authoritative visual geometry.
    // -------------------------------------------------------------------------

    const dialogMotion =
        motionOf(dialogEl)

    dialogMotion.to(
        {
            x: 0,
            y: 0,

            rotateZ: 0,
            rotateX: 0,
            rotateY: 0,
        },
        {
            spring:
                isTransform
                    ? geomSprings.x
                    : travel,
        },
    )


    // -------------------------------------------------------------------------
    // SAFETY
    // -------------------------------------------------------------------------

    safetyTimer =
        window.setTimeout(
            () => {
                if (
                    !controller.isCurrent() ||
                    settled
                ) {
                    return
                }

                motionController.motion.stop()

                ghostFlight?.kill()

                motionFinished = true
                ghostFinished = true

                tryFinish()
            },
            config.closeMaxDuration,
        )


    // -------------------------------------------------------------------------
    // RETARGET
    // -------------------------------------------------------------------------
    //
    // Retargeting does NOT recreate the entire transition.
    //
    // It only updates the destination geometry.
    // The current velocity/state remains owned by this transition.
    // -------------------------------------------------------------------------

    function retarget(nextOrigin) {
        // `vanished` es lo que hacia falta aqui, y no es teorico: el tracker del
        // origin dispara justo al reabrir el mismo modal (el modal nuevo esconde
        // el trigger), y esa llamada llegaba DESPUES del apagon. `animate` vuelve
        // a meter los canales en el bucle -- `spring` pone `active = true` aunque
        // el canal este parado -- asi que volvian a pintar el shell invisible
        // camino del trigger durante los ~160 ms que le quedaban de vida.
        if (
            !controller.isCurrent() ||
            settled ||
            vanished ||
            !(nextOrigin instanceof HTMLElement) ||
            !nextOrigin.isConnected
        ) {
            return
        }

        const next =
            nextOrigin.getBoundingClientRect()

        // ── El destino se movio: se mide, no se persigue ─────────────────────
        //
        // Antes esto re-apuntaba los canales (`animate` + `spring` con
        // `velocity: 0`) a la posicion VIVA del trigger, y ese es el defecto que
        // se esta quitando: un resorte re-apuntado en cada tick del scroll es un
        // filtro de primer orden que solo sigue ~27% del movimiento, el desfase
        // se acumula y los canales no asientan nunca -- el vuelo se quedaba
        // colgado hasta el remate de `closeMaxDuration`, que revelaba el trigger
        // a mitad de persecucion.
        //
        // El desplazamiento entra por `pageCorr`, que se SUMA a la lectura de
        // x/y (ver arriba): los canales siguen apuntando a la geometria
        // capturada, que con el scroll quieta es exactamente donde tiene que
        // aterrizar, y este desplazamiento es lo que hace que el shell y el
        // texto viajen pegados a la pagina.
        pageCorr.x =
            next.left -
            originRect.left

        pageCorr.y =
            next.top -
            originRect.top

        pageCorr.scrollX =
            window.scrollX

        pageCorr.scrollY =
            window.scrollY

        // Repintado inmediato: la correccion cambio y los canales pueden estar
        // ya asentados, en cuyo caso no habria volcado hasta el proximo cambio
        // -- o hasta ninguno.
        motionController.flush?.()

        // El texto viaja con el destino VIVO, no con una copia congelada de el.
        // Sin esto el fantasma aterriza donde estaba el trigger antes del
        // scroll y el texto se queda pegado a mitad de camino.
        //
        // Solo se reapunta al fantasma: los resortes de arriba no se tocan. El
        // canal `roundT` tampoco, y a proposito: su destino no cambia con el
        // scroll (sigue siendo 1), asi que volver a animarlo solo le pondria la
        // velocidad a cero -- con un scroll continuo eso congelaria los radios
        // Y el texto en pleno vuelo, que es justo el defecto que se esta
        // quitando.
        ghostFlight?.retarget(
            ghostSpecs.map(
                (spec) =>
                    spec.measureToBox?.() ??
                    null,
            ),
        )
    }

    // -------------------------------------------------------------------------
    // PUBLIC SETTLE
    // -------------------------------------------------------------------------

    // Este settle NO lleva `keepGeometry`: quien lo lleva es el de la apertura
    // (`gsapMorphFromOrigin`), que es a quien el host se lo pide al empezar el
    // cierre. Antes habia aqui una bandera `preserveFrozen` que se escribia y
    // no se leia en ningun sitio.
    const settle = () => {
        // Con la copia apagandose, un settle del host la pintaria de golpe sobre
        // el origin y destaparia el trigger -- que es el que el modal nuevo esta
        // usando en este mismo momento. El host recibe igual su aviso: lo manda
        // el `cleanup` diferido de `vanish`.
        if (
            !controller.isCurrent() ||
            settled ||
            vanished
        ) {
            return
        }

        motionController.motion.stop()

        ghostFlight?.kill()

        motionFinished = true
        ghostFinished = true

        tryFinish()
    }


    // -------------------------------------------------------------------------
    // PUBLIC ABANDON CONTENT
    // -------------------------------------------------------------------------
    //
    // El nodo vivo del contenido se lo quedo otro modal (el nuevo, el que
    // interactua) y aqui queda una copia: esta transicion deja de escribir en
    // los elementos del contenido, pero sigue con su vuelo y su shell.

    const abandonContent = () => {
        contentController?.detach()

        // Restaurar, no solo olvidar: si se dejara el opacity 0 puesto, el modal
        // que se lleva el contenido lo grabaria como su estado "visible" y lo
        // devolveria invisible al terminar. `restore()` limpia los elementos
        // del contenido, que `reset()` se salta precisamente por el detach.
        contentController?.restore()

        visibilityController?.show()
    }


    // -------------------------------------------------------------------------
    // PUBLIC ABORT
    // -------------------------------------------------------------------------

    const abort = () => {
        // Un abort sobre la copia que se apaga solo adelantaria su desmonte (y
        // con el, el destape del trigger): el apagon ya es su salida.
        if (!controller.isCurrent() || vanished) {
            return
        }

        cleanup({
            restoreOriginElement: true,
            notify: true,
        })
    }


    // -------------------------------------------------------------------------
    // PUBLIC VANISH
    // -------------------------------------------------------------------------
    //
    // El MISMO modal esta volviendo a abrirse encima de esta copia. Esta copia
    // se va sin viaje de vuelta: se apaga donde este.
    //
    // Por que: en un cierre normal el vuelo de salida es lo que da sentido a la
    // salida -- el contenido termina en el fondo del modal nuevo, que es
    // exactamente lo que el dueño quiere cuando son modales distintos. Pero
    // cuando es el MISMO modal, el vuelo de vuelta y el de ida dibujan DOS
    // copias de lo mismo a la vez, cruzándose: medido en `#/gsap-morph` con
    // pill -> pill en el mismo tick, los dos items viven 450 ms con el mismo
    // juego de fantasmas (`Launch`, `Project`, `Ciervo`, 🚀) y sus dos shells a
    // 32 px el uno del otro. El usuario ya está viendo ese modal abrirse, así
    // que apagar la copia no le quita nada: no hay salida que justificar.
    //
    // Sin `restoreOriginElement`: el origin de este cierre es el MISMO trigger
    // que el modal nuevo está usando ahora. Destaparlo aquí encendería el
    // trigger debajo del vuelo del nuevo. De eso se encarga el teardown del
    // host, que va con guardia (`originInUse`).

    const vanish = () => {
        if (settled || vanished || !controller.isCurrent()) {
            return
        }

        // Antes de tocar nada: a partir de aqui la copia esta apagada y ningun
        // camino publico la puede devolver a la vida (ver la guardia de
        // `retarget`, que es la que hacia falta de verdad).
        vanished = true

        // El vuelo se apaga YA, no cuando acabe el apagón: si no, los fantasmas
        // de esta copia seguirían volando por encima del modal que entra.
        ghostFlight?.kill()
        ghostFlight?.cleanup()

        ghostFlight = null

        if (flightHost) {
            flightHost.remove()
            flightHost = null
        }

        motionController?.motion?.stop()

        // FUERA DE LA PANTALLA EN EL MISMO FRAME
        //
        // Antes esto era un fundido de `closeVanishDuration` (0.14 s) y ese
        // fundido ERA el bug. Medido en `#/gsap-morph` con un bucle de
        // cerrar/reabrir el mismo trigger cada 210 ms: en el frame en que la
        // copia nueva entra, la vieja sigue a `opacity 1` con su shell ya grande
        // (`374x182`, fondo negro) y su dialogo a tamano completo
        // (`68,235 433x258`). Durante esos 140 ms se ven LAS DOS superficies a la
        // vez, la vieja montada sobre la nueva -- que es el modal doblado que el
        // dueno fotografia (titulo partido en dos lineas y cuerpo desbordando su
        // caja, porque el contenido viaja a escala completa dentro del shell
        // pequeno de la copia que entra).
        //
        // No hay salida que justificar: la copia nueva ya ocupa ese mismo sitio y
        // sale del mismo trigger. Apagarla de golpe es lo unico que deja UNA sola
        // superficie en pantalla. El salto de tamano que se ve (la vieja estaba
        // mas grande que la nueva) es justo la semantica de reabrir: el modal
        // vuelve al trigger y crece otra vez.
        shellEl.style.transition = 'none'
        shellEl.style.opacity = '0'

        if (bodyEl) {
            bodyEl.style.transition = 'none'
            bodyEl.style.opacity = '0'
        }

        // El desmonte sigue en diferido, pero solo un tick. No puede ser
        // sincrono: `vanishSameModal` corre al principio de `enter()`, que a su
        // vez corre dentro del bucle de `sync()` sobre `nodes`, y `cleanup` ->
        // `teardownNode` muta ese mismo mapa.
        vanishTimer = setTimeout(
            () => {
                vanishTimer = null

                cleanup({
                    hideShell: true,
                    notify: true,
                })
            },

            VANISH_TEARDOWN_DELAY,
        )
    }


    // -------------------------------------------------------------------------
    // TRANSITION CANCELLATION
    // -------------------------------------------------------------------------

    controller._cancelImpl = () => {
        if (settled) {
            return
        }

        cleanup({
            restoreOriginElement: true,
            notify: false,
        })
    }


    // Desmontar sin tocar el origin. `abort()` si lo destapa, y aqui no se
    // puede: el host es el unico que sabe si otro modal vivo sigue saliendo de
    // ese trigger (una rafaga sale del mismo sitio). El host ya llama despues a
    // `releaseOrigin`, que va con guardia.
    const dispose = () => {
        cleanup({
            hideShell: true,
            notify: false,
        })
    }


    return {
        settle,
        retarget,
        abort,
        vanish,
        dispose,
        abandonContent,
    }
}
