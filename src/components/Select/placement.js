/**
 * Where the dialog slot sits before the morph measures it.
 *
 * The morph flies originRect → freezeSlot(dialog). Changing destination is
 * a layout problem: top/left on .slt-dialog, never a CSS transform.
 *
 * El seguidor del scroll (`createSlotFollow`) vive aqui porque es eso mismo:
 * un destino que se mueve. Lo unico que cambia es que en vez de escribir la
 * posicion en seco, la persigue con un polo. Persigue la SALIDA del calculo
 * (`slotFor`), no el rect del origin: el porque, medido, esta en su cabecera.
 */

// `inkOffsetOf`/`labelOffsetOf` viven en el motor y miden TINTA, que es la
// unidad del elemento compartido. Se importan en vez de duplicarlas: alinear
// cajas en vez de tinta es exactamente el defecto que costo la etapa 1 (la
// etiqueta del trigger es un `<span>` inline y su caja es la de los glifos; la
// de la fila es un item flex), y una segunda copia de la medida se
// desincronizaria en silencio. No hay ciclo: `select.js` no importa este
// modulo -- solo lo nombra en un comentario.
import { inkOffsetOf, labelOffsetOf } from './select.js'

export const PLACEMENTS = new Set([
    'center', 'anchor', 'bottom',
    'inplace', 'inplace-tl', 'inplace-t', 'inplace-tr',
    'inplace-l', 'inplace-r',
    'inplace-bl', 'inplace-b', 'inplace-br',
    'sticky'
])

// La clave del elemento compartido. Es el contrato del motor
// (`collectGhostSpecs`), no una invencion de esta capa.
const ANCHOR_KEY = 'title'


export function resolvePlacement(value, origin, mode) {
    let placement = PLACEMENTS.has(value) ? value : 'inplace-t'
    if (placement === 'bottom' || placement === 'center') placement = 'inplace-t'
    if (!(origin instanceof HTMLElement && origin.isConnected)) {
        return 'inplace-t'
    }
    // El simple no vuela (el host no hace morph en este modo), asi que la unica
    // caja con sentido es la suelta bajo el trigger: anchor.
    if (mode === 'simple') return 'anchor'
    // El morph gsap necesita la caja pegada al trigger (borde compartido); con
    // anchor la caja va suelta y con hueco, y el vuelo no tiene de donde salir.
    if (mode === 'gsap' && placement === 'anchor') return 'inplace-t'
    return placement
}

function clamp(value, min, max) {
    if (max < min) return min
    return Math.min(max, Math.max(min, value))
}

/**
 * La FORMA depende del placement pedido -- es una propiedad del diseno, no del
 * hueco. Se aplica antes de medir porque `slt-sheet` cambia el tamano de la caja
 * y el tamano entra en el calculo del slot.
 */
export function placementClasses(itemEl, dialog, placement) {
    itemEl.classList.toggle('slt-item-placed', placement !== 'center')
    // El sticky entra por la misma puerta que los `inplace-*`: la caja es la del
    // trigger (mismo ancho, mismo overlay que no bloquea) y solo cambia DONDE se
    // coloca. La clase no dice "vuela desde el trigger", dice "esta pegado a el".
    itemEl.classList.toggle('slt-item-inplace', placement.startsWith('inplace') || placement === 'sticky')
    itemEl.classList.toggle('slt-item-sheet', placement === 'bottom')
    dialog.classList.toggle('slt-sheet', placement === 'bottom')
    dialog.dataset.placement = placement;
}

/**
 * El LADO va por el placement RESUELTO, no por el pedido.
 *
 * Cuando la caja no cabe donde se pidio, `slotFor` la voltea. El contenido
 * necesita enterarse: si el trigger tiene que ir abajo, la lista va arriba, y al
 * reves. Derivarlo del pedido -- como se hacia antes -- dejaba al contenido
 * poniendo el elemento compartido en el extremo equivocado cada vez que habia
 * vuelco: medido, 166.8 px de salto.
 *
 * Se aplica DESPUES de `slotFor`, porque el lado es su salida.
 */
export function sideClasses(dialog, placement) {
    // Solo los `inplace-*` tienen lado. Un `includes('t')` a secas se disparaba
    // con `'bottom'`, que lleva las dos letras: la hoja quedaba marcada como
    // arriba Y como abajo a la vez. El contenido no puede decidir con eso.
    const value = String(placement)
    const sided = value.startsWith('inplace-')
    dialog.classList.toggle('slt-placed-top', sided && value.includes('t'))
    dialog.classList.toggle('slt-placed-bottom', sided && value.includes('b'))
}

/**
 * El ancho del select ES el del trigger, y se fija con las TRES restricciones.
 *
 * Escribir solo `width` dejaba dos puertas abiertas: `max-width` -- el
 * `--slt-max-width` de la hoja, `min(440px, 100vw - 32px)` -- podia estrangular
 * la caja por debajo del trigger, y un contenido mas ancho podia estirarla por
 * encima. Cualquiera de las dos rompe la regla y desalinea el elemento
 * compartido. Con las tres clavadas deja de ser algo que hay que recordar.
 *
 * Solo para los `inplace-*` y el sticky. Los modos futuros -- el select grande
 * separado del trigger -- usaran otro placement, y ahi `size` y
 * `--slt-max-width` vuelven a mandar.
 */
function pinWidth(dialog, originRect, placement) {
    const value0 = String(placement)
    if (!value0.startsWith('inplace') && value0 !== 'sticky') return
    const value = `${originRect.width}px`
    dialog.style.width = value
    dialog.style.minWidth = value
    dialog.style.maxWidth = value
}

/**
 * El tope de alto que devuelve `slotFor` cuando la caja no cabe en ningun lado.
 * `null` lo levanta, que es lo que hay que hacer en cuanto vuelve a haber sitio.
 */
function pinMaxHeight(dialog, maxHeight) {
    dialog.style.maxHeight = maxHeight == null ? '' : `${maxHeight}px`
}

/**
 * El rect del origin SIN su escala.
 *
 * `slotFor` responde a una pregunta de layout -- donde va el slot de ESTE
 * origin -- y una escala no es layout, es estado visual. Medido: el boton del
 * demo se hunde con `.btn:active { transform: scale(0.96) }` y su resorte
 * (`button.css`, `--btn-spring-duration`) sigue animando cuando el clic ya
 * abrio el modal. La apertura medía el boton a medio hundir -- scale 0.9925,
 * rect 88.098 en vez de 88.763, con el centro intacto -- y congelaba el slot
 * con ese error. Al soltar, el resorte volvia a 1, el primer frame del
 * seguidor recalculaba el slot con el rect de reposo y su escritura de arranque
 * es en seco, asi que el dialogo se teletransportaba esos 0.33 px (hasta "unos
 * px" con un trigger ancho) JUSTO al acabar la animacion. Por eso el salto
 * desaparece abriendo con Enter: el teclado no activa `:active`.
 *
 * Se deshace la escala con la matriz computada y el `transform-origin`, que es
 * exacto para escala (lo que usan los efectos de pulsacion). La TRASLACION se
 * conserva: es posicion, y un origin movido por transform (un carrusel, una
 * entrada animada) tiene que seguir arrastrando el slot. Con `a === 1` esto es
 * la identidad, asi que un origin sin escala no cambia ni un decimal.
 *
 * Limites, dichos en vez de adivinados: con rotacion o skew devuelve el rect
 * tal cual (reconstruir la caja desde su bounding box seria inventar), y si la
 * escala viene de un ANCESTRO no la ve, porque el transform computado de un
 * elemento no incluye el de sus padres.
 */
export function unscaledRect(el) {
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    const transform = style.transform
    if (!transform || transform === 'none') return rect
    const parts = transform.match(/^matrix\(([^)]+)\)$/)
    if (!parts) return rect
    const [a, b, c, d] = parts[1].split(',').map(Number)
    if (Math.abs(b) > 0.001 || Math.abs(c) > 0.001 || !(a > 0) || !(d > 0)) return rect
    const origin = style.transformOrigin.split(' ').map(parseFloat)
    const width = rect.width / a
    const height = rect.height / d
    const left = rect.left - origin[0] * (1 - a)
    const top = rect.top - origin[1] * (1 - d)
    return {
        left, top, width, height,
        right: left + width,
        bottom: top + height,
        x: left, y: top,
    }
}

/**
 * Los numeros que el sticky necesita del DOM, medidos UNA vez.
 *
 * El sticky clava la TINTA de la fila elegida en la TINTA del trigger y crece
 * alrededor -- es el "center inplace dinamico" de Radix. La posicion de la caja
 * no la decide el hueco sino la fila:
 *
 *     top(scroll) = originRect.top + inkTarget - inkInBox(scroll)
 *
 * `inkTarget` = donde cae la tinta de la etiqueta del trigger dentro de su caja;
 * `inkInBox` = donde cae la de la fila dentro de la caja del shell, y baja con el
 * scroll de la lista (`inkInBox(scroll) = inkInBoxAhora - (scroll - scrollAhora)`).
 * Tinta y no cajas por lo mismo que en el cierre: la etiqueta del trigger es un
 * `<span>` inline (su caja es la de los glifos) y la de la fila es un item flex,
 * asi que alineando cajas la fila queda ~1px por debajo -- es el defecto que el
 * dueno reporto y lo que arreglo la etapa 1.
 *
 * La identidad es la de la ESQUINA de la tinta -- su borde superior izquierdo --,
 * y con la fila 5 anclada a 800 la tinta del trigger y la de la fila dan las dos
 * `538, 389.844`: 0.000 en x y en y, a tres decimales. Lo que NO coincide es el
 * resto del glifo, y no es error de colocacion: el trigger dibuja a 16px/500 y
 * las filas a 15px/600, asi que la tinta de la fila mide 19 de alto por 63.109 de
 * ancho contra 20 y 64.703 del trigger -- 1px y 1.5px menos, con el borde de
 * arriba clavado. Soltar su `overflow: hidden` no mueve la medida (19 con y sin
 * el), o sea que no hay recorte: es la tipografia. Y en pixeles, a 6x
 * (`shoot-sticky-ink.cjs`), la diferencia es la del antialias de un glifo mas
 * chico y mas grueso: el borde de arriba cae 0.333 mas arriba y el de la izquierda
 * 0.167, sobre los mismos `1403.01` y `538.667` del trigger cerrado. Si algun dia
 * la fila anclada tiene que dibujar EXACTAMENTE el mismo texto que el trigger, lo
 * que hay que tocar es el tamano y el peso de la fila, no este archivo.
 *
 * Queda UNA variable libre, el scroll, y se elige para CENTRAR la fila en la
 * lista visible, que es literalmente "el modal se centra sobre la opcion actual".
 * De ahi sale el top. No hay iteracion: la cuenta es afin. La cuenta no supone
 * nada del alto de fila ni del padding de la lista -- mide la fila donde esta.
 *
 * Devuelve `null` -- y entonces el sticky no se coloca, se queda en el trigger --
 * si no hay lista o no hay ancla marcada. Un sticky sin fila que clavar no tiene
 * posicion que calcular.
 */
function stickyAnchor(dialog, origin, originRect) {
    const list = dialog.querySelector('.slt-list')
    const anchor = dialog.querySelector(`[data-morph-split="${ANCHOR_KEY}"]`)

    if (!list || !anchor) return null

    // La caja de referencia es la del SHELL, que es la que el cierre usa para el
    // mismo numero (`inkOffsetOf(exitSource, shellRect)`): las dos cuentas tienen
    // que hablar del mismo espacio o el vuelo no coincide con el reposo.
    const shell = dialog.querySelector('.slt-shell') ?? dialog
    const ink = inkOffsetOf(anchor, unscaledRect(shell))

    // La tinta del trigger dentro del trigger. Sin marca en el trigger el
    // respaldo es 0 -- la esquina --, igual que en el cierre: peor alineado, no
    // roto.
    const target =
        origin instanceof HTMLElement
            ? labelOffsetOf(origin, originRect, ANCHOR_KEY)
            : { x: 0, y: 0 }

    const aRect = anchor.getBoundingClientRect()
    const listRect = list.getBoundingClientRect()

    // Lo que hay que scrollear para que la fila caiga en el medio de la parte
    // visible de la lista. Con la lista sin maquetar (`height` 0, que pasa en la
    // primera colocacion si el contenido acaba de mudarse al dialogo) esto valdria
    // cualquier cosa, asi que se deja el scroll donde esta.
    const centered =
        listRect.height > 0
            ? listRect.top + listRect.height / 2
            : aRect.top + aRect.height / 2

    return {
        inkTarget: target.y,
        inkInBox: ink.y,
        scrollNow: list.scrollTop,
        maxScroll: Math.max(0, list.scrollHeight - list.clientHeight),
        idealScroll: list.scrollTop + (aRect.top + aRect.height / 2 - centered),
    }
}

/**
 * El ancla CONGELADA en la apertura, leida del dialogo.
 *
 * El desplazamiento de la fila dentro de la caja se congela al abrir, y las
 * re-colocaciones usan el numero congelado. Es lo que hace que el popup siga al
 * trigger cuando la pagina se re-maqueta y, a la vez, que NO salte cuando el
 * usuario desplaza la lista por dentro: con la medida viva, cada scroll de la
 * lista moveria la caja para volver a clavar la fila, o sea el popup persiguiendo
 * al dedo.
 */
function frozenAnchor(dialog) {
    const ink = parseFloat(dialog.dataset.sltAnchorInk)
    const target = parseFloat(dialog.dataset.sltAnchorTarget)

    if (!Number.isFinite(ink) || !Number.isFinite(target)) return null

    return { inkInBox: ink, inkTarget: target, frozen: true }
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
    trim = true,
    anchor = null,
} = {}) {
    const width = size.width
    const height = size.height
    // `padLeft` ya no se usa: el unico consumidor era el vuelco l/r, que se fue
    // con el clamp horizontal. El margen vertical si sigue vivo -- es el que
    // decide cuanto puede crecer la caja antes de recortarla.
    const padRight = padding
    const padTop = padding
    const padBottom = padding

    let actualPlacement = placement
    let left
    let top
    // Tope de alto a escribir en el dialogo, o `null` si la caja cabe entera.
    let maxHeight = null
    // El borde vertical esta pegado al origin y no se reclampea. Ver mas abajo.
    let glued = false
    // El ancla esta clavada en un PUNTO (la tinta del trigger), no en un borde.
    // Solo el sticky. Ver el deslizamiento de mas abajo.
    let pinned = false
    // El scroll que hay que darle a la lista. Solo el sticky lo usa, y solo al
    // abrir: es la otra mitad de su colocacion. Ver mas abajo.
    let anchorScroll = null

    if (actualPlacement.startsWith('inplace')) {
        let isTop = actualPlacement.includes('t') && actualPlacement !== 'inplace'
        let isBottom = actualPlacement.includes('b') && actualPlacement !== 'inplace'
        let isLeft = actualPlacement.endsWith('l')
        let isRight = actualPlacement.endsWith('r')

        const inset = 0

        // IZQUIERDA, no centro.
        //
        // El ancho del select ES el del trigger, asi que las tres ramas dan el
        // mismo numero y la izquierda es la respuesta. La rama centrada de antes
        // solo acertaba por casualidad -- mientras los anchos coincidian -- y en
        // cuanto diferian se llevaba el elemento compartido justo la mitad de la
        // diferencia: medido, +25 px con un trigger de 300 y +45.7 px con uno de
        // 341. `l`/`r` se conservan para los modos futuros, donde la caja si
        // puede ser mas ancha que el trigger; con ancho exacto son un no-op.
        if (isLeft) left = originRect.left - inset
        else if (isRight) left = originRect.right - width + inset
        else left = originRect.left

        // El vuelco izquierda/derecha se fue con el clamp horizontal. Con el
        // ancho clavado al del trigger su POSICION era un no-op -- `right - width`
        // y `left` son el mismo numero -- pero no era inofensivo: reescribe
        // `actualPlacement` con la letra contraria, y de ahi salen el dataset y
        // las clases que orientan el contenido. Un no-op de posicion que cambia
        // el layout del contenido es una trampa con temporizador. El modo ancho
        // futuro lo volvera a necesitar y lo pondra cuando exista.

        if (isTop || isBottom) {
            glued = true

            // EL BORDE PEGADO AL TRIGGER NO SE MUEVE NUNCA.
            //
            // `inplace-t` pega el borde SUPERIOR de la caja al del origin (crece
            // hacia abajo); `inplace-b` pega el INFERIOR (crece hacia arriba).
            // Ese borde es donde vive el elemento compartido, asi que es la
            // unica coordenada del sistema que no puede negociarse.
            //
            // Antes esto se decidia volteando y despues reclampeando `top` al
            // viewport. Medido: una caja de 828 px en un viewport de 728 acababa
            // en `top: 16`, con el trigger DESPEGADO 444 px de su origen. El
            // clamp era el culpable: movia `top`, y con el se movia el borde.
            //
            // Ahora, cuando no cabe en ningun lado, no se mueve `top`: se
            // RECORTA el alto. El borde pegado queda clavado por construccion, y
            // el borde opuesto se queda dentro del padding solo, porque
            // `originRect.bottom - roomAbove === originRect.height + padTop`.
            const roomAbove = originRect.top - padTop
            const roomBelow = window.innerHeight - originRect.bottom - padBottom
            const roomiest = Math.max(roomAbove, roomBelow)

            // `trim: false` es una RE-COLOCACION, no una apertura: el alto ya se
            // decidio al abrir y aqui no se vuelve a decidir. Y no es un detalle
            // de estilo -- medido, con el recorte vivo el alto de la caja
            // dependia de donde estuviera el trigger en el viewport, asi que
            // scrollear la pagina la redimensionaba: en un viewport de 560 la
            // caja iba de 246 a 352 px sin que nadie tocara el contenido.
            //
            // Lo que si se conserva es el VOLTEO (`fitsPreferred`), que es lo
            // unico que el dueno quiere que pase al scrollear: si ya no cabe de
            // un lado, se cambia de lado.
            let boxHeight = height
            if (trim && height >= roomiest) {
                // Punto fijo a proposito. Recortada a `roomiest`, la caja vuelve
                // a medir exactamente `roomiest`, la condicion se cumple otra vez
                // y el recorte no oscila. Con `>` en vez de `>=` una caja que
                // midiera justo el hueco se recortaria y se soltaria en frames
                // alternos.
                boxHeight = Math.max(0, roomiest)
                maxHeight = boxHeight
            }

            // El lado pedido manda; si ahi no cabe, se voltea al otro. Despues
            // del recorte uno de los dos lados siempre cabe, asi que no hay
            // tercera rama. El desempate a favor del lado pedido sale gratis:
            // recortada, `boxHeight === roomiest`, asi que solo "cabe" el lado
            // que tenga el hueco mayor.
            const preferDown = isTop
            const fitsPreferred = preferDown ? boxHeight <= roomBelow : boxHeight <= roomAbove
            const goDown = fitsPreferred ? preferDown : !preferDown

            isTop = goDown
            isBottom = !goDown
            top = goDown ? originRect.top - inset : originRect.bottom - boxHeight + inset
        } else {
            top = originRect.top + originRect.height / 2 - height / 2
        }

        if (!isTop && !isBottom && !isLeft && !isRight) actualPlacement = 'inplace'
        else {
            let y = isTop ? 't' : (isBottom ? 'b' : '')
            let x = isLeft ? 'l' : (isRight ? 'r' : '')
            actualPlacement = y || x ? `inplace-${y}${x}` : 'inplace'
        }
    } else if (actualPlacement === 'sticky') {
        // RAMA PROPIA, y no por la de los `inplace-*`.
        //
        // Sus tres puertas llevan `startsWith('inplace')` -- el calculo, `pinWidth`
        // y las clases -- y colarlo por ahi sin tocarlas lo dejaba en la rama
        // generica de "abajo con volteo" con `glued = false`: el clamp vertical
        // peleandose con la `top` que calcula el sticky. Ademas su letra `t` lo
        // metia en el decodificador de lados de los `inplace-*`, que leeria
        // "sticky" como "arriba".
        glued = true
        pinned = true
        left = originRect.left

        const viewportH = window.innerHeight

        // El alto: el natural, acotado al viewport. Con la fila clavada a la tinta
        // del trigger no hay clamp que rescate una caja mas alta que la pantalla
        // -- bajar la caja despegaria la fila de su trigger -- asi que se recorta
        // y la lista scrollea, que es lo que ya sabe hacer.
        const boxHeight = Math.min(height, Math.max(0, viewportH - padTop - padBottom))
        if (boxHeight < height) maxHeight = boxHeight

        if (anchor?.frozen) {
            // Re-colocacion: la identidad se mantiene con el desplazamiento
            // CONGELADO y la lista no se toca -- si el usuario la ha scrolleado,
            // la caja no se mueve con el. Aqui no hay scroll que calcular.
            top = originRect.top + anchor.inkTarget - anchor.inkInBox
        } else if (anchor) {
            // K0 = el top que clava la tinta con `scroll = 0`, para que
            // `top = K0 + scroll` sea una recta y el clamp una resta.
            const K0 = originRect.top + anchor.inkTarget - anchor.inkInBox - anchor.scrollNow

            // El scroll que se va a escribir TIENE que estar en `[0, maxScroll]`:
            // el navegador recorta cualquier otro y la caja quedaria colocada
            // segun un scroll que no es el que hay. Por eso los dos topes del
            // viewport se pasan a scroll y se recortan ANTES de elegir, en vez de
            // recortar la `top` despues.
            const lowest = Math.max(0, Math.min(anchor.maxScroll, Math.max(padTop - K0, 0)))
            const highest = Math.max(0, Math.min(anchor.maxScroll, viewportH - padBottom - boxHeight - K0))

            // Centrar la fila manda mientras quepa; cuando no, manda el scroll
            // que se puede escribir. La tinta sigue clavada en los dos casos:
            // `top` sale siempre de `K0 + scroll`, nunca se reclampea aparte.
            const scroll = clamp(anchor.idealScroll, lowest, Math.max(lowest, highest))

            top = K0 + scroll
            anchorScroll = scroll
        } else {
            // Sin lista o sin ancla no hay fila que clavar: la caja se queda en el
            // trigger, que es el respaldo honesto.
            top = originRect.top
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

    // El horizontal NO se reclampea, ni con el padding ni con los bordes.
    //
    // Con el ancho clavado al del trigger, un trigger que quepa en pantalla ya
    // vive dentro de `[0, innerWidth - width]`: el clamp es un no-op y solo
    // dispara cuando el TRIGGER se esta saliendo. Y ahi lo unico que hace es
    // desalinear el elemento compartido -- mueve la caja a un sitio donde su
    // trigger no esta -- sin arreglar nada, porque el trigger sigue igual de
    // fuera. Medido con un trigger de 600 px en un viewport de 583: 61.4 px de
    // desalineacion. Una caja que se sale de la pantalla junto a su trigger es
    // honesta; una que se queda y deja al trigger atras, no.
    //
    // El vertical solo se reclampea cuando NO hay borde pegado. Cuando lo hay,
    // `top` ya esta calculado desde el y no se toca: ver arriba.
    if (!glued) {
        left = clamp(left, 0, Math.max(0, window.innerWidth - width))
        top = clamp(top, padTop, window.innerHeight - height - padBottom)
    } else if (!trim && !pinned) {
        // Con el alto ya decidido, si la caja no cabe se DESLIZA en vez de
        // encogerse: el borde pegado al trigger deja de estarlo, pero la caja
        // sigue entera y entera se puede usar -- con el recorte se quedaba sin
        // las primeras filas, que es peor que estar despegada.
        //
        // Cuando la caja SI cabe, esto es la identidad y el borde pegado no se
        // mueve ni un decimal: el caso normal no paga nada por el extremo.
        //
        // El sticky NO entra aqui, y esta medido: su ancla es un PUNTO -- la
        // tinta del trigger --, asi que deslizar la caja no la despega "un poco"
        // como despega un borde, la despega ENTERA. Con la fila 12 elegida en un
        // viewport de 340 la caja pide `top = -122.28` (el ancla esta a 282 px
        // del borde de arriba de la caja y la tinta del trigger, a 160), y este
        // clamp la empujaba a `16`: medido, la fila quedaba **138.29 px** por
        // debajo del trigger -- con las dos medidas buenas, porque el numero
        // congelado del ancla (`sltAnchorInk = 282.125`) coincidia con la tinta
        // viva al centesimo. Una caja que se sale por arriba con la fila clavada
        // en su trigger es honesta; una que se queda y deja la fila atras, no --
        // que es el mismo trato que el clamp horizontal de arriba.
        top = clamp(top, padTop, Math.max(padTop, window.innerHeight - height - padBottom))
    }

    return { left, top, placement: actualPlacement, maxHeight, anchorScroll }
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
        ? unscaledRect(origin)
        : origin

    pinWidth(dialog, originRect, placement)

    // El tope se LEVANTA antes de medir, y esto no es cosmetico: si no, a partir
    // de la segunda pasada el dialogo se mediria a si mismo ya recortado y
    // `slotFor` dejaria de ver el alto natural. Con el tope puesto, "¿cabe?" pasa
    // a ser una pregunta sobre el propio recorte -- y un recorte se contesta que
    // si, siempre. Levantarlo no cuesta un frame: medir y escribir pasan en el
    // mismo bloque, el navegador pinta una sola vez. Y deja la decision en
    // funcion de (origin, tamano natural, viewport) y nada mas.
    pinMaxHeight(dialog, null)

    // Sin escala: en un select apilado, `restack` encoge el dialogo, y medir con
    // el `getBoundingClientRect` metia ese 0.96 en toda la aritmetica del slot.
    const box = unscaledRect(dialog)

    // El sticky mide su ancla AQUI y solo aqui: al abrir. Las re-colocaciones
    // (`aim`) usan el numero congelado. Ver `frozenAnchor`.
    const anchor = placement === 'sticky' ? stickyAnchor(dialog, origin, originRect) : null

    const slot = slotFor(originRect, { width: box.width, height: box.height }, placement, {
        gap,
        padding,
        anchor,
    })

    // El tope se fija SIEMPRE, y con un numero: `slot.maxHeight` (el recorte) si
    // lo hubo, y si no el alto natural que se acaba de medir. Escribir el alto
    // natural no cambia nada visible y es lo que deja el tamano DECIDIDO -- el
    // seguidor del scroll ya no lo recalcula, solo coloca (ver `aim`). Sin esto,
    // la caja que cabia entera se quedaba sin tope y la primera re-colocacion le
    // volvia a pedir el alto al viewport.
    pinMaxHeight(dialog, slot.maxHeight ?? box.height)

    dialog.dataset.aprPlacement = slot.placement
    sideClasses(dialog, slot.placement)
    dialog.style.left = `${slot.left}px`
    dialog.style.top = `${slot.top}px`

    // La otra mitad de la colocacion del sticky: el scroll de la lista, y el
    // numero congelado que usaran las re-colocaciones. El desplazamiento de la
    // fila no se vuelve a MEDIR -- eso si seria un reflow --, se calcula en
    // aritmetica desde el scroll que quedo.
    //
    // Y EL QUE QUEDO NO ES EL QUE SE PIDIO. Esto esta medido: el navegador
    // cuantiza el offset de scroll a una rejilla de 1 px CSS (a DPR 1, 2 y 1.5:
    // `22.28125 -> 22`, `22.75 -> 23`, `0.5 -> 1`, o sea redondeo y no truncado),
    // y el scroll es el UNICO grado de libertad del sticky. Escribir 22.28125 y
    // congelar la tinta para 22.28125 deja la fila por debajo de su trigger:
    // medido, `dy = 0.281` en los viewports de 340 y 260 -- justo los dos en los
    // que decide el SUELO del scroll (`lowest = padTop - K0`), que es cuando el
    // pedido sale fraccionario. Donde el pedido ya es entero (las filas y la
    // lista miden entero) el desvio vale 0 y este bloque no cambia nada.
    //
    // Asi que se lee el scroll de verdad -- Blink lo devuelve ya redondeado en el
    // MISMO tick, medido; no hace falta ceder un frame -- y la identidad se
    // cierra contra el: la tinta congelada se calcula con ese numero, y la `top`
    // (que sale de `K0 + scroll`) se corrige por la diferencia. Es lo unico que
    // vale en cualquier rejilla, en vez de suponer la de este navegador.
    if (anchor && slot.anchorScroll != null) {
        const list = dialog.querySelector('.slt-list')

        if (list) {
            if (Math.abs(list.scrollTop - slot.anchorScroll) > 0.5) {
                list.scrollTop = slot.anchorScroll
            }

            // El que quedo, no el que se pidio. Con el margen de 0.5 de arriba
            // este numero tambien cubre el caso en que no se escribio nada: si el
            // scroll ya estaba a menos de medio pixel, el que manda es el que hay.
            const real = list.scrollTop
            const desvio = real - slot.anchorScroll

            if (desvio !== 0) {
                dialog.style.top = `${slot.top + desvio}px`
            }

            dialog.dataset.sltAnchorInk = String(
                anchor.inkInBox - (real - anchor.scrollNow)
            )
            dialog.dataset.sltAnchorTarget = String(anchor.inkTarget)
        }
    }
}

export function trackOrigin(origin, onMove) {
    if (!(origin instanceof HTMLElement)) return () => { }

    let frame = 0
    let last = ''

    const tick = () => {
        frame = requestAnimationFrame(tick)
        if (!origin.isConnected) return
        const rect = unscaledRect(origin)
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

    // La posicion que el dialogo tiene YA escrita en el DOM, por `layoutSlot` o
    // por el ultimo paso del polo. Es la verdad de donde esta la caja.
    const writtenPos = () => {
        const left = parseFloat(dialog.style.left)
        const top = parseFloat(dialog.style.top)
        return Number.isFinite(left) && Number.isFinite(top) ? { left, top } : null
    }

    /**
     * Convierte el rect vivo del origin en el destino del slot. Escribe lo
     * discreto (clases, dataset, `position`) y deja el resto en `target`.
     */
    const aim = (next) => {
        const { placement, gap, padding } = read()

        // Las clases primero: `slt-sheet` cambia el tamano de la caja y el
        // tamano entra en el clamp. Mismo orden que `layoutSlot`.
        placementClasses(itemEl, dialog, placement)

        pinWidth(dialog, next, placement)

        // AQUI NO SE LEVANTA EL TOPE, y es la diferencia entera con `layoutSlot`.
        //
        // Levantarlo medía el alto NATURAL y volvia a pasar el viewport por el
        // recorte en cada frame de scroll: el alto de la caja acababa siendo
        // funcion de donde estuviera el trigger, o sea la caja se
        // redimensionaba al scrollear. Medido en un viewport de 560: de 246 a
        // 352 px, y encima animado por el `ResizeObserver` del host.
        //
        // Con el tope puesto, lo que se mide es el alto YA DECIDIDO (el que
        // escribio `layoutSlot`), y `trim: false` le dice a `slotFor` que no lo
        // vuelva a decidir: solo coloca y, si hace falta, voltea.
        const box = unscaledRect(dialog)

        // El sticky se re-coloca con el ancla CONGELADA, y sin tocar la lista. Si
        // no hay numero congelado (una re-colocacion antes de la primera
        // colocacion) no se coloca: dejar la caja donde esta es mejor que
        // teletransportarla a una posicion inventada.
        const anchor = placement === 'sticky' ? frozenAnchor(dialog) : null

        if (placement === 'sticky' && !anchor) {
            dialog.style.position = 'absolute'
            return
        }

        const slot = slotFor(next, { width: box.width, height: box.height }, placement, {
            gap,
            padding,
            trim: false,
            anchor,
        })

        if (slot.placement === 'center') {
            dialog.dataset.aprPlacement = slot.placement
            sideClasses(dialog, slot.placement)
            pinMaxHeight(dialog, slot.maxHeight)
            dialog.style.position = ''
            dialog.style.top = ''
            dialog.style.left = ''
            target = null
            cur = null
            return
        }

        // El tope NO se escribe aqui. Lo fijo `layoutSlot` al abrir y esta ruta
        // solo coloca: escribir `slot.maxHeight` (que con `trim: false` es
        // siempre `null`) borraria el alto decidido en el primer frame de scroll
        // y la caja saltaria al natural.

        dialog.style.position = 'absolute'
        dialog.dataset.aprPlacement = slot.placement
        sideClasses(dialog, slot.placement)
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
                // Primer destino. El dialogo YA esta donde lo dejo `layoutSlot`
                // (o el vuelo que acaba de aterrizar): se adopta esa posicion
                // en vez de saltar al destino. Escribir el destino en seco es,
                // literalmente, el "llega y salta": el rect del origin medido
                // al abrir y el medido aqui pueden diferir en decimas (una
                // pulsacion a medio resorte, un reflow de fuente) y esas
                // decimas se pagaban de golpe en un frame. Adoptando la
                // posicion, el polo las absorbe y sigue clavando el destino
                // exacto en cuanto baja de 0.25 px.
                const written = writtenPos()
                if (!written) {
                    // Sin posicion escrita no hay nada que adoptar (y si no,
                    // arrancaria deslizandose desde (0,0)).
                    cur = { left: target.left, top: target.top }
                    writePos()
                    return
                }
                cur = written
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
