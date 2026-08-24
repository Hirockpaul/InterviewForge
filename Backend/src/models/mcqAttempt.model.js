const mongoose = require('mongoose')
const mcqAttemptSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true }, session: { type: mongoose.Schema.Types.ObjectId, ref: 'McqSession', required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'McqQuestion', required: true }, selectedOption: Number, correct: Boolean, timeTaken: Number, attemptedAt: { type: Date, default: Date.now }
}, { timestamps: true })
mcqAttemptSchema.index({ user: 1, question: 1, attemptedAt: -1 })
mcqAttemptSchema.index({ user: 1, session: 1 })
module.exports = mongoose.model('McqAttempt', mcqAttemptSchema)
