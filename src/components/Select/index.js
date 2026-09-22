/**
 * Select vanilla entry point.
 */

import { createSelectStore } from './store.js'
import { createSelectHost } from './host.js'
import './select.css'

export { createSelectStore } from './store.js'
export { createSelectHost, HOST_DEFAULTS } from './host.js'
export { morphFromOrigin, morphToOrigin, hideOrigin, restoreOrigin, MORPH_DEFAULTS } from './morph.js'
export { isBrowser, prefersReducedMotion } from './env.js'
export { createMotion, spring, easing } from '../../core/motion/engine.js'
export { Easing, springEase, springEasePath } from '../../core/motion/easing.js'
export { motionOf, killMotion } from '../../core/motion/element.js'
export { MORPH_PRESETS, resolveMorph, applySize, SIZE_WIDTHS } from './presets.js'

export function createSelect(options = {}) {
    const store = createSelectStore()
    const host = createSelectHost({ store, options, mountTo: options.mountTo ?? 'body' })
    const pending = new Map()

    host.onRemoved = (id, result) => {
        pending.get(id)?.(result)
        pending.delete(id)
    }

    function open(opts = {}) {
        host.mount()
        const id = store.open(opts)
        let resolve
        const promise = new Promise((r) => { resolve = r })
        pending.set(id, resolve)
        promise.id = id
        return promise
    }

    function close(id, result, options = {}) {
        if (id == null) store.closeTop(result, options)
        else store.close(id, result, options)
    }

    return {
        open,
        close,
        closeAll: () => store.closeAll(),
        update: (id, patch) => store.update(id, patch),
        configure: (patch) => host.configure(patch),
        refresh: (id) => host.refresh(id),
        destroy: () => {
            for (const resolve of pending.values()) resolve(undefined)
            pending.clear()
            host.destroy()
        },
        store,
        host,
    }
}

export const select = createSelect()
export default select
