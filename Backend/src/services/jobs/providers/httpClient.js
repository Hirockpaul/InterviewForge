async function getJson(url, options = {}) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), options.timeout || 8000)
    try {
        const response = await fetch(url, { headers: { Accept: 'application/json', ...options.headers }, signal: controller.signal })
        if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`)
        return await response.json()
    } finally {
        clearTimeout(timeout)
    }
}

module.exports = { getJson }
