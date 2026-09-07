const Job = require('../../models/job.model')
const JobAnalysis = require('../../models/jobAnalysis.model')
const InterviewReport = require('../../models/interviewReport.model')
const { generateInterviewReport } = require('../ai.services')
const repository = require('./jobRepository.services')
const { mergeJobs } = require('./jobDeduplicator.services')
const { analyzeMatch, contentHash } = require('./jobAi.services')
const jobDataLake = require('./providers/jobDataLake.provider')
const adzuna = require('./providers/adzuna.provider')
const jsearch = require('./providers/jsearch.provider')

const primaryProviders = [ jobDataLake, adzuna ]
const providers = new Map([ jobDataLake, adzuna, jsearch ].map((provider) => [ provider.name, provider ]))

async function fetchProvider(provider, params, failures) {
    if (!provider.configured()) return []
    try { return await provider.searchJobs(params) } catch (error) {
        failures.push(provider.name)
        console.error(`Job provider ${provider.name} failed:`, error.message)
        return []
    }
}

async function refreshJobs(params) {
    const failures = []
    const batches = await Promise.all(primaryProviders.map((provider) => fetchProvider(provider, params, failures)))
    let jobs = mergeJobs(batches.flat())
    if (jobs.length < params.limit && jsearch.configured()) jobs = mergeJobs([ ...jobs, ...await fetchProvider(jsearch, params, failures) ])
    await repository.upsertJobs(jobs)
    return { failures, sources: [ ...new Set(jobs.flatMap((job) => job.sourceReferences?.map((ref) => ref.source) || [ job.source ])) ] }
}

async function searchJobs(params) {
    let cached = await repository.findJobs(params)
    const cacheIsFresh = cached.jobs.some((job) => Date.now() - new Date(job.lastSeenAt).getTime() < 15 * 60 * 1000)
    let refresh = { failures: [], sources: [] }
    if (!cacheIsFresh || cached.jobs.length < params.limit) {
        refresh = await refreshJobs(params)
        cached = await repository.findJobs(params)
    }
    return { ...cached, ...refresh }
}

async function getJobDetails(job) {
    const provider = providers.get(job.source)
    if (!provider?.getJobDetails) return job
    try {
        const details = await provider.getJobDetails(job)
        if (!details) return job
        const merged = { ...job, ...details, _id: job._id, source: job.source, sourceJobId: job.sourceJobId, sourceHandle: details.sourceHandle || job.sourceHandle, sourceReferences: job.sourceReferences,
            remoteType: details.remoteType || job.remoteType || '', employmentType: details.employmentType || job.employmentType || '', seniority: details.seniority || job.seniority || '',
            experience: details.experience?.text || details.experience?.minYears != null ? details.experience : job.experience,
            skills: [ ...new Set([ ...(job.skills || []), ...(details.skills || []) ]) ], locations: details.locations?.length ? details.locations : job.locations, countries: details.countries?.length ? details.countries : job.countries,
            salary: details.salary?.min != null || details.salary?.max != null ? details.salary : job.salary, salaryMin: details.salaryMin ?? job.salaryMin, salaryMax: details.salaryMax ?? job.salaryMax, salaryCurrency: details.salaryCurrency || job.salaryCurrency || '',
            responsibilities: details.responsibilities?.length ? details.responsibilities : job.responsibilities, requirements: details.requirements?.length ? details.requirements : job.requirements,
            qualifications: details.qualifications?.length ? details.qualifications : job.qualifications, benefits: details.benefits?.length ? details.benefits : job.benefits,
            derivedFields: [ ...new Set([ ...(job.derivedFields || []), ...(details.derivedFields || []) ]) ],
            applyUrl: details.applyUrl || job.applyUrl, sourceUrl: details.sourceUrl || job.sourceUrl }
        const { _id, __v, ...stored } = merged
        await Job.updateOne({ _id: job._id }, { $set: stored })
        return merged
    } catch (error) {
        console.error(`Job detail provider ${job.source} failed (handle: ${job.sourceHandle || 'unavailable'}; HTTP-safe error: ${error.message})`)
        return job
    }
}

async function latestCandidate(userId) {
    return InterviewReport.findOne({ user: userId, $or: [ { resume: { $ne: '' } }, { selfDescription: { $ne: '' } } ] }).sort({ createdAt: -1 }).select('resume selfDescription title').lean()
}

async function analyzeJob(job, userId) {
    const candidate = await latestCandidate(userId)
    if (!candidate || !(candidate.resume || candidate.selfDescription || '').trim()) return { missingProfile: true }
    const hash = contentHash(job, candidate)
    let analysis = await JobAnalysis.findOne({ user: userId, job: job._id, contentHash: hash }).lean()
    if (!analysis) analysis = (await JobAnalysis.create({ user: userId, job: job._id, contentHash: hash, ...await analyzeMatch(job, candidate) })).toObject()
    return { analysis }
}

async function prepareInterview(job, userId) {
    const candidate = await latestCandidate(userId)
    if (!candidate || !(candidate.resume || candidate.selfDescription || '').trim()) return { missingProfile: true }
    const generated = await generateInterviewReport({ resume: candidate.resume || '', selfDescription: candidate.selfDescription || '', jobDescription: job.description })
    const report = await InterviewReport.create({ user: userId, resume: candidate.resume || '', selfDescription: candidate.selfDescription || '', jobDescription: job.description, targetJob: job._id, ...generated })
    return { report }
}

async function syncRecentJobs() {
    return refreshJobs({ q: '*', location: '', country: 'IN', page: 1, limit: 50, postedDays: 3, postedAfter: new Date(Date.now() - 3 * 86400000), sort: 'newest' })
}

module.exports = { searchJobs, getJobDetails, analyzeJob, prepareInterview, syncRecentJobs, latestCandidate }
