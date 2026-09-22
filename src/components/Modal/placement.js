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

/**
 * La caja de LAYOUT del disparador, en coordenadas de viewport.
 *
 * `getBoundingClientRect` devuelve la caja PINTADA: incluye el transform del
 * propio elemento. Un `.btn` esta en `scale(0.96)` mientras se mantiene pulsado
 * (button.css), asi que un click real --press, soltar-- deja al disparador
 * midiendose prensado justo cuando el modal se coloca. Medido: el modal
 * aterrizaba atado a esa caja (left 363.405, w 83.965) y al soltar el boton la
 * caja real volvia a (361.837, 87.3): 1.83 px de desfase que el seguidor
 * recorria despues, en escalones. En las diagonales entra por los DOS ejes
 * (`originRect.left` y `originRect.top`), que es donde mas se ve; en las
 * alineadas a un solo borde, por uno.
 *
 * La escala del propio elemento no mueve su caja de layout: se deshace
 * alrededor del centro pintado, que es su origen por defecto
 * (`transform-origin: center`). Con rotacion o skew no se toca: ahi `a`/`d` no
 * son escalas y deshacerlas inventaria una caja.
 */
export function originBox(origin) {
    if (!(origin instanceof HTMLElement)) return origin
    const rect = origin.getBoundingClientRect()
    const tf = getComputedStyle(origin).transform
    if (!tf || tf === 'none') return rect
    // `matrix` o `matrix3d`: una capa promovida (el `.btn` lleva
    // `will-change: transform`) se serializa en 3d, y con dpr/zoom es lo que
    // aparece. Sin esta rama el deshacer no se aplicaria justo donde el bug
    // cambia de tamano.
    let n
    if (/^matrix\(/.test(tf)) n = tf.slice(7, -1).split(',').map(Number).concat([0, 0])
    else if (/^matrix3d\(/.test(tf)) {
        const v = tf.slice(9, -1).split(',').map(Number)
        n = [v[0], v[1], v[4], v[5], v[12], v[13]]
    } else return rect
    const [a, b, c, d, e, f] = n
    if (!(a > 0) || !(d > 0) || Math.abs(b) > 1e-3 || Math.abs(c) > 1e-3) return rect
    if (a === 1 && d === 1 && e === 0 && f === 0) return rect
    const width = rect.width / a
    const height = rect.height / d
    const left = rect.left - e - (width - rect.width) / 2
    const top = rect.top - f - (height - rect.height) / 2
    return { left, top, right: left + width, bottom: top + height, width, height }
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
        ? originBox(origin)
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
    let ultimo = null
    let suave = false
    let forzar = false

    /**
     * Un escalon de LAYOUT mas pequeno que esto no se persigue.
     *
     * No es una tolerancia de comodidad: el seguidor tiene un polo, y el polo
     * convierte cualquier escalon en un deslizamiento. Medido con el disparador
     * desplazado 15 px y el modal abierto: 1.25 s en seis escalones (5 / 3.7 /
     * 1.2 / 0.5 / 0.25 px). El disparador se mueve solo al abrir (la
     * compensacion del scrollbar: +0.10 px medidos), asi que perseguir eso es lo
     * que se ve como "pequenos pasos" en las posiciones que siguen al
     * disparador -- anchor, inplace -- y no en center ni bottom, que no leen su
     * rect. Un desfase por debajo de medio pixel no lo ve nadie: no se persigue.
     */
    const DEADBAND = 0.5

    const tick = () => {
        frame = requestAnimationFrame(tick)
        if (!origin.isConnected) return
        // La caja de layout, no la pintada: si el disparador esta a mitad de una
        // animacion propia (el muelle de `.btn:active`, por ejemplo) su caja
        // pintada no es su sitio, y perseguirla arrastra al modal.
        const rect = originBox(origin)
        const key = `${rect.left.toFixed(1)}|${rect.top.toFixed(1)}|${rect.width.toFixed(1)}|${rect.height.toFixed(1)}`
        // El estado de este frame se consume aqui, no al final: un scroll que
        // no mueve el rect (un scroller anidado) no debe contagiar al siguiente.
        const lasuave = suave
        const laforzar = forzar
        suave = false
        forzar = false
        if (key === last && !laforzar) return
        if (!lasuave && !laforzar && ultimo) {
            const d = Math.max(
                Math.abs(rect.left - ultimo.left),
                Math.abs(rect.top - ultimo.top),
                Math.abs(rect.width - ultimo.width),
                Math.abs(rect.height - ultimo.height),
            )
            if (d < DEADBAND) return
        }
        last = key
        ultimo = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
        onMove(rect, lasuave)
    }

    // El scroll se suaviza; el resize no (el viewport ya no es el de antes: el
    // slot cambia aunque el rect del origin no se mueva, asi que re-apunta
    // siempre y sin banda muerta).
    const alScroll = () => {
        suave = true
        last = ''
    }
    const alResize = () => {
        forzar = true
        last = ''
    }

    frame = requestAnimationFrame(tick)
    window.addEventListener('scroll', alScroll, true)
    window.addEventListener('resize', alResize)

    return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener('scroll', alScroll, true)
        window.removeEventListener('resize', alResize)
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
    let wasBusy = false
    let originRect = null

    const writePos = () => {
        dialog.style.left = `${cur.left}px`
        dialog.style.top = `${cur.top}px`
    }

    /**
     * Donde esta la caja AHORA, en el mismo espacio que `target`: el slot se
     * escribe como left/top del dialogo dentro del item, y el item (inset 0) es
     * el origen de ese espacio.
     */
    const livePos = () => {
        const r = dialog.getBoundingClientRect()
        const base = itemEl.getBoundingClientRect()
        return { left: r.left - base.left, top: r.top - base.top }
    }

    /**
     * ¿La caja lleva un transform puesto? `getBoundingClientRect` lo incluye, asi
     * que con uno vivo `livePos` devuelve la posicion PINTADA, no la de layout.
     *
     * Importa en un sitio concreto: `gesture.js` suelta `dragging` en el
     * pointerup y DESPUES arranca el muelle que devuelve el transform a cero, o
     * sea que el seguidor retoma el mando con el transform todavia vivo. Escribir
     * un left/top leido de ahi mueve el layout por el desplazamiento del arrastre
     * -- ~140 px en un frame con un arrastre de 150 -- que se suma al transform
     * que queda: el mismo salto que este arreglo quita en el traspaso del vuelo,
     * pero en el snap-back. Con transform vivo no se re-lee: el layout no se movio
     * durante el arrastre (el arrastre escribe transform), asi que el `cur` que ya
     * habia sigue siendo el bueno.
     */
    const transformed = () => {
        const t = getComputedStyle(dialog).transform
        return !!t && t !== 'none'
            && t !== 'matrix(1, 0, 0, 1, 0, 0)'
            && t !== 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)'
    }

    /**
     * Convierte el rect vivo del origin en el destino del slot. Escribe lo
     * discreto (clases, dataset, `position`) y deja el resto en `target`.
     */
    const aim = (next) => {
        const { placement, gap, padding } = read()
        originRect = next

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
            // ...pero la caja se mueve igual mientras tanto (un spring de tamano
            // la re-apunta en CADA frame con `relayout`), asi que `cur` se queda
            // viejo. Sin re-leerlo al salir del turno ajeno, el primer frame de
            // vuelta escribiria desde la posicion anterior al spring: un tiron
            // hacia atras. Una lectura por transicion, no por frame.
            wasBusy = true
            frame = requestAnimationFrame(step)
            return
        }
        if (wasBusy) {
            wasBusy = false
            // Y el destino tambien quedo viejo: se calculo con el tamano que la
            // caja tenia entonces (en el vuelo, el del montaje), no con el que
            // tiene ahora. Medido sin este re-apunte: terminado el spring, el polo
            // deslizaba la caja 216px de vuelta a la posicion del tamano viejo.
            // (El destino no depende del transform: se recalcula siempre.)
            if (originRect) aim(originRect)
            if (!transformed()) cur = livePos()
        }
        if (!target) {
            frame = 0
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
        setTarget(next, { smooth = true } = {}) {
            aim(next)
            if (!target) return

            // Primer destino: se nace en la posicion VIVA, no en el destino.
            //
            // Escribir el destino de una era correcto cuando este seguidor se
            // creaba antes del primer pintado. Ya no: `startTracking` corre al
            // terminar el vuelo (host.js) y en cada `refresh`, o sea SIEMPRE con
            // la caja ya pintada. Medido con la card creciendo 200px a mitad de
            // vuelo: el motor suelta el pin del shell y, en la misma tarea, este
            // primer destino escribia el slot recalculado con el tamano nuevo.
            // `top` pasaba de 394.288 a 178.288 -- 216px en un frame, error de
            // interpolacion 108px = local/2 -- y eran las tres unicas escrituras
            // de host.js de toda la apertura. Naciendo vivo, esa escritura no
            // mueve nada cuando el destino ya es el actual, y cuando no lo es el
            // desplazamiento lo hace el polo. Con un transform vivo no hay
            // posicion de layout que leer (ver `transformed`), asi que se cae al
            // comportamiento de siempre.
            const primero = !cur
            if (primero) cur = transformed() ? { left: target.left, top: target.top } : livePos()

            if (read().tau <= 0) {
                // Sin polo (`placementFollow: 0`) la posicion se escribe directa,
                // como siempre: es la unica configuracion que sigue colocando en
                // el frame en vez de deslizar.
                cur = { left: target.left, top: target.top }
                writePos()
                return
            }

            // Un cambio de rect que NO viene de un scroll no se desliza:
            // aterriza en este frame. El polo esta para suavizar el scroll --"un
            // modal que rebota alrededor del trigger mientras se scrollea se lee
            // como error"-- pero aplicado a un escalon de layout convierte el
            // desfase de la apertura en un deslizamiento visible de 1 a 3 s, que
            // es exactamente lo que se reporta. El primer destino no entra aqui:
            // nace vivo a proposito (ver arriba) y su distancia al slot la
            // resuelve el polo.
            if (!smooth && !primero) {
                if (frame) cancelAnimationFrame(frame)
                frame = 0
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
