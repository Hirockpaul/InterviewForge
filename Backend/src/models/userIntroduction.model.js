const mongoose = require('mongoose')

const userIntroductionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    interviewPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewReport', required: true },
    targetRole: { type: String, required: true, trim: true },
    duration: { type: Number, enum: [ 30, 60, 120 ], required: true },
    tone: { type: String, enum: [ 'professional', 'confident', 'natural' ], required: true },
    content: { type: String, required: true },
    whyItWorks: { type: [ String ], default: [] },
    keyPoints: { type: [ String ], default: [] }
}, { timestamps: true })

userIntroductionSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('UserIntroduction', userIntroductionSchema)
