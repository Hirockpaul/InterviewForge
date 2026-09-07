const mongoose = require('mongoose')
const { z } = require('zod')
const Job = require('../models/job.model')
const SavedJob = require('../models/savedJob.model')
const JobSearch = require('../models/jobSearch.model')
const jobsService = require('../services/jobs/jobs.services')

const querySchema = z.object({
    q: z.string().trim().max(120).optional().default(''), location: z.string().trim().max(100).optional().default(''),
    country: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()).optional().default('IN'),
    remote: z.enum([ 'remote', 'hybrid', 'on-site' ]).optional(), experience: z.enum([ 'entry', 'mid', 'senior' ]).optional(),
    salaryMin: z.coerce.number().min(0).max(100000000).optional(), salaryMax: z.coerce.number().min(0).max(100000000).optional(),
    posted: z.enum([ 'today', '3d', '7d', '30d' ]).optional(), employmentType: z.string().trim().max(40).optional(),
    sort: z.enum([ 'newest', 'oldest', 'best-match', 'salary-desc', 'salary-asc', 'relevance' ]).optional().default('newest'),
    page: z.coerce.number().int().min(1).max(100).optional().default(1), limit: z.coerce.number().int().min(1).max(50).optional().default(20)
})

function parseQuery(req, res) {
    const result = querySchema.safeParse(req.query)
    if (!result.success) { res.status(400).json({ message: result.error.issues[0].message }); return null }
    const params = result.data
    const days = params.posted === 'today' ? 1 : Number.parseInt(params.posted) || undefined
    const location = /^(all|all india|all locations|india|nationwide)$/i.test(params.location) ? '' : params.location
    return { ...params, location, postedDays: days, postedAfter: days ? new Date(Date.now() - days * 86400000) : undefined }
}

async function list(req, res) {
    const params = parseQuery(req, res); if (!params) return
    const result = await jobsService.searchJobs(params)
    const savedIds = new Set((await SavedJob.find({ user: req.user.id }).select('job').lean()).map((item) => String(item.job)))
    const scores = await require('../models/jobAnalysis.model').find({ user: req.user.id, job: { $in: result.jobs.map((job) => job._id) } }).sort({ createdAt: -1 }).select('job matchScore').lean()
    const scoreByJob = new Map(scores.map((analysis) => [ String(analysis.job), analysis.matchScore ]))
    if (params.sort === 'best-match') result.jobs.sort((a, b) => (scoreByJob.get(String(b._id)) ?? -1) - (scoreByJob.get(String(a._id)) ?? -1))
    JobSearch.create({ user: req.user.id, query: params.q, filters: params }).catch((error) => console.error('Could not record job search:', error.message))
    return res.json({ jobs: result.jobs.map((job) => ({ ...job, saved: savedIds.has(String(job._id)), matchScore: scoreByJob.get(String(job._id)) })), pagination: { page: params.page, limit: params.limit, total: result.total, hasNext: params.page * params.limit < result.total }, metadata: { sources: result.sources.length ? result.sources : [ ...new Set(result.jobs.map((job) => job.source)) ], lastUpdated: result.jobs[0]?.lastSeenAt || null, partialFailure: result.failures.length > 0 } })
}

async function details(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid job ID.' })
    let job = await Job.findById(req.params.id).lean()
    if (!job) return res.status(404).json({ message: 'Job not found.' })
    job = await jobsService.getJobDetails(job)
    const saved = Boolean(await SavedJob.exists({ user: req.user.id, job: job._id }))
    const analysis = await require('../models/jobAnalysis.model').findOne({ user: req.user.id, job: job._id }).sort({ createdAt: -1 }).lean()
    return res.json({ job: { ...job, saved }, analysis })
}

async function save(req, res) {
    if (!mongoose.isValidObjectId(req.params.id) || !await Job.exists({ _id: req.params.id })) return res.status(404).json({ message: 'Job not found.' })
    await SavedJob.updateOne({ user: req.user.id, job: req.params.id }, { $setOnInsert: { savedAt: new Date() } }, { upsert: true })
    return res.status(201).json({ saved: true })
}

async function unsave(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid job ID.' })
    await SavedJob.deleteOne({ user: req.user.id, job: req.params.id })
    return res.json({ saved: false })
}

async function saved(req, res) {
    const records = await SavedJob.find({ user: req.user.id }).sort({ savedAt: -1 }).populate('job').lean()
    const active = records.filter((record) => record.job)
    const analyses = await require('../models/jobAnalysis.model').find({ user: req.user.id, job: { $in: active.map((record) => record.job._id) } }).sort({ createdAt: -1 }).select('job matchScore').lean()
    const scores = new Map()
    for (const analysis of analyses) if (!scores.has(String(analysis.job))) scores.set(String(analysis.job), analysis.matchScore)
    return res.json({ jobs: active.map((record) => ({ ...record.job, saved: true, savedAt: record.savedAt, matchScore: scores.get(String(record.job._id)) })) })
}

async function analyze(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid job ID.' })
    const job = await Job.findById(req.params.id).lean(); if (!job) return res.status(404).json({ message: 'Job not found.' })
    const result = await jobsService.analyzeJob(job, req.user.id)
    if (result.missingProfile) return res.status(422).json({ code: 'PROFILE_REQUIRED', message: 'Create an interview plan with your resume or profile information first.' })
    return res.json(result)
}

async function prepare(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid job ID.' })
    const job = await Job.findById(req.params.id).lean(); if (!job) return res.status(404).json({ message: 'Job not found.' })
    const result = await jobsService.prepareInterview(job, req.user.id)
    if (result.missingProfile) return res.status(422).json({ code: 'PROFILE_REQUIRED', message: 'Create an interview plan with your resume or profile information first.' })
    return res.status(201).json({ interviewReport: result.report })
}

async function recommended(req, res) {
    const candidate = await jobsService.latestCandidate(req.user.id)
    if (!candidate) return res.json({ jobs: [], missingProfile: true })
    const result = await jobsService.searchJobs({ q: candidate.title || '', location: '', country: 'IN', page: 1, limit: 3, sort: 'relevance' })
    return res.json({ jobs: result.jobs })
}

module.exports = { list, details, save, unsave, saved, analyze, prepare, recommended }
