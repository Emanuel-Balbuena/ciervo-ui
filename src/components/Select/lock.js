/**
 * Memoria de foco. Nada mas.
 *
 * Un select NO es un modal. El modal congela el scroll y deja el resto de la
 * pagina `inert` a proposito: mientras decide algo, la pagina no opina. Un
 * desplegable no tiene ese derecho -- se abre al lado de lo que estabas haciendo
 * y tienes que poder seguir tocando lo de al lado. Medido con el lock de antes:
 * `body.overflow` a `hidden`, el boton vecino devolviendo `BODY` en un
 * `elementFromPoint`, y el scroll muerto.
 *
 * Aqui solo se guarda a donde volver y se lleva el foco al dialogo. La superficie
 * es la misma que la del lock del modal (`acquire`/`release`/`destroy`/`held`)
 * para que el host no tenga que saber cual de los dos esta usando.
 *
 * Y de paso desaparece un acoplamiento que no era evidente: cada componente
 * tiene SU PROPIA instancia, y las dos escribian `body.style.overflow` guardando
 * el valor anterior para restaurarlo. Con el select abierto y un modal encima, el
 * modal capturaba `"hidden"` -- el valor que el select acababa de escribir -- y
 * al cerrarse lo devolvia. La pagina se quedaba sin scroll PARA SIEMPRE, con todo
 * cerrado. Reproducido: paso 7 de la tabla de abajo. Que el select no capture
 * nada deja al del modal como unico dueño y el problema no existe en ninguna
 * combinacion.
 *
 *   | paso              | body.overflow | paddingRight |
 *   | 0. limpio         | ""            | ""           |
 *   | 1. select         | hidden        | 15px         |
 *   | 2. cerrado        | ""            | ""           |
 *   | 5. select         | hidden        | 15px         |
 *   | 6. + modal encima | hidden        | 15px         |
 *   | 7. todo cerrado   | hidden  <-    | 15px   <-    |
 */

import { isBrowser } from './env.js'

export function createPageLock() {
    let count = 0
    let previousFocus = null

    /**
     * `layer` se acepta y se ignora: la firma es la del lock del modal, que si
     * lo necesita para marcar `inert` a todo lo demas. Mantenerla deja a los dos
     * hosts llamando igual.
     */
    function acquire(_layer, restoreTo) {
        if (!isBrowser) return
        if (count === 0) {
            previousFocus = restoreTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
        }
        count += 1
    }

    function release() {
        if (!isBrowser) return
        count = Math.max(0, count - 1)
        if (count > 0) return

        const target = previousFocus
        previousFocus = null
        if (target?.isConnected) target.focus({ preventScroll: true })
    }

    function destroy() {
        count = 0
        previousFocus = null
    }

    // El host reconcilia con esto: si el ultimo borde se hubiera perdido, la
    // memoria quedaria tomada y el foco no volveria a su sitio. Un `release()` a
    // secas cuando no esta tomado no hace nada malo (a diferencia del lock del
    // modal, aqui no hay ningun estilo de la pagina que reescribir).
    function held() {
        return count > 0
    }

    return { acquire, release, destroy, held }
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function focusFirst(dialog) {
    if (!(dialog instanceof HTMLElement)) return
    const inner = dialog.querySelector(FOCUSABLE)
    ;(inner instanceof HTMLElement ? inner : dialog).focus({ preventScroll: true })
}
