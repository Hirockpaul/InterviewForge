const mongoose = require('mongoose')

const preparationActivitySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    type: { type: String, enum: [ 'mock-interview', 'timed-answer', 'saved-question', 'project-question', 'introduction', 'focused-practice', 'mcq-practice' ], required: true },
    sourceId: { type: String, required: true },
    occurredAt: { type: Date, default: Date.now, required: true }
}, { timestamps: true })

preparationActivitySchema.index({ user: 1, type: 1, sourceId: 1 }, { unique: true })
preparationActivitySchema.index({ user: 1, occurredAt: -1 })

module.exports = mongoose.model('PreparationActivity', preparationActivitySchema)
