const mongoose = require('mongoose')

function questionSchema(requiredMessage) {
    return new mongoose.Schema({
        question: { type: String, required: [true, requiredMessage] },
        intention: { type: String, required: [true, 'Intention is required'] },
        answer: { type: String, required: [true, 'Answer is required'] }
    }, { _id: false })
}

const technicalQuestionSchema = questionSchema('technical question is required')
const behavioralQuestionSchema = questionSchema('behavioral question is required')

const skillGapSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: [true, 'Skill is required']
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: [true, 'Severity is required']
    }
}, {
    _id: false
})

const preparationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [true, 'Day is required']
    },
    focus: {
        type: String,
        required: [true, 'Focus is required']
    },
    tasks: [{
        type: String,
        required: [true, 'Task is required']
    }]
}, {
    _id: false
})

const interviewReportSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: [true, 'User is required']
    },
    targetJob: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    jobDescription: {
        type: String,
        required: [true, 'Job description is required']
    },
    resume: String,
    selfDescription: String,
    matchScore: {
        type: Number,
        min: 0,
        max: 100
    },
    technicalQuestions: [technicalQuestionSchema],
    behavioralQuestions: [behavioralQuestionSchema],
    skillGaps: [skillGapSchema],
    preparationPlan: [preparationPlanSchema],
    title: {
        type: String,
        required: [true, 'Job title is required']
    }
}, {
    timestamps: true
})

interviewReportSchema.index({ user: 1, createdAt: -1 })

module.exports = mongoose.model('InterviewReport', interviewReportSchema)
