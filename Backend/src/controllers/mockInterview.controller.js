const mongoose = require('mongoose')
const interviewReportModel = require('../models/interviewReport.model')
const mockInterviewModel = require('../models/mockInterview.model')
const { generateOpeningQuestion, evaluateAnswer } = require('../services/mockInterview.services')
const { recordActivity } = require('../services/activity.services')

const MAX_QUESTIONS = 5

async function listMockInterviewsController(req, res) {
    try {
        const mockInterviews = await mockInterviewModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .populate('interviewPlan', 'title')
            .select('-questions.answer')

        return res.status(200).json({ mockInterviews })
    } catch (error) {
        console.error('Failed to list mock interviews:', error.message)
        return res.status(500).json({ message: 'Unable to load mock interview history.' })
    }
}

async function startMockInterviewController(req, res) {
    try {
        const { interviewPlanId, focus } = req.body
        if (!mongoose.isValidObjectId(interviewPlanId)) {
            return res.status(400).json({ message: 'A valid interview plan ID is required.' })
        }

        const interviewPlan = await interviewReportModel.findOne({ _id: interviewPlanId, user: req.user.id })
        if (!interviewPlan) {
            return res.status(404).json({ message: 'Interview plan not found.' })
        }

        const safeFocus = focus && typeof focus.projectName === 'string' && typeof focus.projectContext === 'string'
            ? { projectName: focus.projectName.trim().slice(0, 200), projectContext: focus.projectContext.trim().slice(0, 5000) }
            : null
        const question = await generateOpeningQuestion(interviewPlan, safeFocus)
        const mockInterview = await mockInterviewModel.create({
            user: req.user.id,
            interviewPlan: interviewPlan._id,
            focus: safeFocus || undefined,
            questions: [ question ]
        })

        return res.status(201).json({ mockInterview })
    } catch (error) {
        console.error('Failed to start mock interview:', error.message)
        return res.status(500).json({ message: 'Unable to start the mock interview. Please try again.' })
    }
}

async function getMockInterviewController(req, res) {
    if (!mongoose.isValidObjectId(req.params.mockInterviewId)) {
        return res.status(400).json({ message: 'Invalid mock interview ID.' })
    }

    const mockInterview = await mockInterviewModel.findOne({ _id: req.params.mockInterviewId, user: req.user.id }).populate('interviewPlan', 'title')
    if (!mockInterview) return res.status(404).json({ message: 'Mock interview not found.' })
    return res.status(200).json({ mockInterview })
}

async function answerMockInterviewController(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.mockInterviewId)) {
            return res.status(400).json({ message: 'Invalid mock interview ID.' })
        }

        const { answer } = req.body
        if (!answer || answer.trim().length < 10) {
            return res.status(400).json({ message: 'Please provide a more complete answer.' })
        }

        const mockInterview = await mockInterviewModel.findOne({ _id: req.params.mockInterviewId, user: req.user.id })
        if (!mockInterview) return res.status(404).json({ message: 'Mock interview not found.' })
        if (mockInterview.status !== 'active') return res.status(409).json({ message: 'This mock interview is already complete.' })

        const currentQuestion = mockInterview.questions.at(-1)
        if (currentQuestion.answer) return res.status(409).json({ message: 'This question has already been answered.' })

        const interviewPlan = await interviewReportModel.findOne({ _id: mockInterview.interviewPlan, user: req.user.id })
        const result = await evaluateAnswer({ interviewPlan, questions: mockInterview.questions, answer: answer.trim() })
        currentQuestion.answer = answer.trim()
        currentQuestion.evaluation = result.evaluation

        if (mockInterview.questions.length >= MAX_QUESTIONS) {
            mockInterview.status = 'completed'
            const total = mockInterview.questions.reduce((sum, item) => sum + (item.evaluation?.score || 0), 0)
            mockInterview.overallScore = Math.round(total / mockInterview.questions.length)
        } else {
            mockInterview.questions.push(result.nextQuestion)
        }

        await mockInterview.save()
        if (mockInterview.status === 'completed') {
            await recordActivity({ user: req.user.id, type: 'mock-interview', sourceId: mockInterview._id })
        }
        await mockInterview.populate('interviewPlan', 'title')
        return res.status(200).json({ mockInterview })
    } catch (error) {
        console.error('Failed to evaluate mock answer:', error.message)
        return res.status(500).json({ message: 'Unable to evaluate your answer. Please try again.' })
    }
}

module.exports = { listMockInterviewsController, startMockInterviewController, getMockInterviewController, answerMockInterviewController }
