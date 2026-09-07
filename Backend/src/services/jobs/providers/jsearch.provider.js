const { getJson } = require('./httpClient')
const { normalizeJSearch } = require('../jobNormalizer.services')
const { normalizeCountry, normalizeLocation } = require('./providerQuery')

const configured = () => Boolean(process.env.JSEARCH_API_KEY)

function buildSearchUrl(params) {
    const location = normalizeLocation(params.location)
    const terms = [ params.q || 'jobs', location ? `in ${location}` : '' ].filter(Boolean).join(' ')
    const query = new URLSearchParams({ query: terms, page: String(params.page || 1), num_pages: '1' })
    query.set('country', normalizeCountry(params.country).toLowerCase())
    if (params.remote === 'remote') query.set('remote_jobs_only', 'true')
    if (params.postedDays) query.set('date_posted', params.postedDays <= 1 ? 'today' : params.postedDays <= 3 ? '3days' : params.postedDays <= 7 ? 'week' : 'month')
    return `https://jsearch.p.rapidapi.com/search-v2?${query}`
}

async function searchJobs(params) {
    if (!configured()) return []
    const data = await getJson(buildSearchUrl(params), { headers: { 'X-RapidAPI-Key': process.env.JSEARCH_API_KEY, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' } })
    return (data.data?.jobs || []).map(normalizeJSearch).filter(Boolean).slice(0, params.limit || 20)
}

async function getJobDetails(job) {
    if (!configured() || !job.sourceJobId) return null
    const query = new URLSearchParams({ job_id: job.sourceJobId, country: (job.countries?.[0] || 'IN').toLowerCase() })
    const data = await getJson(`https://jsearch.p.rapidapi.com/job-details?${query}`, { timeout: 30000, headers: { 'X-RapidAPI-Key': process.env.JSEARCH_API_KEY, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' } })
    const raw = data.data?.[0]
    return raw ? normalizeJSearch(raw) : null
}

module.exports = { name: 'jsearch', configured, buildSearchUrl, searchJobs, getJobDetails }
