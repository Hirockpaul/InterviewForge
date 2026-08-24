const mongoose = require('mongoose')
const { CODING_TOPIC_IDS } = require('../config/codingTopics')
const { CODING_LANGUAGES } = require('../config/codingLanguages')

const exampleSchema = new mongoose.Schema({
    input: { type: String, required: true, trim: true },
    output: { type: String, required: true, trim: true },
    explanation: { type: String, trim: true, default: '' }
}, { _id: false })

const codingProblemSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 160 },
    normalizedTitle: { type: String, required: true, trim: true, lowercase: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    shortDescription: { type: String, required: true, trim: true, maxlength: 320 },
    description: { type: String, required: true, trim: true, maxlength: 10_000 },
    difficulty: { type: String, required: true, enum: [ 'easy', 'medium', 'hard' ] },
    topic: { type: String, required: true, enum: CODING_TOPIC_IDS },
    category: { type: String, default: 'programming', enum: [ 'programming' ] },
    constraints: { type: [ String ], required: true, validate: [(items) => items.length > 0, 'At least one constraint is required.'] },
    examples: { type: [ exampleSchema ], required: true, validate: [(items) => items.length >= 2, 'At least two examples are required.'] },
    starterCode: { type: Map, of: String, required: true },
    supportedLanguages: { type: [ String ], required: true, enum: Object.keys(CODING_LANGUAGES) },
    hints: { type: [ String ], required: true, validate: [(items) => items.length > 0, 'At least one hint is required.'] },
    explanation: { type: String, required: true, trim: true },
    timeComplexity: { type: String, required: true, trim: true },
    spaceComplexity: { type: String, required: true, trim: true },
    source: { type: String, enum: [ 'ai', 'seed' ], default: 'ai' }
}, { timestamps: true })

codingProblemSchema.index({ topic: 1, difficulty: 1, createdAt: -1 })
codingProblemSchema.index({ topic: 1, difficulty: 1, normalizedTitle: 1 }, { unique: true })
codingProblemSchema.index({ title: 'text', shortDescription: 'text', description: 'text' })

module.exports = mongoose.model('CodingProblem', codingProblemSchema)
