const mongoose = require('mongoose')

const interviewQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true, trim: true },
    normalizedQuestion: { type: String, required: true },
    canonicalTopic: { type: String, required: true, lowercase: true },
    aliases: { type: [ String ], default: [] },
    subtopics: { type: [ String ], default: [] },
    category: { type: String, enum: [ 'technical', 'behavioral', 'project', 'system-design', 'role-specific' ], required: true },
    difficulty: { type: String, enum: [ 'easy', 'medium', 'hard' ], required: true },
    skills: { type: [ String ], default: [] },
    intent: { type: String, required: true },
    expectedPoints: { type: [ String ], required: true },
    source: { type: String, enum: [ 'ai-generated', 'existing-plan' ], default: 'ai-generated' },
    visibility: { type: String, enum: [ 'global', 'user' ], required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', default: null },
    sourceKey: { type: String, default: '' },
    qualityStatus: { type: String, enum: [ 'approved', 'rejected' ], default: 'approved' },
    usageCount: { type: Number, min: 0, default: 0 }
}, { timestamps: true })

interviewQuestionSchema.index({ canonicalTopic: 1, difficulty: 1, category: 1, visibility: 1, qualityStatus: 1 })
interviewQuestionSchema.index({ owner: 1, sourceKey: 1, difficulty: 1 })
interviewQuestionSchema.index({ visibility: 1, normalizedQuestion: 1, owner: 1 }, { unique: true })

interviewQuestionSchema.pre('validate', function validateVisibility() {
    if (this.visibility === 'user' && !this.owner) this.invalidate('owner', 'Private questions require an owner.')
    if (this.visibility === 'global') { this.owner = null; this.sourceKey = '' }
})

module.exports = mongoose.model('InterviewQuestion', interviewQuestionSchema)
