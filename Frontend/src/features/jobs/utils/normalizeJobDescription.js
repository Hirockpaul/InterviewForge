import DOMPurify from 'dompurify'

const allowedTags = [ 'h1', 'h2', 'h3', 'h4', 'p', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'br', 'a' ]
const headingSelector = 'h1, h2, h3, h4'

function decodeEntities(value) {
    let decoded = String(value || '')
    for (let pass = 0; pass < 2 && /&(?:lt|gt|amp|quot|#\d+|#x[a-f0-9]+);/i.test(decoded); pass += 1) {
        const textarea = document.createElement('textarea')
        textarea.innerHTML = decoded
        const next = textarea.value
        if (next === decoded) break
        decoded = next
    }
    return decoded
}

function cleanText(value) {
    return String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
}

function plainTextToHtml(value) {
    const container = document.createElement('div')
    String(value).split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).forEach((paragraph) => {
        const element = document.createElement('p')
        paragraph.split('\n').forEach((line, index) => {
            if (index) element.append(document.createElement('br'))
            element.append(document.createTextNode(line))
        })
        container.append(element)
    })
    return container.innerHTML
}

function secureLinks(container) {
    container.querySelectorAll('a').forEach((link) => {
        try {
            const url = new URL(link.getAttribute('href') || '', window.location.origin)
            if (![ 'http:', 'https:' ].includes(url.protocol)) throw new Error('Unsafe link')
            link.href = url.href
            link.target = '_blank'
            link.rel = 'noopener noreferrer'
        } catch {
            link.removeAttribute('href')
            link.removeAttribute('target')
            link.removeAttribute('rel')
        }
    })
}

export function normalizeJobDescription(description, { title = '', company = '' } = {}) {
    if (!String(description || '').trim()) return { roleHtml: '', companyHtml: '' }
    const decoded = decodeEntities(description)
    const containsMarkup = /<\/?[a-z][\s\S]*>/i.test(decoded)
    const source = containsMarkup ? decoded : plainTextToHtml(decoded)
    const sanitized = DOMPurify.sanitize(source, {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: [ 'href', 'target', 'rel' ],
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: [ 'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'svg', 'math' ],
        FORBID_ATTR: [ 'style', 'class', 'id' ]
    })
    const documentNode = new DOMParser().parseFromString(sanitized, 'text/html')
    const body = documentNode.body

    const firstHeading = body.querySelector(headingSelector)
    if (firstHeading && cleanText(firstHeading.textContent) === cleanText(title)) firstHeading.remove()

    const companyName = cleanText(company)
    const companyHeading = [ ...body.querySelectorAll(headingSelector) ].find((heading) => {
        const text = cleanText(heading.textContent)
        return /^about (the )?company$/.test(text) || (companyName && text === `about ${companyName}`)
    })
    const companyContainer = document.createElement('div')
    if (companyHeading) {
        const isGenericCompanyHeading = /^about (the )?company$/.test(cleanText(companyHeading.textContent))
        let node = companyHeading
        while (node) {
            const next = node.nextSibling
            companyContainer.append(node)
            node = next
        }

        if (isGenericCompanyHeading) companyHeading.remove()
    }

    secureLinks(body)
    secureLinks(companyContainer)
    return { roleHtml: body.innerHTML.trim(), companyHtml: companyContainer.innerHTML.trim() }
}
