const codingProblemModel = require('../models/codingProblem.model')
const { CODING_TOPICS } = require('../config/codingTopics')
const codingAiService = require('./codingAi.services')

const TARGET_PROBLEMS = 10
const generationLocks = new Map()

function normalizeTitle(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function slugify(value) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'coding-problem'
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function uniqueSlug(title) {
    const base = slugify(title)
    let slug = base
    let suffix = 2
    while (await codingProblemModel.exists({ slug })) {
        slug = `${base}-${suffix}`
        suffix += 1
    }
    return slug
}

async function listTopics() {
    const counts = await codingProblemModel.aggregate([
        { $group: { _id: { topic: '$topic', difficulty: '$difficulty' }, count: { $sum: 1 } } }
    ])
    const byTopic = new Map()
    for (const row of counts) {
        if (!byTopic.has(row._id.topic)) byTopic.set(row._id.topic, { easy: 0, medium: 0, hard: 0, total: 0 })
        const current = byTopic.get(row._id.topic)
        current[row._id.difficulty] = row.count
        current.total += row.count
    }
    return CODING_TOPICS.map((topic) => ({ ...topic, counts: byTopic.get(topic.id) || { easy: 0, medium: 0, hard: 0, total: 0 } }))
}

async function listProblems({ topic, difficulty, search, page = 1, limit = 24 }) {
    const query = {}
    if (topic) query.topic = topic
    if (difficulty) query.difficulty = difficulty
    if (search) {
        const expression = new RegExp(escapeRegex(search), 'i')
        query.$or = [ { title: expression }, { shortDescription: expression }, { description: expression }, { topic: expression } ]
    }
    const skip = (page - 1) * limit
    const [ problems, total ] = await Promise.all([
        codingProblemModel.find(query).select('-explanation -hints -starterCode -constraints -examples').sort({ difficulty: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        codingProblemModel.countDocuments(query)
    ])
    return { problems, total, page, pages: Math.max(1, Math.ceil(total / limit)) }
}

async function generateMissing({ topic, difficulty }) {
    const key = `${topic}:${difficulty}`
    if (generationLocks.has(key)) return generationLocks.get(key)

    const task = (async () => {
        const topicConfig = CODING_TOPICS.find((item) => item.id === topic)
        const existing = await codingProblemModel.find({ topic, difficulty }).select('title normalizedTitle').lean()
        const missing = Math.max(0, TARGET_PROBLEMS - existing.length)
        if (!missing) return { generated: 0, problems: existing, reused: true }

        const generated = await codingAiService.generateCodingProblems({
            topic,
            displayTopic: topicConfig.displayName,
            difficulty,
            count: missing,
            existingTitles: existing.map((item) => item.title)
        })
        const seen = new Set(existing.map((item) => item.normalizedTitle))
        const accepted = []

        for (const problem of generated) {
            const normalizedTitle = normalizeTitle(problem.title)
            if (problem.topic !== topic || problem.difficulty !== difficulty || seen.has(normalizedTitle)) continue
            seen.add(normalizedTitle)
            accepted.push({
                ...problem,
                normalizedTitle,
                slug: await uniqueSlug(problem.title),
                category: 'programming',
                source: 'ai'
            })
        }

        if (accepted.length) {
            try {
                await codingProblemModel.insertMany(accepted, { ordered: false })
            } catch (error) {
                if (error.code !== 11000 && !error.writeErrors?.every((item) => item.code === 11000)) throw error
            }
        }

        const problems = await codingProblemModel.find({ topic, difficulty }).sort({ createdAt: -1 }).lean()
        return { generated: Math.max(0, problems.length - existing.length), problems, reused: false }
    })().finally(() => generationLocks.delete(key))

    generationLocks.set(key, task)
    return task
}

module.exports = { listTopics, listProblems, generateMissing, normalizeTitle, slugify, TARGET_PROBLEMS }
