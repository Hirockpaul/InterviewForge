const mongoose = require('mongoose')

const evaluationSchema = new mongoose.Schema({
    score: { type: Number, min: 0, max: 100 },
    technicalAccuracy: { type: Number, min: 0, max: 100 },
    communication: { type: Number, min: 0, max: 100 },
    clarity: { type: Number, min: 0, max: 100 },
    depth: { type: Number, min: 0, max: 100 },
    relevance: { type: Number, min: 0, max: 100 },
    star: {
        situation: { type: Number, min: 0, max: 100 },
        task: { type: Number, min: 0, max: 100 },
        action: { type: Number, min: 0, max: 100 },
        result: { type: Number, min: 0, max: 100 }
    },
    strengths: [ String ],
    improvements: [ String ],
    feedback: String
}, { _id: false })

const mockQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    questionType: { type: String, enum: [ 'technical', 'behavioral', 'system-design', 'role-specific' ], default: 'technical' },
    topic: { type: String, default: 'General' },
    difficulty: { type: String, enum: [ 'easy', 'medium', 'hard' ], default: 'medium' },
    answer: { type: String, default: '' },
    evaluation: evaluationSchema
}, { _id: false })

const mockInterviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    interviewPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewReport', required: true },
    focus: {
        projectName: { type: String, default: '' },
        projectContext: { type: String, default: '' }
    },
    status: { type: String, enum: [ 'active', 'completed' ], default: 'active' },
    questions: { type: [ mockQuestionSchema ], default: [] },
    overallScore: { type: Number, min: 0, max: 100, default: 0 }
}, { timestamps: true })

mockInterviewSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('MockInterview', mockInterviewSchema)
