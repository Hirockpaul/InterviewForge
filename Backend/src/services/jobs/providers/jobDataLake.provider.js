const { getJson } = require('./httpClient')
const { normalizeJobDataLake } = require('../jobNormalizer.services')
const { normalizeCountry, normalizeLocation } = require('./providerQuery')

const configured = () => Boolean(process.env.JOBDATALAKE_API_KEY)

function buildSearchUrl(params) {
    const location = normalizeLocation(params.location)
    const query = new URLSearchParams({ q: params.q || '*', page: String(params.page || 1), per_page: String(params.limit || 20) })
    if (location) query.set('location', location)
    query.set('countries', normalizeCountry(params.country))
    query.set('sort_by', params.sort === 'salary-desc' ? 'salary_max_usd:desc' :
         params.sort === 'salary-asc' ? 'salary_min_usd:asc' :
         params.sort === 'oldest' ? 'posted_at:asc' : 'posted_at:desc')
    if (params.remote === 'remote') query.set('remote_type', 'fully_remote')
    if (params.experience) query.set('seniority', params.experience)
    if (params.salaryMin) query.set('salary_min', String(params.salaryMin))
    if (params.postedAfter) query.set('posted_after', String(params.postedAfter.getTime()))
    return `https://api.jobdatalake.com/v1/jobs?${query}`
}

async function searchJobs(params) {
    if (!configured()) return []
    const data = await getJson(buildSearchUrl(params), { headers: { 'X-API-Key': process.env.JOBDATALAKE_API_KEY } })
    return (data.jobs || data.results || data.data || []).map(normalizeJobDataLake).filter(Boolean)
}

async function getJobDetails(job) {
    if (!configured() || !job.sourceHandle) return null
    const data = await getJson(`https://api.jobdatalake.com/v1/jobs/${encodeURIComponent(job.sourceHandle)}`,
     { headers: { 'X-API-Key': process.env.JOBDATALAKE_API_KEY } })
    return normalizeJobDataLake(data.job || data.data || data)
}

module.exports = { name: 'jobdatalake', configured, buildSearchUrl, searchJobs, getJobDetails }
