const Job = require('../../models/job.model')

async function upsertJobs(jobs) {
    if (!jobs.length) return []
    const now = new Date()
    await Job.bulkWrite(jobs.map((job) => ({ updateOne: {
        filter: { source: job.source, sourceJobId: job.sourceJobId },
        update: { $set: { ...job, lastSeenAt: now, isActive: true }, $setOnInsert: { firstSeenAt: now } },
        upsert: true
    } })), { ordered: false })
    return Job.find({ $or: jobs.map(({ source, sourceJobId }) => ({ source, sourceJobId })) }).lean()
}

async function findJobs(params) {
    const query = { isActive: true }
    if (params.q) query.$text = { $search: params.q }
    if (params.location && !/^india$/i.test(params.location)) query.locations = { $regex: params.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
    if (params.country) query.countries = params.country.toUpperCase()
    if (params.remote) query.remoteType = params.remote
    if (params.experience) query.seniority = { $regex: params.experience, $options: 'i' }
    if (params.employmentType) query.employmentType = { $regex: params.employmentType, $options: 'i' }
    if (params.salaryMin) query.salaryMax = { $gte: params.salaryMin }
    if (params.salaryMax) query.salaryMin = { $lte: params.salaryMax }
    if (params.postedAfter) query.postedAt = { $gte: params.postedAfter }
    const sort = params.sort === 'salary-desc' ? { salaryMax: -1 } : params.sort === 'salary-asc' ? { salaryMin: 1 } : params.sort === 'relevance' && params.q ? { score: { $meta: 'textScore' } } : { postedAt: -1, lastSeenAt: -1 }
    const skip = (params.page - 1) * params.limit
    const [ jobs, total ] = await Promise.all([ Job.find(query).sort(sort).skip(skip).limit(params.limit).lean(), Job.countDocuments(query) ])
    return { jobs, total }
}

module.exports = { upsertJobs, findJobs }
