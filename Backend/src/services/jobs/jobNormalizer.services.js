const crypto = require('crypto')
const { extractJobRequirements } = require('./jobRequirementsExtractor.services')

const text = (value) => typeof value === 'string' ? value.trim() : ''
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : undefined
const date = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : undefined
const list = (value) => Array.isArray(value)
    ? value.map(item => text(
        typeof item === 'object' ? item.name || item.skill || item.label : item
    )).filter(Boolean)
    : []
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countryCodes = { india: 'IN', 'united states': 'US', usa: 'US', 'united kingdom': 'GB', uk: 'GB', canada: 'CA', australia: 'AU', singapore: 'SG' }
function countryCode(value) {
    const normalized = text(value).toLowerCase()
    return normalized.length === 2
        ? normalized.toUpperCase()
        : countryCodes[normalized] || text(value).toUpperCase()
}

function countryName(code) {
    try {
        return countryNames.of(text(code).toUpperCase()) || text(code)
    } catch {
        return text(code)
    }
}

function normalizeRemoteType(value, isRemote = false) {
    if (/hybrid/i.test(value || '')) {
        return 'hybrid'
    }
    if (/remote|fully_remote/i.test(value || '') || isRemote) {
        return 'remote'
    }
    return /on.?site/i.test(value || '') ? 'on-site' : ''
}
const normalizeSeniority = (value, title = '') => {
    if (text(value)) {
        return text(value)
    }
    const match = text(title).match(/^(?:sr\.?|senior|staff|principal|lead|director|vice president|vp)\b/i)
    if (!match) {
        return ''
    }
    const levels = { sr: 'Senior', 'sr.': 'Senior', senior: 'Senior', staff: 'Staff', principal: 'Principal', lead: 'Lead', director: 'Director', 'vice president': 'Vice president', vp: 'Vice president' }
    return levels[match[0].toLowerCase()] || ''
}
const cleanKey = (value) => text(value).toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/[^a-z0-9]+/g, ' ').trim()
function safeUrl(value) {
    try {
        const url = new URL(text(value))
        return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
    } catch {
        return ''
    }
}

function fingerprint(job) {
    const location = job.locations?.[0]
        || job.location?.display
        || [job.location?.city, job.location?.state].filter(Boolean).join(' ')
    let applyHost = ''
    try {
        applyHost = new URL(job.applyUrl).hostname.replace(/^www\./, '')
    } catch {
        // An invalid or missing apply URL simply contributes an empty host.
    }
    return crypto.createHash('sha256')
        .update([job.title, job.company, location, applyHost].map(cleanKey).join('|'))
        .digest('hex')
}

function finish(job) {
    const locations = [...new Set(list(job.locations))]
    const countries = [...new Set(list(job.countries).map(countryCode))]
    const primaryCountry = countries[0] ? countryName(countries[0]) : ''
    const includeCountry = primaryCountry
        && !locations[0]?.toLowerCase().includes(primaryCountry.toLowerCase())
    const display = locations[0]
        ? `${locations[0]}${includeCountry ? `, ${primaryCountry}` : ''}`
        : primaryCountry
    const salaryMin = number(job.salaryMin ?? job.salary?.min)
    const salaryMax = number(job.salaryMax ?? job.salary?.max)
    const salaryCurrency = text(job.salaryCurrency || job.salary?.currency)
    const remoteType = normalizeRemoteType(job.remoteType || job.location?.remoteType, job.location?.remote)
    const description = text(job.description)
    const extracted = extractJobRequirements(description)
    const hasStructuredExperience = job.experience && (
        number(job.experience.minYears) != null
        || number(job.experience.maxYears) != null
        || text(job.experience.text)
    )
    const structuredExperience = hasStructuredExperience ? {
        minYears: number(job.experience.minYears),
        maxYears: number(job.experience.maxYears),
        text: text(job.experience.text),
        source: 'provider'
    } : undefined
    const providerLists = {
        responsibilities: list(job.responsibilities),
        requirements: list(job.requirements),
        qualifications: list(job.qualifications),
        benefits: list(job.benefits)
    }
    const derivedFields = [...(job.derivedFields || [])]
    for (const field of ['responsibilities', 'requirements', 'qualifications', 'benefits']) {
        if (!providerLists[field].length && extracted[field].length) {
            derivedFields.push(field)
        }
    }
    if (!structuredExperience && extracted.experience) {
        derivedFields.push('experience')
    }

    const normalized = {
        ...job,
        title: text(job.title),
        company: text(job.company) || 'Company not listed',
        description,
        responsibilities: providerLists.responsibilities.length
            ? providerLists.responsibilities : extracted.responsibilities,
        requirements: providerLists.requirements.length
            ? providerLists.requirements : extracted.requirements,
        qualifications: providerLists.qualifications.length
            ? providerLists.qualifications : extracted.qualifications,
        benefits: providerLists.benefits.length ? providerLists.benefits : extracted.benefits,
        derivedFields: [...new Set(derivedFields)],
        niceToHaveSkills: list(job.niceToHaveSkills),
        educationRequirements: list(job.educationRequirements),
        locations,
        countries,
        remoteType,
        location: {
            ...(job.location || {}),
            display,
            remote: remoteType === 'remote',
            remoteType
        },
        employmentType: text(job.employmentType),
        seniority: normalizeSeniority(job.seniority, job.title),
        experience: structuredExperience || extracted.experience,
        salaryMin,
        salaryMax,
        salaryCurrency,
        salary: {
            min: salaryMin,
            max: salaryMax,
            currency: salaryCurrency,
            period: text(job.salary?.period)
        },
        skills: [...new Set(list(job.skills))],
        postedAt: date(job.postedAt),
        applyUrl: safeUrl(job.applyUrl),
        sourceUrl: safeUrl(job.sourceUrl),
        isActive: job.isActive !== false
    }
    normalized.fingerprint = fingerprint(normalized)
    return normalized.title && normalized.sourceJobId ? normalized : null
}

function normalizeJobDataLake(raw) {
    const company = raw.company || {}
    return finish({ source: 'jobdatalake', sourceJobId: text(raw.id || raw.job_handle || raw.handle || raw.job_id), sourceHandle: text(raw.job_handle || raw.handle), title: raw.title || raw.job_title,
        company: company.name || raw.company_name, description: raw.description || raw.description_html || raw.description_text, responsibilities: raw.responsibilities, requirements: raw.requirements, qualifications: raw.qualifications || raw.required_qualifications, benefits: raw.benefits,
        educationRequirements: raw.education_requirements || (raw.education_requirement ? [ raw.education_requirement ] : []), locations: raw.locations, countries: raw.countries, remoteType: raw.remote_type || raw.remote_policy?.type || raw.remote_policy,
        employmentType: text(raw.employment_type || raw.time_type), seniority: Array.isArray(raw.seniority) ? raw.seniority[0] : text(raw.seniority), experience: raw.experience || { minYears: raw.experience_min_years, maxYears: raw.experience_max_years, text: raw.experience_text }, salaryMin: raw.salary_min, salaryMax: raw.salary_max, salaryCurrency: raw.salary_currency || raw.currency, salary: { period: text(raw.salary_period) },
        skills: raw.required_skills || raw.skills, niceToHaveSkills: raw.nice_to_have_skills, postedAt: raw.posted_at || raw.date_posted, applyUrl: raw.apply_url || raw.url, sourceUrl: raw.source_url || raw.url })
}

function normalizeAdzuna(raw) {
    const area = raw.location?.area || []
    return finish({ source: 'adzuna', sourceJobId: text(raw.id), title: raw.title, company: raw.company?.display_name, description: raw.description,
        locations: [ raw.location?.display_name || area.at(-1) ].filter(Boolean), countries: [ raw.country || area[0] ].filter(Boolean), remoteType: /hybrid/i.test(raw.description || '') ? 'hybrid' : /remote|work from home/i.test(`${raw.title} ${raw.description}`) ? 'remote' : 'on-site',
        employmentType: raw.contract_type || raw.contract_time, salaryMin: raw.salary_min, salaryMax: raw.salary_max, salaryCurrency: raw.salary_currency, salary: { period: 'year' }, postedAt: raw.created, applyUrl: raw.redirect_url, sourceUrl: raw.redirect_url })
}

function normalizeJSearch(raw) {
    return finish({ source: 'jsearch', sourceJobId: text(raw.job_id), title: raw.job_title, company: raw.employer_name, description: raw.job_description,
        locations: [ raw.job_location || [ raw.job_city, raw.job_state ].filter(Boolean).join(', ') ].filter(Boolean), countries: [ raw.job_country ].filter(Boolean), remoteType: raw.work_arrangement || (raw.job_is_remote ? 'remote' : 'on-site'),
        employmentType: text(raw.job_employment_type), seniority: text(raw.seniority_level || raw.job_required_experience?.experience_level), salaryMin: raw.job_min_salary, salaryMax: raw.job_max_salary, salaryCurrency: raw.job_salary_currency, salary: { period: text(raw.job_salary_period) },
        skills: raw.required_technologies || raw.job_required_skills, niceToHaveSkills: raw.preferred_technologies,
        responsibilities: raw.job_highlights?.Responsibilities, requirements: raw.job_highlights?.Requirements, qualifications: raw.job_highlights?.Qualifications, benefits: raw.job_highlights?.Benefits,
        experience: { minYears: raw.job_required_experience?.required_experience_in_months != null ? Number(raw.job_required_experience.required_experience_in_months) / 12 : undefined, text: raw.job_required_experience?.experience_mentioned ? text(raw.job_required_experience?.experience_level) : '' },
        educationRequirements: raw.education_required ? [ raw.education_required ] : [], postedAt: raw.job_posted_at_datetime_utc, applyUrl: raw.job_apply_link || raw.job_google_link, sourceUrl: raw.job_google_link })
}

module.exports = { normalizeJobDataLake, normalizeAdzuna, normalizeJSearch, fingerprint }
