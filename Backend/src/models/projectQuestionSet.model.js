const mongoose = require('mongoose')

const projectQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    difficulty: { type: String, enum: [ 'beginner', 'intermediate', 'advanced', 'deep-dive' ], required: true },
    topic: { type: String, required: true }
}, { _id: true })

const projectQuestionSetSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    interviewPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewReport', required: true },
    projectKey: { type: String, required: true },
    projectName: { type: String, required: true },
    projectContext: { type: String, required: true },
    questions: { type: [ projectQuestionSchema ], default: [] }
}, { timestamps: true })

projectQuestionSetSchema.index({ user: 1, interviewPlan: 1, projectKey: 1 }, { unique: true })

module.exports = mongoose.model('ProjectQuestionSet', projectQuestionSetSchema)
