const nationwideValues = new Set([ '', 'all', 'all india', 'all locations', 'anywhere', 'nationwide' ])

function normalizeLocation(value) {
    const location = String(value || '').trim()
    return nationwideValues.has(location.toLowerCase()) ? '' : location
}

function normalizeCountry(value, fallback = 'IN') {
    const country = String(value || fallback).trim().toUpperCase()
    return /^[A-Z]{2}$/.test(country) ? country : fallback
}

module.exports = { normalizeLocation, normalizeCountry }
