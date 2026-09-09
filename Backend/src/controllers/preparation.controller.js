const mongoose = require('mongoose')
const { z } = require('zod')
const savedQuestionModel = require('../models/savedQuestion.model')
const introductionModel = require('../models/userIntroduction.model')
const projectQuestionSetModel = require('../models/projectQuestionSet.model')
const interviewReportModel = require('../models/interviewReport.model')
const preparationActivityModel = require('../models/preparationActivity.model')
const userModel = require('../models/user.model')
const { generateIntroduction, detectProjects, generateProjectQuestions } = require('../services/preparationAi.services')
const { recordActivity, calculateStreak } = require('../services/activity.services')

const questionSchema = z.object({
    questionText: z.string().trim().min(10).max(2000),
    sourceId: z.string().max(200).optional().default(''),
    source: z.enum(['technical', 'behavioral', 'mock', 'project', 'timed', 'other']),
    category: z.enum(['technical', 'behavioral', 'system-design', 'project', 'hr']),
    topic: z.string().trim().min(1).max(100).default('General'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'deep-dive']).default('intermediate'),
    personalAnswer: z.string().trim().max(12000).optional().default(''),
    evaluationSnapshot: z.object({
        score: z.number().min(0).max(100).optional(),
        strengths: z.array(z.string()).max(6).optional().default([]),
        weaknesses: z.array(z.string()).max(6).optional().default([]),
        feedback: z.string().max(4000).optional().default(''),
        recommendedImprovement: z.string().max(2000).optional().default('')
    }).optional()
})
const introductionGenerateSchema = z.object({
    interviewPlanId: z.string(),
    targetRole: z.string().trim().min(2).max(120),
    duration: z.union([z.literal(30), z.literal(60), z.literal(120)]),
    tone: z.enum(['professional', 'confident', 'natural'])
})
const introductionUpdateSchema = z.object({
    content: z.string().trim().min(20).max(12000)
})
const projectQuestionsSchema = z.object({
    interviewPlanId: z.string(),
    projectName: z.string().trim().min(1).max(200),
    projectContext: z.string().trim().min(10).max(5000)
})

const parse = (schema, body, res) => {
    const result = schema.safeParse(body)
    if (!result.success) {
        res.status(400).json({ message: result.error.issues[0].message })
    }
    return result.success ? result.data : null
}
const validId = (id) => mongoose.isValidObjectId(id)
const normalize = (text) => text.toLowerCase().replace(/\s+/g, ' ').trim()

async function listQuestions(req, res) {
    const query = { user: req.user.id }
    if (req.query.category && req.query.category !== 'all') {
        query.category = req.query.category
    }
    if (req.query.search) {
        query.questionText = {
            $regex: String(req.query.search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            $options: 'i'
        }
    }

    const sortOptions = {
        oldest: { createdAt: 1 },
        question: { questionText: 1 }
    }
    const sort = sortOptions[req.query.sort] || { createdAt: -1 }
    return res.json({ questions: await savedQuestionModel.find(query).sort(sort) })
}

async function saveQuestion(req, res) {
    const data = parse(questionSchema, req.body, res)
    if (!data) {
        return
    }

    const normalizedText = normalize(data.questionText)
    try {
        const question = await savedQuestionModel.create({
            user: req.user.id,
            ...data,
            normalizedText
        })
        return res.status(201).json({ question, message: 'Question saved.' })
    } catch (error) {
        if (error.code === 11000) {
            const question = await savedQuestionModel.findOneAndUpdate(
                { user: req.user.id, normalizedText },
                data.personalAnswer ? { $set: { personalAnswer: data.personalAnswer, evaluationSnapshot: data.evaluationSnapshot } } : {},
                { new: true }
            )
            return res.status(200).json({ question, message: 'This question was already saved.' })
        }
        throw error
    }
}

async function removeQuestion(req, res) {
    if (!validId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid question ID.' })
    }
    const removed = await savedQuestionModel.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!removed) {
        return res.status(404).json({ message: 'Saved question not found.' })
    }
    return res.json({ message: 'Question removed.' })
}

async function listIntroductions(req, res) {
    return res.json({ introductions: await introductionModel.find({ user: req.user.id }).sort({ updatedAt: -1 }) })
}

async function createIntroduction(req, res) {
    const data = parse(introductionGenerateSchema, req.body, res)
    if (!data) {
        return
    }
    if (!validId(data.interviewPlanId)) {
        return res.status(400).json({ message: 'Invalid interview plan ID.' })
    }
    const plan = await interviewReportModel.findOne({ _id: data.interviewPlanId, user: req.user.id })
    if (!plan) {
        return res.status(404).json({ message: 'Interview plan not found.' })
    }
    if (!(plan.resume || plan.selfDescription).trim()) {
        return res.status(422).json({ message: 'Add resume or profile information before generating an introduction.' })
    }
    const user = await userModel.findById(req.user.id).select('username').lean()
    const generated = await generateIntroduction(plan, { ...data, candidateName: user?.username || '' })
    const introduction = await introductionModel.create({ user: req.user.id, interviewPlan: plan._id, ...data, ...generated })
    return res.status(201).json({ introduction })
}

async function updateIntroduction(req, res) {
    if (!validId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid introduction ID.' })
    }
    const data = parse(introductionUpdateSchema, req.body, res)
    if (!data) {
        return
    }
    const introduction = await introductionModel.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, data, { new: true, runValidators: true })
    if (!introduction) {
        return res.status(404).json({ message: 'Introduction not found.' })
    }
    return res.json({ introduction })
}

async function deleteIntroduction(req, res) {
    if (!validId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid introduction ID.' })
    }
    const introduction = await introductionModel.findOneAndDelete({ _id: req.params.id, user: req.user.id })
    if (!introduction) {
        return res.status(404).json({ message: 'Introduction not found.' })
    }
    return res.json({ message: 'Introduction deleted.' })
}

async function practiceIntroduction(req, res) {
    if (!validId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid introduction ID.' })
    }
    const introduction = await introductionModel.findOne({ _id: req.params.id, user: req.user.id })
    if (!introduction) {
        return res.status(404).json({ message: 'Introduction not found.' })
    }
    await recordActivity({ user: req.user.id, type: 'introduction', sourceId: `${introduction._id}:${new Date().toISOString().slice(0, 10)}` })
    return res.json({ message: 'Introduction practice recorded.' })
}

async function listProjects(req, res) {
    if (!validId(req.query.interviewPlanId)) {
        return res.status(400).json({ message: 'A valid interview plan ID is required.' })
    }
    const plan = await interviewReportModel.findOne({ _id: req.query.interviewPlanId, user: req.user.id })
    if (!plan) {
        return res.status(404).json({ message: 'Interview plan not found.' })
    }
    const result = await detectProjects(plan)
    return res.json(result)
}

async function generateQuestions(req, res) {
    const data = parse(projectQuestionsSchema, req.body, res)
    if (!data) {
        return
    }
    if (!validId(data.interviewPlanId)) {
        return res.status(400).json({ message: 'Invalid interview plan ID.' })
    }
    const plan = await interviewReportModel.findOne({ _id: data.interviewPlanId, user: req.user.id })
    if (!plan) {
        return res.status(404).json({ message: 'Interview plan not found.' })
    }
    const projects = await detectProjects(plan)
    const verified = projects.projects.find((project) => normalize(project.name) === normalize(data.projectName))
    if (!verified) {
        return res.status(422).json({ message: 'That project was not found in your candidate information.' })
    }
    const generated = await generateProjectQuestions(plan, verified)
    const projectKey = normalize(verified.name)
    const questionSet = await projectQuestionSetModel.findOneAndUpdate(
        { user: req.user.id, interviewPlan: plan._id, projectKey },
        { projectName: verified.name, projectContext: verified.context, questions: generated.questions },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    )
    return res.json({ questionSet })
}

async function getStreak(req, res) {
    const timeZone = String(req.query.timeZone || 'UTC')
    try {
        new Intl.DateTimeFormat('en', { timeZone })
    } catch {
        return res.status(400).json({ message: 'Invalid timezone.' })
    }
    const activities = await preparationActivityModel.find({ user: req.user.id }).select('occurredAt').lean()
    return res.json({ streak: calculateStreak(activities, timeZone) })
}

module.exports = {
    listQuestions,
    saveQuestion,
    removeQuestion,
    listIntroductions,
    createIntroduction,
    updateIntroduction,
    deleteIntroduction,
    practiceIntroduction,
    listProjects,
    generateQuestions,
    getStreak
}
