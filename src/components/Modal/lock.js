/**
 * Page lock: the rest of the document goes inert, scroll is frozen, and focus
 * is returned when the last dialog leaves.
 *
 * `inert` is the modern stand-in for a hand-rolled focus trap. Everything
 * outside the layer is skipped by tab and by the reader; the layer itself
 * keeps the top dialog interactive.
 */

import { isBrowser } from './env.js'

export function createPageLock() {
    let count = 0
    let locked = []
    let overflow = ''
    let paddingRight = ''
    let previousFocus = null

    function acquire(layer, restoreTo) {
        if (!isBrowser) return
        if (count === 0) {
            previousFocus = restoreTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
            overflow = document.body.style.overflow
            paddingRight = document.body.style.paddingRight
            const gap = window.innerWidth - document.documentElement.getBoundingClientRect().width
            
            document.documentElement.style.setProperty('--apr-scrollbar-compensation', `${gap}px`)
            document.body.style.overflow = 'hidden'
            if (gap > 0) document.body.style.paddingRight = `${gap}px`

            locked = []
            for (const child of document.body.children) {
                if (child === layer || child.inert) continue
                child.inert = true
                locked.push(child)
            }
        }
        count += 1
    }

    function release() {
        if (!isBrowser) return
        count = Math.max(0, count - 1)
        if (count > 0) return

        document.documentElement.style.removeProperty('--apr-scrollbar-compensation')
        document.body.style.overflow = overflow
        document.body.style.paddingRight = paddingRight
        for (const element of locked) element.inert = false
        locked = []

        const target = previousFocus
        previousFocus = null
        if (target?.isConnected) target.focus({ preventScroll: true })
    }

    function destroy() {
        if (count > 0) {
            count = 1
            release()
        }
    }

    // El lock se pide y se suelta por BORDES (el primero en entrar, el ultimo en
    // salir). Un borde perdido -- un item que desaparece del store sin pasar
    // por el cierre -- dejaria la pagina `inert` y el scroll congelado para
    // siempre: el raton muerto. `held()` deja que el host reconcilie contra la
    // realidad sin tocar nada cuando el lock no esta tomado (una `release()` a
    // secas reescribiria el overflow del body con el valor capturado al
    // adquirir, y eso si que rompe algo que no es suyo).
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
