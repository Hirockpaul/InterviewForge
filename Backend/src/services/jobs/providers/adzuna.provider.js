const { getJson } = require('./httpClient')
const { normalizeAdzuna } = require('../jobNormalizer.services')
const { normalizeCountry, normalizeLocation } = require('./providerQuery')

const configured = () => Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY)

function buildSearchUrl(params) {
    const country = normalizeCountry(params.country || process.env.ADZUNA_COUNTRY).toLowerCase()
    const query = new URLSearchParams({ app_id: process.env.ADZUNA_APP_ID, app_key: process.env.ADZUNA_APP_KEY, results_per_page: String(params.limit || 20), what: params.q || '' })
    const location = normalizeLocation(params.location)
    if (location) query.set('where', location)
    if (params.salaryMin) query.set('salary_min', String(params.salaryMin))
    if (params.employmentType) query.set('full_time', params.employmentType === 'full-time' ? '1' : '0')
    if (params.postedDays) query.set('max_days_old', String(params.postedDays))
    if (params.sort === 'salary-desc') query.set('sort_by', 'salary')
    return `https://api.adzuna.com/v1/api/jobs/${country}/search/${params.page || 1}?${query}`
}

async function searchJobs(params) {
    if (!configured()) return []
    const country = normalizeCountry(params.country || process.env.ADZUNA_COUNTRY).toLowerCase()
    const data = await getJson(buildSearchUrl(params))
    return (data.results || []).map((job) => normalizeAdzuna({ ...job, country: country.toUpperCase() })).filter(Boolean)
}

// Adzuna's search response is its complete advert representation; it does not
// expose a separate public advert-detail endpoint for these credentials.
async function getJobDetails(job) { return job }

module.exports = { name: 'adzuna', configured, buildSearchUrl, searchJobs, getJobDetails }
