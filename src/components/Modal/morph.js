/**
 * The morph: the button that opened the dialog becomes the dialog, and on
 * close the dialog becomes the button again.
 *
 * Same trick as super-beautiful-toast. The box you watch grow never distorts;
 * the content, which would, stays hidden and blurred until the skin has almost
 * arrived. x and y are independent springs with an initial kick; width and
 * height are springs without that kick (a size launch explodes the box);
 * roundness is a short tween so a pill does not oscillate; colour and shadow
 * go through CSS transitions.
 *
 * Roundness is a ratio of the current min(width, height), not a pixel radius.
 * A pill button reports `border-radius: 999px`. Tweening that number toward
 * 32px looks like a pill for almost the whole flight — anything above half the
 * short side still clips to a capsule — then squares off at the end. The ratio
 * (0.5 → 0.16) is what actually changes shape while the box grows. Corners are
 * independent: a sheet's 32px top / 18px bottom is four ratios, not one
 * shorthand, or settle snaps the bottom pair.
 *
 * Close settles when the springs rest, not when a 1100ms safety net fires, then
 * crossfades the restored origin under the landed shell before teardown.
 */
import { createMotion, spring, easing } from '../../core/motion/engine.js'
import { Easing } from '../../core/motion/easing.js'
import { motionOf } from '../../core/motion/element.js'

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
    closeHandoffDuration: 0.18,

    // Lo que dura el apagon de una copia que se va sin viaje de vuelta (el
    // MISMO modal volviendo a abrirse encima). Ver `vanish` mas abajo.
    closeVanishDuration: 0.14,
    closeMaxDuration: 900,
    closeRestDelta: 0.8,
    closeRestSpeed: 8,
}

// El par del origin vive en un solo sitio (`gsap-morph.js`): ahi guarda el
// `transition` que tenia el trigger antes de apagarlo y lo devuelve al
// destaparlo. Estaba duplicado aqui tal cual, y esta copia -- la que usa el
// host -- era la que dejaba el `transition: none` pegado en el trigger para
// siempre (medido al reposo: `transition: none;` en el pill).
//
// IMPORT + re-export, nunca `export ... from` a secas: eso re-exporta sin
// crear binding local, y este modulo TAMBIEN los llama (`hideOrigin` al abrir,
// `restoreOrigin` al aterrizar). Con `export ... from` los tres call sites eran
// identificadores sin definir: `ReferenceError: hideOrigin is not defined`
// lanzado justo despues de pintar el frame cero, o sea el shell congelado en
// `transition: none` sobre el origin, el item sin cerrar nunca y su overlay
// invisible (`opacity: 0`, `pointer-events: auto`) tapando la pagina entera.
// Medido en `#/modal`: modal nacido congelado a los 150 ms, identico a los
// 1150 ms, y el clic fuera sin llegar a nada. El raton muerto.
import { hideOrigin, restoreOrigin } from './gsap-morph.js'

export { hideOrigin, restoreOrigin }

function transparentShadow(shadow) {
    if (!shadow || shadow === 'none') return shadow
    return shadow.replace(/rgba?\([^)]*\)/g, 'rgba(0,0,0,0)')
}

function minSide(width, height) {
    return Math.max(1, Math.min(width, height))
}

function effectiveRadius(cssValue, width, height) {
    const cap = minSide(width, height) / 2
    const raw = String(cssValue ?? '').trim()
    if (!raw || raw === 'none') return 0
    if (raw.endsWith('%')) {
        return Math.min((parseFloat(raw) / 100) * minSide(width, height), cap)
    }
    const px = parseFloat(raw)
    if (!Number.isFinite(px)) return 0
    return Math.min(Math.max(0, px), cap)
}

function splitRadiusShorthand(value) {
    const raw = String(value ?? '').trim()
    if (!raw || raw === 'none') return ['0px', '0px', '0px', '0px']
    const parts = raw.split('/')[0].trim().split(/\s+/)
    const a = parts[0]
    const b = parts[1] ?? a
    const c = parts[2] ?? a
    const d = parts[3] ?? b
    if (parts.length === 1) return [a, a, a, a]
    if (parts.length === 2) return [a, b, a, b]
    if (parts.length === 3) return [a, b, c, b]
    return [a, b, c, d]
}

function cornerRoundness(computed, width, height, override = null, asPixels = false) {
    const m = minSide(width, height)
    const val = (css) => {
        const px = effectiveRadius(css, width, height)
        return asPixels ? px : px / m
    }
    if (override != null && String(override).trim() !== '') {
        const [tl, tr, br, bl] = splitRadiusShorthand(override)
        return { tl: val(tl), tr: val(tr), br: val(br), bl: val(bl) }
    }
    return {
        tl: val(computed.borderTopLeftRadius),
        tr: val(computed.borderTopRightRadius),
        br: val(computed.borderBottomRightRadius),
        bl: val(computed.borderBottomLeftRadius),
    }
}

function freezeSlot(dialogEl, shellEl, bodyEl) {
    const shellRect = shellEl.getBoundingClientRect()
    dialogEl.style.width = `${shellRect.width}px`
    dialogEl.style.height = `${shellRect.height}px`
    if (bodyEl) {
        bodyEl.style.width = `${bodyEl.getBoundingClientRect().width}px`
        bodyEl.style.flex = '0 0 auto'
    }
    return shellRect
}

function clearFrozen(dialogEl, shellEl, bodyEl) {
    for (const property of ['position', 'top', 'left', 'width', 'height', 'borderRadius',
        'background', 'boxShadow', 'transform', 'transition', 'opacity']) {
        shellEl.style[property] = ''
    }
    dialogEl.style.width = ''
    dialogEl.style.height = ''
    if (bodyEl) {
        for (const property of ['transform', 'transformOrigin', 'filter', 'opacity', 'width', 'flex', 'transition']) {
            bodyEl.style[property] = ''
        }
    }
}

function paintShell(shellStyle, state, fromRound, toRound, asPixels = false) {
    const m = minSide(state.width, state.height)
    const t = state.roundT
    const r = (a, b) => asPixels ? (a + (b - a) * t) : (a + (b - a) * t) * m
    shellStyle.transform = `translate(${state.x}px, ${state.y}px)`
    shellStyle.width = `${state.width}px`
    shellStyle.height = `${state.height}px`
    shellStyle.borderRadius = `${r(fromRound.tl, toRound.tl)}px ${r(fromRound.tr, toRound.tr)}px ${r(fromRound.br, toRound.br)}px ${r(fromRound.bl, toRound.bl)}px`
}

// Mismo defecto que en `gsap-morph.js`, misma solucion (alli esta el porque
// completo): los umbrales de `sizeSpring` son ABSOLUTOS, y `roundT` es un canal
// normalizado 0→1 que comparte spring con `width`/`height`. Un `restDelta` de
// 0.4 sobre ese canal es el 40% de su viaje, asi que asienta y `paintShell`
// congela los cuatro radios mientras la caja sigue volando.
//
// Medido en modo `transform`, placement `anchor`: el radio paraba en el frame 9
// y la caja seguia hasta el 29 en la apertura y hasta el 42 en el cierre (20 y 33
// frames de radios congelados). Con los umbrales derivados del recorrido de la
// caja, `roundT` hereda la tolerancia en las MISMAS unidades (0.4 px y 4 px/s
// expresados en el recorrido que ese canal representa) y asienta con ella.
function normalizedRest(state, targetState) {
    const travel = Math.max(
        Math.abs(targetState.width - state.width),
        Math.abs(targetState.height - state.height),

        // Un recorrido de cero (una caja que solo se desplaza) daria umbrales
        // infinitos: `roundT` no asentaria nunca y el morph no cerraria.
        1,
    )

    return {
        restDelta: 0.4 / travel,
        restSpeed: 4 / travel,
    }
}

function sizeSpring(config, { close = false, rest = null } = {}) {
    return spring({
        stiffness: config.sizeStiffness,
        damping: close ? (config.closeSizeDamping ?? config.closeDamping) : config.sizeDamping,
        velocity: 0,
        restDelta: rest?.restDelta ?? 0.4,
        restSpeed: rest?.restSpeed ?? 4,
    })
}

function roundnessEase(close) {
    return close ? Easing.bezier(0.5, 0.2, 0.2, 1) : Easing.bezier(0.8, 0.3, 0.5, 0.8)
}

/**
 * @returns {{ settle: () => void }}
 */
export function morphFromOrigin({ dialogEl, shellEl, bodyEl, origin, originStyle, options = {}, onSettle }) {
    const config = { ...MORPH_DEFAULTS, ...options }
    const shellRect = freezeSlot(dialogEl, shellEl, bodyEl)

    const originRect = origin.getBoundingClientRect()
    const fromX = originRect.left - shellRect.left
    const fromY = originRect.top - shellRect.top

    const originComputed = getComputedStyle(origin)
    const fromBackground = originStyle?.background ?? originComputed.background
    const fromShadow = originStyle?.boxShadow ?? originComputed.boxShadow
    const isTransform = config.mode === 'transform'
    const fromRound = cornerRoundness(
        originComputed,
        originRect.width,
        originRect.height,
        originStyle?.borderRadius,
        isTransform
    )

    const shellComputed = getComputedStyle(shellEl)
    const toBackground = shellComputed.background
    const toShadow = shellComputed.boxShadow
    const toRound = cornerRoundness(shellComputed, shellRect.width, shellRect.height, null, isTransform)
    const startShadow = transparentShadow(toShadow)

    const launchX = (originRect.left + originRect.width / 2) < window.innerWidth / 2 ? 1 : -1
    const launchY = (originRect.top + originRect.height / 2) < window.innerHeight / 2 ? 1 : -1

    const shellStyle = shellEl.style
    const state = {
        x: fromX,
        y: fromY,
        width: originRect.width,
        height: originRect.height,
        roundT: 0,
    }

    shellStyle.position = 'absolute'
    shellStyle.top = '0px'
    shellStyle.left = '0px'
    paintShell(shellStyle, state, fromRound, toRound, isTransform)
    shellStyle.background = fromBackground
    shellStyle.boxShadow = startShadow
    shellStyle.transition = 'none'

    if (bodyEl) {
        bodyEl.style.transform = `scale(${config.contentScale})`
        bodyEl.style.transformOrigin = 'center center'
        bodyEl.style.filter = `blur(${config.contentBlur}px)`
        bodyEl.style.opacity = '0'
    }

    hideOrigin(origin)

    void shellEl.offsetWidth
    shellStyle.transition = [
        `background ${config.colorDuration}s ease-out ${config.colorDelay}s`,
        `box-shadow ${config.shadowDuration}s ease-out ${config.shadowDelay}s`,
    ].join(', ')
    shellStyle.background = toBackground
    shellStyle.boxShadow = toShadow
    if (bodyEl) {
        bodyEl.style.transition = `opacity ${config.colorDuration}s ease-out ${config.colorDelay}s`
        bodyEl.style.opacity = '1'
    }

    const pending = new Set(['x', 'y', 'width', 'height', 'roundT', 'contentScale', 'contentBlur'])

    const motion = createMotion(
        {
            ...state,
            contentScale: config.contentScale,
            contentBlur: config.contentBlur,
        },
        {
            onChange(key, value) {
                if (key in state) {
                    state[key] = value
                    paintShell(shellStyle, state, fromRound, toRound, isTransform)
                    return
                }
                if (key === 'contentScale' && bodyEl) bodyEl.style.transform = `scale(${value})`
                if (key === 'contentBlur' && bodyEl) bodyEl.style.filter = `blur(${value}px)`
            },
            onSettle(key) {
                pending.delete(key)
                if (pending.size === 0) settle()
            },
        },
    )

    const travel = { stiffness: config.stiffness, damping: config.damping, velocity: config.velocity }
    const size = sizeSpring(config)
    const targetState = {
        x: 0,
        y: 0,
        width: shellRect.width,
        height: shellRect.height,
        roundT: 1,
        contentScale: 1,
        contentBlur: 0,
    }
    const springs = {
        x: config.mode === 'transform' ? size : spring({ ...travel, direction: launchX }),
        y: config.mode === 'transform' ? size : spring({ ...travel, direction: launchY }),
        width: size,
        height: size,
        // `roundT` va en su PROPIA instancia porque sus umbrales ya no son los de
        // la caja: comparte los parametros del spring `size` (rigidez, amortiguado,
        // velocidad) pero con la tolerancia expresada en su recorrido. Son la
        // misma curva; lo unico que cambia es cuando se la considera terminada.
        roundT: isTransform
            ? sizeSpring(config, { rest: normalizedRest(state, targetState) })
            : easing({ duration: config.radiusDuration, ease: roundnessEase(false) }),
        contentScale: easing({ duration: config.contentDuration, ease: Easing.easeOut }),
        contentBlur: easing({ duration: config.contentDuration, ease: Easing.easeOut }),
    }

    motion.animate(targetState, springs)

    let settled = false
    const safety = setTimeout(() => settle(), config.maxDuration)

    function settle() {
        if (settled) return
        settled = true
        clearTimeout(safety)
        motion.stop()
        clearFrozen(dialogEl, shellEl, bodyEl)
        onSettle?.()
    }

    return { settle }
}

/**
 * Reverse morph: the dialog collapses back into the origin button.
 * @returns {{ settle: () => void, retarget: (origin: HTMLElement) => void, abort: () => void }}
 */
export function morphToOrigin({ dialogEl, shellEl, bodyEl, origin, originStyle, options = {}, onSettle }) {
    const config = { ...MORPH_DEFAULTS, ...options }

    const savedTransform = dialogEl.style.transform
    dialogEl.style.transform = 'none'

    const unrotatedRect = dialogEl.getBoundingClientRect()
    dialogEl.style.position = 'absolute'
    dialogEl.style.left = `${unrotatedRect.left}px`
    dialogEl.style.top = `${unrotatedRect.top}px`
    dialogEl.style.margin = '0'

    const shellRect = freezeSlot(dialogEl, shellEl, bodyEl)
    dialogEl.style.transform = savedTransform

    const originRect = origin.getBoundingClientRect()
    let toX = originRect.left - shellRect.left
    let toY = originRect.top - shellRect.top

    const originComputed = getComputedStyle(origin)
    const toBackground = originStyle?.background ?? originComputed.background
    const isTransform = config.mode === 'transform'
    const toRound = cornerRoundness(
        originComputed,
        originRect.width,
        originRect.height,
        originStyle?.borderRadius,
        isTransform
    )

    const shellComputed = getComputedStyle(shellEl)
    const fromShadow = shellComputed.boxShadow
    const fromRound = cornerRoundness(shellComputed, shellRect.width, shellRect.height, null, isTransform)
    const originShadow = originStyle?.boxShadow ?? originComputed.boxShadow
    const toShadow = originShadow && originShadow !== 'none'
        ? originShadow
        : transparentShadow(fromShadow)

    const launchX = Math.sign(toX) || 1
    const launchY = Math.sign(toY) || 1

    const shellStyle = shellEl.style
    const state = {
        x: 0,
        y: 0,
        width: shellRect.width,
        height: shellRect.height,
        roundT: 0,
    }

    shellStyle.position = 'absolute'
    shellStyle.top = '0px'
    shellStyle.left = '0px'
    paintShell(shellStyle, state, fromRound, toRound, isTransform)
    shellStyle.transition = 'none'

    if (bodyEl) {
        bodyEl.style.transformOrigin = 'center center'
        bodyEl.style.transition = 'none'
        bodyEl.style.opacity = '1'
    }

    void shellEl.offsetWidth
    shellStyle.transition = [
        `background ${config.colorDuration}s ease-in`,
        `box-shadow ${config.shadowDuration * 0.5}s ease-in`,
    ].join(', ')
    shellStyle.background = toBackground
    shellStyle.boxShadow = toShadow

    if (bodyEl) {
        bodyEl.style.transition = `opacity ${config.closeContentDuration}s ease-in`
        bodyEl.style.opacity = '0'
    }

    const pending = new Set(['x', 'y', 'width', 'height', 'roundT', 'contentScale', 'contentBlur'])

    const motion = createMotion(
        {
            ...state,
            contentScale: 1,
            contentBlur: 0,
        },
        {
            onChange(key, value) {
                if (key in state) {
                    state[key] = value
                    paintShell(shellStyle, state, fromRound, toRound, isTransform)
                    return
                }
                if (key === 'contentScale' && bodyEl) bodyEl.style.transform = `scale(${value})`
                if (key === 'contentBlur' && bodyEl) bodyEl.style.filter = `blur(${value}px)`
            },
            onSettle(key) {
                pending.delete(key)
                if (pending.size === 0) settle()
            },
        },
    )

    const travel = {
        stiffness: config.stiffness,
        damping: config.closeDamping,
        velocity: config.closeVelocity,
        restDelta: config.closeRestDelta,
        restSpeed: config.closeRestSpeed,
    }
    const size = sizeSpring(config, { close: true })
    const targetState = {
        x: toX,
        y: toY,
        width: originRect.width,
        height: originRect.height,
        roundT: 1,
        contentScale: config.contentScale,
        contentBlur: config.contentBlur,
    }
    const springs = {
        x: config.mode === 'transform' ? size : spring({ ...travel, direction: launchX }),
        y: config.mode === 'transform' ? size : spring({ ...travel, direction: launchY }),
        width: size,
        height: size,
        // Ver la apertura: misma instancia propia y mismos umbrales derivados.
        // `close: true` NO es opcional: sin el, `roundT` recibiria `sizeDamping`
        // mientras `width`/`height` reciben `closeSizeDamping`, serian dos curvas
        // distintas y el radio volveria a parar antes que la caja (medido: paraba
        // en el frame 29 contra el 42, con el amortiguado equivocado).
        roundT: isTransform
            ? sizeSpring(config, { close: true, rest: normalizedRest(state, targetState) })
            : easing({ duration: config.radiusDuration, ease: roundnessEase(true) }),
        contentScale: easing({ duration: config.closeContentDuration, ease: Easing.easeInCubic }),
        contentBlur: easing({ duration: config.closeContentDuration, ease: Easing.easeInCubic }),
    }

    motion.animate(targetState, springs)

    motionOf(dialogEl).to({ x: 0, y: 0, rotateZ: 0, rotateX: 0, rotateY: 0 }, {
        spring: config.mode === 'transform' ? size : travel
    })

    let settled = false
    const safety = setTimeout(() => settle(), config.closeMaxDuration)
    const handoffDuration = Math.max(0, Number(config.closeHandoffDuration) || 0)

    function retarget(nextOrigin) {
        if (settled || !(nextOrigin instanceof HTMLElement) || !nextOrigin.isConnected) return
        const next = nextOrigin.getBoundingClientRect()
        toX = next.left - shellRect.left
        toY = next.top - shellRect.top
        motion.animate(
            {
                x: toX,
                y: toY,
            },
            {
                x: spring({ ...travel, velocity: 0 }),
                y: spring({ ...travel, velocity: 0 }),
            },
        )
    }

    function settle() {
        if (settled) return
        settled = true
        clearTimeout(safety)
        motion.stop()
        state.x = toX
        state.y = toY
        state.width = originRect.width
        state.height = originRect.height
        state.roundT = 1
        // `isTransform` no es opcional aqui: `fromRound`/`toRound` se calcularon
        // con `asPixels = isTransform` (lineas 347 y 337), y `paintShell` sin el
        // quinto argumento multiplica el resultado por `minSide`. Medido en modo
        // `transform`: el radio inline saltaba de `28px` a `1568px` en el frame
        // del handoff (= 28 x 56, el radio en px por el alto final). Aqui no se
        // veia porque 28px ya es la pildora de una caja de 56, pero con un trigger
        // de radio menor el relevo daria un salto de esquinas.
        paintShell(shellStyle, state, fromRound, toRound, isTransform)

        if (handoffDuration <= 0) {
            restoreOrigin(origin, { instant: true })
            clearFrozen(dialogEl, shellEl, bodyEl)
            onSettle?.()
            return
        }

        restoreOrigin(origin, { duration: handoffDuration * 1000 })
        shellStyle.transition = 'none'
        shellStyle.opacity = '1'
        void shellEl.offsetWidth
        shellStyle.transition = `opacity ${handoffDuration}s ease-out`
        shellStyle.opacity = '0'
        setTimeout(() => {
            clearFrozen(dialogEl, shellEl, bodyEl)
            onSettle?.()
        }, handoffDuration * 1000 + 20)
    }

    function abort() {
        if (settled) return
        settled = true
        clearTimeout(safety)
        motion.stop()

        shellStyle.transition = `opacity 0.2s ease-out, transform 0.2s ease-out`
        shellStyle.opacity = '0'
        shellStyle.transform = `translate(${state.x}px, ${state.y + 12}px)`

        if (bodyEl) {
            bodyEl.style.transition = `opacity 0.15s ease-out`
            bodyEl.style.opacity = '0'
        }

        setTimeout(() => {
            clearFrozen(dialogEl, shellEl, bodyEl)
            onSettle?.()
        }, 220)
    }

    // Igual que `abort` (instantaneo, sin destapar el origin), pero sin el
    // empujon de 12 px: esta copia se apaga EN SU SITIO. La pide el host cuando
    // el MISMO modal se esta abriendo otra vez encima, y entonces no hay salida
    // que justificar -- el usuario ya esta viendo ese modal. El porque completo,
    // con las medidas, esta en `vanish` de `gsap-morph.js`.
    function vanish() {
        if (settled) return
        settled = true
        clearTimeout(safety)
        motion.stop()

        const duration =
            Math.max(0, Number(config.closeVanishDuration) || 0)

        shellStyle.transition = `opacity ${duration}s ease-out`
        shellStyle.opacity = '0'

        if (bodyEl) {
            bodyEl.style.transition = `opacity ${duration}s ease-out`
            bodyEl.style.opacity = '0'
        }

        setTimeout(() => {
            clearFrozen(dialogEl, shellEl, bodyEl)
            onSettle?.()
        }, duration * 1000 + 20)
    }

    return { settle, retarget, abort, vanish }
}