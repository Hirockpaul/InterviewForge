const mongoose = require('mongoose')

const savedQuestionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    sourceId: { type: String, default: '' },
    source: { type: String, enum: [ 'technical', 'behavioral', 'mock', 'project', 'timed', 'other' ], required: true },
    category: { type: String, enum: [ 'technical', 'behavioral', 'system-design', 'project', 'hr' ], required: true },
    topic: { type: String, default: 'General' },
    difficulty: { type: String, enum: [ 'beginner', 'intermediate', 'advanced', 'deep-dive' ], default: 'intermediate' },
    questionText: { type: String, required: true, trim: true },
    normalizedText: { type: String, required: true },
    personalAnswer: { type: String, default: '' },
    evaluationSnapshot: {
        score: Number,
        strengths: { type: [ String ], default: [] },
        weaknesses: { type: [ String ], default: [] },
        feedback: { type: String, default: '' },
        recommendedImprovement: { type: String, default: '' }
    }
}, { timestamps: true })

savedQuestionSchema.index({ user: 1, normalizedText: 1 }, { unique: true })
savedQuestionSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('SavedQuestion', savedQuestionSchema)
