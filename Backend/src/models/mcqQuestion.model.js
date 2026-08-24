const mongoose = require('mongoose')

const mcqQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true, trim: true }, normalizedQuestion: { type: String, required: true },
    options: { type: [ String ], validate: [(items) => items.length === 4 && new Set(items.map((item) => item.toLowerCase().trim())).size === 4, 'Exactly four unique options are required.'] },
    correctOption: { type: Number, min: 0, max: 3, required: true }, explanation: { type: String, required: true },
    topic: { type: String, required: true }, canonicalTopic: { type: String, required: true, lowercase: true }, aliases: [ String ],
    subtopic: { type: String, required: true, lowercase: true },
    category: { type: String, required: true, lowercase: true }, difficulty: { type: String, enum: [ 'easy', 'medium', 'hard' ], required: true }, tags: [ String ],
    source: { type: String, required: true, trim: true },
    sourceReference: String, license: String, visibility: { type: String, enum: [ 'global', 'user' ], default: 'global' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', default: null }, qualityStatus: { type: String, enum: [ 'approved', 'rejected', 'pending' ], default: 'approved' },
    usageCount: { type: Number, min: 0, default: 0 }
}, { timestamps: true })

mcqQuestionSchema.index({ canonicalTopic: 1, difficulty: 1, qualityStatus: 1 })
mcqQuestionSchema.index({ category: 1, canonicalTopic: 1, difficulty: 1, visibility: 1 })
mcqQuestionSchema.index({ normalizedQuestion: 1, visibility: 1, owner: 1 }, { unique: true })
mcqQuestionSchema.pre('validate', function validateVisibility() { if (this.visibility === 'user' && !this.owner) this.invalidate('owner', 'Private MCQs require an owner.'); if (this.visibility === 'global') this.owner = null })

module.exports = mongoose.model('McqQuestion', mcqQuestionSchema)
