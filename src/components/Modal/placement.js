/**
 * Where the dialog slot sits before the morph measures it.
 *
 * The morph flies originRect → freezeSlot(dialog). Changing destination is
 * a layout problem: top/left on .apr-dialog, never a CSS transform.
 *
 * El seguidor del scroll (`createSlotFollow`) vive aqui porque es eso mismo:
 * un destino que se mueve. Lo unico que cambia es que en vez de escribir la
 * posicion en seco, la persigue con un polo. Persigue la SALIDA del calculo
 * (`slotFor`), no el rect del origin: el porque, medido, esta en su cabecera.
 */

export const PLACEMENTS = new Set([
    'center', 'anchor', 'bottom',
    'inplace', 'inplace-tl', 'inplace-t', 'inplace-tr',
    'inplace-l', 'inplace-r',
    'inplace-bl', 'inplace-b', 'inplace-br'
])

export function resolvePlacement(value, origin) {
    const placement = PLACEMENTS.has(value) ? value : 'center'
    if (placement !== 'center' && !(origin instanceof HTMLElement && origin.isConnected)) {
        return 'center'
    }
    return placement
}

function clamp(value, min, max) {
    if (max < min) return min
    return Math.min(max, Math.max(min, value))
}

export function placementClasses(itemEl, dialog, placement) {
    itemEl.classList.toggle('apr-item-placed', placement !== 'center')
    itemEl.classList.toggle('apr-item-inplace', placement.startsWith('inplace'))
    itemEl.classList.toggle('apr-item-sheet', placement === 'bottom')
    dialog.classList.toggle('apr-sheet', placement === 'bottom')
}

/**
 * El calculo, SIN escribir nada. De un rect de origen y un tamano de caja sale
 * la rama y la posicion.
 *
 * Vive aparte de `layoutSlot` porque el seguidor del scroll necesita el destino
 * calculado sin escribirlo, y con el calculo aislado puede perseguir la SALIDA
 * (left/top) en vez de la entrada (el rect del origin). Esa diferencia no es
 * cosmetica: ver `createSlotFollow`.
 */
export function slotFor(originRect, size, placement, {
    gap = 8,
    padding = 16,
} = {}) {
    const width = size.width
    const height = size.height
    const padLeft = padding
    const padRight = padding
    const padTop = padding
    const padBottom = padding

    let actualPlacement = placement
    let left
    let top

    if (actualPlacement.startsWith('inplace')) {
        let isTop = actualPlacement.includes('t') && actualPlacement !== 'inplace'
        let isBottom = actualPlacement.includes('b') && actualPlacement !== 'inplace'
        let isLeft = actualPlacement.endsWith('l')
        let isRight = actualPlacement.endsWith('r')

        const inset = 8

        if (isLeft) left = originRect.left - inset
        else if (isRight) left = originRect.right - width + inset
        else left = originRect.left + originRect.width / 2 - width / 2

        if (isLeft && left + width > window.innerWidth - padRight) {
            isLeft = false; isRight = true
            left = originRect.right - width + inset
        } else if (isRight && left < padLeft) {
            isRight = false; isLeft = true
            left = originRect.left - inset
        }

        if (isTop) top = originRect.top - inset
        else if (isBottom) top = originRect.bottom - height + inset
        else top = originRect.top + originRect.height / 2 - height / 2

        if (isTop && top + height > window.innerHeight - padBottom) {
            isTop = false; isBottom = true
            top = originRect.bottom - height + inset
        } else if (isBottom && top < padTop) {
            isBottom = false; isTop = true
            top = originRect.top - inset
        }

        if (!isTop && !isBottom && !isLeft && !isRight) actualPlacement = 'inplace'
        else {
            let y = isTop ? 't' : (isBottom ? 'b' : '')
            let x = isLeft ? 'l' : (isRight ? 'r' : '')
            actualPlacement = y || x ? `inplace-${y}${x}` : 'inplace'
        }
    } else if (placement === 'bottom') {
        left = window.innerWidth / 2 - width / 2
        top = window.innerHeight - height - padBottom
    } else {
        left = originRect.left
        top = originRect.bottom + gap
        if (top + height > window.innerHeight - padBottom) {
            top = originRect.top - height - gap
        }
        if (left + width > window.innerWidth - padRight) {
            left = originRect.right - width
        }
    }

    left = clamp(left, padLeft, window.innerWidth - width - padRight)
    top = clamp(top, padTop, window.innerHeight - height - padBottom)

    return { left, top, placement: actualPlacement }
}

export function layoutSlot(dialog, itemEl, origin, placement, {
    gap = 8,
    padding = 16,
} = {}) {
    placementClasses(itemEl, dialog, placement)

    if (placement === 'center') {
        dialog.dataset.aprPlacement = placement
        dialog.style.position = ''
        dialog.style.top = ''
        dialog.style.left = ''
        return
    }

    dialog.style.position = 'absolute'
    dialog.style.top = '0px'
    dialog.style.left = '0px'

    // `origin` es el elemento del trigger, o un rect ya medido. El seguidor del
    // scroll NO pasa por aqui: persigue la salida de `slotFor`.
    const originRect = origin instanceof HTMLElement
        ? origin.getBoundingClientRect()
        : origin
    const rect = dialog.getBoundingClientRect()
    const slot = slotFor(originRect, { width: rect.width, height: rect.height }, placement, {
        gap,
        padding,
    })

    dialog.dataset.aprPlacement = slot.placement
    dialog.style.left = `${slot.left}px`
    dialog.style.top = `${slot.top}px`
}

export function trackOrigin(origin, onMove) {
    if (!(origin instanceof HTMLElement)) return () => { }

    let frame = 0
    let last = ''

    const tick = () => {
        frame = requestAnimationFrame(tick)
        if (!origin.isConnected) return
        const rect = origin.getBoundingClientRect()
        const key = `${rect.left.toFixed(1)}|${rect.top.toFixed(1)}|${rect.width.toFixed(1)}|${rect.height.toFixed(1)}`
        if (key === last) return
        last = key
        onMove(rect)
    }

    const nudge = () => {
        last = ''
    }

    frame = requestAnimationFrame(tick)
    window.addEventListener('scroll', nudge, true)
    window.addEventListener('resize', nudge)

    return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener('scroll', nudge, true)
        window.removeEventListener('resize', nudge)
    }
}

/**
 * El seguimiento del scroll, suavizado.
 *
 * Solo se suaviza esta fisica, y no por disciplina sino por construccion:
 * `layoutSlot` escribe `left`/`top`, el arrastre escribe `transform` (via
 * `motionOf`), y `element.js` no lee nunca del DOM. Son propiedades y
 * mecanismos distintos, asi que esta fisica no alcanza a ninguna otra.
 *
 * Un solo polo, no un spring: un polo no puede sobrepasar, y un modal que
 * rebota alrededor del trigger mientras se scrollea se lee como un error.
 * `k = 1 - exp(-dt/tau)` deja el resultado independiente de los fps.
 *
 * SE PERSIGUE LA SALIDA, NO LA ENTRADA. Esto se hizo al reves primero
 * (suavizar el rect del origin y luego pasarselo a `layoutSlot`) y esta medido
 * que es peor que no suavizar nada, porque `slotFor` NO es continuo respecto
 * del rect: tiene un escalon (el flip arriba/abajo) y un clamp. Suavizar la
 * entrada barre ese escalon y saca al modal por sitios donde no deberia estar.
 *
 * Medido en `anchor` con un scroll de 250 px, mismo instrumento:
 *   - recorrido real del slot .................. 11.8 px
 *   - sin suavizado (tau 0) .................... un escalon de 11.8 px, 1 frame
 *   - suavizando la ENTRADA (tau 0.18) ......... un salto de 186.98 px hacia
 *     abajo y 80 frames de vuelta: el rect suavizado decaia por la zona donde
 *     el flip se apaga (rect.top 138.99 + 56 + 8 = 202.99)
 *   - suavizando la SALIDA (tau 0.18) .......... 11.8 px repartidos, sin
 *     sobrepaso
 *
 * Lo discreto (la rama, el dataset) se aplica de inmediato: el flip no es algo
 * que se interpole. Lo que se desliza es la posicion, que con el escalon ya
 * resuelto es una cantidad continua.
 */
export function createSlotFollow({
    dialog,
    itemEl,
    read,
    isBusy = () => false,
}) {
    // El destino ya calculado (la posicion del slot) y la posicion suavizada
    // que se escribe. Dos numeros cada uno: un polo sobre left/top no necesita
    // el rect entero, y copiar un DOMRect a mano fue justo la trampa anterior
    // (`{ ...rect }` devuelve `{}` porque left/top son accessors).
    let target = null
    let cur = null
    let frame = 0
    let lastT = 0

    const writePos = () => {
        dialog.style.left = `${cur.left}px`
        dialog.style.top = `${cur.top}px`
    }

    /**
     * Convierte el rect vivo del origin en el destino del slot. Escribe lo
     * discreto (clases, dataset, `position`) y deja el resto en `target`.
     */
    const aim = (next) => {
        const { placement, gap, padding } = read()

        // Las clases primero: `apr-sheet` cambia el tamano de la caja y el
        // tamano entra en el clamp. Mismo orden que `layoutSlot`.
        placementClasses(itemEl, dialog, placement)

        const rect = dialog.getBoundingClientRect()
        const slot = slotFor(next, { width: rect.width, height: rect.height }, placement, {
            gap,
            padding,
        })

        if (slot.placement === 'center') {
            dialog.dataset.aprPlacement = slot.placement
            dialog.style.position = ''
            dialog.style.top = ''
            dialog.style.left = ''
            target = null
            cur = null
            return
        }

        dialog.style.position = 'absolute'
        dialog.dataset.aprPlacement = slot.placement
        target = { left: slot.left, top: slot.top }
    }

    const step = (now) => {
        const dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000))
        lastT = now

        // En arrastre, en vuelo o en un spring de tamano manda el otro dueno:
        // se espera sin escribir, para poder retomar la persecucion despues.
        if (isBusy()) {
            frame = requestAnimationFrame(step)
            return
        }

        const tau = read().tau
        const k = tau > 0 ? 1 - Math.exp(-dt / tau) : 1

        const dLeft = target.left - cur.left
        const dTop = target.top - cur.top
        const residual = Math.max(Math.abs(dLeft), Math.abs(dTop))

        cur.left += dLeft * k
        cur.top += dTop * k

        // Un destino no finito (un origin ya desconectado, por ejemplo) no puede
        // converger nunca: mejor parar que girar para siempre escribiendo
        // "NaNpx", que el navegador ignora en silencio.
        if (!Number.isFinite(residual)) {
            frame = 0
            return
        }

        if (residual < 0.25) {
            // Ultima escritura exacta: el reposo queda clavado en el destino y
            // no a medio pixel de el.
            cur = { left: target.left, top: target.top }
            writePos()
            frame = 0
            return
        }

        writePos()
        frame = requestAnimationFrame(step)
    }

    return {
        /**
         * Rect vivo del origin. Se calcula a que posicion lo lleva el placement
         * y se persigue ESA posicion. Con `tau = 0` es la escritura directa de
         * siempre, en el mismo frame.
         */
        setTarget(next) {
            aim(next)
            if (!target) return

            if (!cur) {
                // Primer destino: se escribe donde toca, sin animacion. Si no,
                // el modal arrancaria deslizandose desde (0,0).
                cur = { left: target.left, top: target.top }
                writePos()
                return
            }

            if (read().tau <= 0) {
                cur = { left: target.left, top: target.top }
                writePos()
                return
            }

            if (frame) return

            lastT = performance.now()
            frame = requestAnimationFrame(step)
        },

        stop() {
            if (frame) cancelAnimationFrame(frame)
            frame = 0
        },
    }
}
