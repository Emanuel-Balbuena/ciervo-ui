export function fillBody(body, item, { close, id }) {
    if (typeof item.render === 'function') {
        const cleanup = item.render(body, { close, id })
        return typeof cleanup === 'function' ? cleanup : null
    }

    if (item.content instanceof HTMLElement) {
        const card = document.createElement('div')
        card.className = 'apr-card'
        const originalParent = item.content.parentNode
        const originalNextSibling = item.content.nextSibling

        card.append(item.content)
        body.append(card)

        return () => {
            if (item.content.parentNode === card) {
                if (originalParent) {
                    originalParent.insertBefore(item.content, originalNextSibling)
                } else {
                    item.content.remove()
                }
            }
        }
    }

    // Si no hay contenido ni render function, solo mostramos una card vacía
    const card = document.createElement('div')
    card.className = 'apr-card'
    body.append(card)

    return null
}
