const mongoose = require('mongoose')

const mcqAnswerSchema = new mongoose.Schema({
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'McqQuestion', required: true }, selectedOption: { type: Number, min: 0, max: 3, default: null },
    correct: { type: Boolean, required: true }, startedAt: Date, submittedAt: Date, timeTaken: Number, submittedAutomatically: { type: Boolean, default: false }
}, { _id: false })

const mcqSessionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true }, canonicalTopic: { type: String, required: true }, displayTopic: { type: String, required: true },
    category: { type: String, required: true }, difficulty: { type: String, enum: [ 'easy', 'medium', 'hard', 'mixed' ], required: true },
    questionCount: { type: Number, enum: [ 10, 20, 30 ], required: true }, questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'McqQuestion' }],
    answers: { type: [ mcqAnswerSchema ], default: [] }, currentQuestionIndex: { type: Number, default: 0 }, currentQuestionStartedAt: Date,
    timerEnabled: { type: Boolean, default: true }, status: { type: String, enum: [ 'in-progress', 'completed', 'abandoned' ], default: 'in-progress' },
    correctCount: { type: Number, default: 0 }, score: { type: Number, default: 0 }, startedAt: Date, completedAt: Date,
    result: { difficultyPerformance: { easy: Number, medium: Number, hard: Number }, topicAccuracy: mongoose.Schema.Types.Mixed, subtopicAccuracy: mongoose.Schema.Types.Mixed, weakAreas: [ String ], strongAreas: [ String ] }
}, { timestamps: true })

mcqSessionSchema.index({ user: 1, createdAt: -1 })
mcqSessionSchema.index({ user: 1, status: 1 })
module.exports = mongoose.model('McqSession', mcqSessionSchema)
