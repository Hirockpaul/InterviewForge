const mcqQuestionModel = require('../models/mcqQuestion.model')
const { distribution, selectMcqs } = require('./mcqCore.services')
const { generateMcqBatch } = require('./mcqFactory.services')

const MINIMUM_PER_DIFFICULTY = 50
const MAX_BATCH_SIZE = 20
const FAILURE_COOLDOWN_MS = 60 * 1000

class QuestionPoolService {
    constructor({ generator = generateMcqBatch } = {}) { this.generator = generator; this.jobs = new Map() }
    key(topic, category) { return `${topic}:${category}` }
    async counts(canonicalTopic, category) {
        const rows = await mcqQuestionModel.aggregate([ { $match: { canonicalTopic, category, visibility: 'global', qualityStatus: 'approved' } }, { $group: { _id: '$difficulty', count: { $sum: 1 } } } ])
        return Object.assign({ easy: 0, medium: 0, hard: 0 }, Object.fromEntries(rows.map((row) => [ row._id, row.count ])))
    }
    status(canonicalTopic, category) { const job = this.jobs.get(this.key(canonicalTopic, category)); return job ? { state: job.state, error: job.error || null } : { state: 'idle', error: null } }
    needs(counts, requested = { easy: MINIMUM_PER_DIFFICULTY, medium: MINIMUM_PER_DIFFICULTY, hard: MINIMUM_PER_DIFFICULTY }) { return Object.fromEntries([ 'easy','medium','hard' ].map((level) => [ level, Math.max(0, requested[level] - counts[level]) ])) }
    schedule({ canonicalTopic, displayTopic, category }) {
        const key = this.key(canonicalTopic, category), existing = this.jobs.get(key)
        if (existing?.state === 'running' || (existing?.state === 'failed' && Date.now() - existing.finishedAt < FAILURE_COOLDOWN_MS)) return false
        this.jobs.set(key, { state: 'running', startedAt: Date.now() })
        setImmediate(() => this.replenish({ canonicalTopic, displayTopic, category }).then(() => this.jobs.set(key, { state: 'ready', finishedAt: Date.now() })).catch((error) => { console.error(`MCQ factory failed for ${key}:`, error.message); this.jobs.set(key, { state: 'failed', error: 'Question generation is temporarily unavailable.', finishedAt: Date.now() }) }))
        return true
    }
    async replenish({ canonicalTopic, displayTopic, category }) {
        let counts = await this.counts(canonicalTopic, category)
        const existingDocs = await mcqQuestionModel.find({ canonicalTopic, category, visibility: 'global' }).select('normalizedQuestion').lean()
        const seen = new Set(existingDocs.map((item) => item.normalizedQuestion))
        for (const difficulty of [ 'easy','medium','hard' ]) {
            let missing = Math.max(0, MINIMUM_PER_DIFFICULTY - counts[difficulty]), attempts = 0
            while (missing > 0 && attempts < 5) {
                attempts += 1
                const generated = await this.generator({ canonicalTopic, displayTopic, category, difficulty, count: Math.min(MAX_BATCH_SIZE, Math.max(missing, 5)), existing: [ ...seen ] })
                const unique = generated.filter((item) => { if (seen.has(item.normalizedQuestion)) return false; seen.add(item.normalizedQuestion); return true })
                if (unique.length) { try { await mcqQuestionModel.insertMany(unique, { ordered: false }) } catch (error) { if (!error.writeErrors?.every((item) => item.code === 11000)) console.warn('MCQ batch partially rejected:', error.message) } }
                counts = await this.counts(canonicalTopic, category); missing = Math.max(0, MINIMUM_PER_DIFFICULTY - counts[difficulty])
                if (!unique.length) break
            }
        }
        return counts
    }
    async getForSession({ canonicalTopic, category, difficulty, count, attemptedIds }) {
        const requested = distribution(count, difficulty)
        const questions = await mcqQuestionModel.find({ canonicalTopic, category, visibility: 'global', qualityStatus: 'approved', difficulty: { $in: Object.entries(requested).filter(([, value ]) => value).map(([ key ]) => key) } }).lean()
        const selected = selectMcqs(questions, requested, attemptedIds)
        return { selected, requested, sufficient: selected.length === count, counts: Object.fromEntries([ 'easy','medium','hard' ].map((level) => [ level, questions.filter((item) => item.difficulty === level).length ])) }
    }
}

module.exports = { QuestionPoolService, mcqPool: new QuestionPoolService(), MINIMUM_PER_DIFFICULTY }
