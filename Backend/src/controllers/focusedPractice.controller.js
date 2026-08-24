const mongoose = require('mongoose')
const pdfParse = require('pdf-parse')
const { z } = require('zod')
const interviewQuestionModel = require('../models/interviewQuestion.model')
const focusedSessionModel = require('../models/focusedPracticeSession.model')
const questionAttemptModel = require('../models/questionAttempt.model')
const interviewReportModel = require('../models/interviewReport.model')
const { generateMissingQuestions, evaluateBatch } = require('../services/focusedPracticeAi.services')
const { resolveTopic, sourceKey, missingByDifficulty, selectQuestions, timeLimitFor, buildReport } = require('../services/focusedPractice.services')
const { recordActivity } = require('../services/activity.services')

const createSchema = z.object({
    sourceType: z.enum([ 'resume', 'project', 'job-description', 'topic', 'interview-plan' ]),
    sourceText: z.string().trim().max(30000).optional().default(''),
    interviewPlanId: z.string().optional(),
    mode: z.enum([ 'technical', 'behavioral', 'project', 'mixed' ])
})
const answerSchema = z.object({ questionId: z.string(), answer: z.string().trim().max(12000).default(''), submittedAutomatically: z.boolean().default(false) })
const categoryForMode = { technical: [ 'technical', 'system-design', 'role-specific' ], behavioral: [ 'behavioral' ], project: [ 'project' ], mixed: [ 'technical', 'behavioral', 'project', 'system-design', 'role-specific' ] }

function publicSession(session) {
    const question = session.questions?.[session.currentQuestionIndex]
    const questionTimeLimit = question ? timeLimitFor(question.difficulty) : null
    const elapsed = session.currentQuestionStartedAt ? Math.max(0, Math.floor((Date.now() - new Date(session.currentQuestionStartedAt).getTime()) / 1000)) : 0
    return {
        _id: session._id, sourceType: session.sourceType, canonicalTopic: session.canonicalTopic, displayTopic: session.displayTopic,
        mode: session.mode, status: session.status, currentQuestionIndex: session.currentQuestionIndex, totalQuestions: session.questions.length,
        currentQuestionStartedAt: session.currentQuestionStartedAt, startedAt: session.startedAt, completedAt: session.completedAt,
        overallScore: session.overallScore, report: session.report,
        currentQuestion: question && session.status === 'in-progress' ? { _id: question._id, question: question.question, canonicalTopic: question.canonicalTopic, category: question.category, difficulty: question.difficulty, timeLimit: questionTimeLimit, remainingSeconds: Math.max(0, questionTimeLimit - elapsed) } : null
    }
}

async function sourceFromRequest(req, data) {
    if (data.sourceType === 'resume') {
        if (!req.file) throw Object.assign(new Error('Upload a resume PDF.'), { status: 400 })
        if (req.file.mimetype !== 'application/pdf') throw Object.assign(new Error('Resume must be a PDF file.'), { status: 400 })
        try {
            const text = (await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()).text.trim()
            if (text.length < 20) throw new Error('empty PDF')
            return text
        }
        catch { throw Object.assign(new Error('The resume PDF could not be read. Try a text-based PDF.'), { status: 422 }) }
    }
    if (data.sourceType === 'interview-plan') {
        if (!mongoose.isValidObjectId(data.interviewPlanId)) throw Object.assign(new Error('Select a valid interview plan.'), { status: 400 })
        const plan = await interviewReportModel.findOne({ _id: data.interviewPlanId, user: req.user.id })
        if (!plan) throw Object.assign(new Error('Interview plan not found.'), { status: 404 })
        return [ `Target role: ${plan.title}`, `Candidate resume: ${plan.resume}`, `Candidate description: ${plan.selfDescription}`, `Job description: ${plan.jobDescription}` ].join('\n')
    }
    if (data.sourceText.length < 2) throw Object.assign(new Error('Provide enough information to prepare a session.'), { status: 400 })
    return data.sourceText
}

async function createSessionController(req, res) {
    try {
        const parsed = createSchema.safeParse(req.body)
        if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message })
        const data = parsed.data
        const sourceText = await sourceFromRequest(req, data)
        const topicInput = data.sourceType === 'topic' ? sourceText : data.sourceType === 'interview-plan' ? sourceText.match(/Target role: ([^\n]+)/)?.[1] : sourceText.slice(0, 160)
        const topic = resolveTopic(topicInput)
        const key = sourceKey(req.user.id, data.sourceType, sourceText)
        const categories = categoryForMode[data.mode]
        const visibilityQuery = { $or: [ { visibility: 'global' }, { visibility: 'user', owner: req.user.id, sourceKey: key } ] }
        const topicTerms = [ topic.canonicalTopic, ...topic.aliases ]
        const baseQuery = { difficulty: { $in: [ 'easy', 'medium', 'hard' ] }, category: { $in: categories }, qualityStatus: 'approved', $and: [ visibilityQuery, { $or: [ { canonicalTopic: { $in: topicTerms } }, { subtopics: { $in: topicTerms } }, { skills: { $in: topicTerms } } ] } ] }
        let available = await interviewQuestionModel.find(baseQuery).lean()
        let missing = missingByDifficulty(available)

        if (Object.values(missing).some(Boolean)) {
            let generated
            try {
                generated = await generateMissingQuestions({ canonicalTopic: topic.canonicalTopic, displayTopic: topic.displayTopic, mode: data.mode, sourceText: data.sourceType === 'topic' ? '' : sourceText, missing, existingNormalized: new Set(available.map((item) => item.normalizedQuestion)) })
            } catch (error) {
                console.error('Focused question generation failed:', error.message)
                return res.status(503).json({ message: 'This topic does not have enough approved questions yet, and AI generation is temporarily unavailable. Please try again later.' })
            }
            const visibility = data.sourceType === 'topic' ? 'global' : 'user'
            const documents = generated.map((item) => ({ ...item, canonicalTopic: topic.canonicalTopic, aliases: topic.aliases, visibility, owner: visibility === 'user' ? req.user.id : null, sourceKey: visibility === 'user' ? key : '', qualityStatus: 'approved' }))
            if (documents.length) {
                try { await interviewQuestionModel.insertMany(documents, { ordered: false }) } catch (error) { if (!error.writeErrors?.every((item) => item.code === 11000)) console.warn('Some focused questions were rejected:', error.message) }
            }
            available = await interviewQuestionModel.find(baseQuery).lean()
            missing = missingByDifficulty(available)
        }

        if (Object.values(missing).some(Boolean)) return res.status(503).json({ message: `Insufficient approved questions. Still needed: ${Object.entries(missing).filter(([, count ]) => count).map(([ level, count ]) => `${count} ${level}`).join(', ')}.` })
        const recentAttempts = await questionAttemptModel.find({ user: req.user.id }).sort({ attemptedAt: -1 }).limit(240).select('question').lean()
        const selected = selectQuestions(available, new Set(recentAttempts.map((item) => String(item.question))))
        if (selected.length !== 24) return res.status(503).json({ message: 'Unable to assemble a complete 24-question session.' })
        const now = new Date()
        const session = await focusedSessionModel.create({ user: req.user.id, sourceType: data.sourceType, sourceText, sourceKey: key, canonicalTopic: topic.canonicalTopic, displayTopic: topic.displayTopic, mode: data.mode, questions: selected.map((item) => item._id), currentQuestionStartedAt: now, startedAt: now })
        await interviewQuestionModel.updateMany({ _id: { $in: session.questions } }, { $inc: { usageCount: 1 } })
        await session.populate('questions')
        return res.status(201).json({ session: publicSession(session) })
    } catch (error) {
        console.error('Failed to create focused practice:', error.message)
        return res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to prepare focused practice. Please try again.' })
    }
}

async function getSessionController(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid session ID.' })
    const session = await focusedSessionModel.findOne({ _id: req.params.id, user: req.user.id }).populate('questions')
    if (!session) return res.status(404).json({ message: 'Focused practice session not found.' })
    return res.json({ session: publicSession(session) })
}

async function evaluateCompletedSession(sessionId, userId) {
    const session = await focusedSessionModel.findOne({ _id: sessionId, user: userId }).populate('questions')
    const questionMap = new Map(session.questions.map((item) => [ String(item._id), item ]))
    const items = session.answers.map((answer) => {
        const question = questionMap.get(String(answer.question))
        return { questionId: String(question._id), question: question.question, answer: answer.answer, category: question.category, difficulty: question.difficulty, topic: question.canonicalTopic, intent: question.intent, expectedPoints: question.expectedPoints }
    })
    const evaluations = []
    for (let index = 0; index < items.length; index += 8) evaluations.push(...await evaluateBatch(items.slice(index, index + 8)))
    const evaluationMap = new Map(evaluations.map((item) => [ item.questionId, item ]))
    session.answers.forEach((answer) => { answer.evaluation = evaluationMap.get(String(answer.question)) })
    const report = buildReport(session.questions, session.answers)
    session.overallScore = report.overallScore; session.report = report; session.status = 'completed'; session.completedAt = new Date()
    await session.save()
    await questionAttemptModel.insertMany(session.answers.map((answer) => ({ user: userId, question: answer.question, session: session._id, score: answer.evaluation.score, timeTaken: answer.timeTaken, attemptedAt: answer.submittedAt })))
    await recordActivity({ user: userId, type: 'focused-practice', sourceId: session._id, occurredAt: session.completedAt })
    return session
}

async function submitAnswerController(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid session ID.' })
    const parsed = answerSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message })
    if (!mongoose.isValidObjectId(parsed.data.questionId)) return res.status(400).json({ message: 'Invalid question ID.' })
    if (!parsed.data.answer && !parsed.data.submittedAutomatically) return res.status(400).json({ message: 'Enter an answer before submitting.' })
    const existing = await focusedSessionModel.findOne({ _id: req.params.id, user: req.user.id, status: 'in-progress' }).select('+sourceText')
    if (!existing) {
        const found = await focusedSessionModel.findOne({ _id: req.params.id, user: req.user.id })
        return res.status(found ? 409 : 404).json({ message: found ? 'This session is no longer accepting answers.' : 'Focused practice session not found.' })
    }
    const index = existing.currentQuestionIndex
    if (String(existing.questions[index]) !== parsed.data.questionId) return res.status(409).json({ message: 'This question has already been submitted or is not current.' })
    const submittedAt = new Date(), startedAt = existing.currentQuestionStartedAt, limit = timeLimitFor((await interviewQuestionModel.findById(parsed.data.questionId).select('difficulty').lean()).difficulty)
    const elapsedSeconds = Math.max(0, Math.round((submittedAt - startedAt) / 1000))
    const timeTaken = Math.min(limit, elapsedSeconds)
    const submittedAutomatically = parsed.data.submittedAutomatically || elapsedSeconds >= limit
    const isLast = index === 23
    const updated = await focusedSessionModel.findOneAndUpdate(
        { _id: existing._id, user: req.user.id, status: 'in-progress', currentQuestionIndex: index },
        { $push: { answers: { question: parsed.data.questionId, answer: parsed.data.answer, startedAt, submittedAt, timeTaken, timeLimit: limit, submittedAutomatically } }, $inc: { currentQuestionIndex: 1 }, $set: { currentQuestionStartedAt: submittedAt, ...(isLast ? { status: 'evaluating' } : {}) } },
        { new: true }
    )
    if (!updated) return res.status(409).json({ message: 'This answer was already submitted.' })
    if (isLast) {
        try { await evaluateCompletedSession(updated._id, req.user.id) }
        catch (error) { console.error('Focused final evaluation failed:', error.message); return res.status(503).json({ message: 'Answers were saved, but final evaluation is temporarily unavailable. Retry by reopening this session.' }) }
    }
    const session = await focusedSessionModel.findOne({ _id: updated._id, user: req.user.id }).populate('questions')
    return res.json({ session: publicSession(session) })
}

async function getReportController(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid session ID.' })
    let session = await focusedSessionModel.findOne({ _id: req.params.id, user: req.user.id }).populate('questions')
    if (!session) return res.status(404).json({ message: 'Focused practice session not found.' })
    if (session.status === 'evaluating' && session.answers.length === 24) {
        try { session = await evaluateCompletedSession(session._id, req.user.id); await session.populate('questions') } catch { return res.status(503).json({ message: 'Evaluation is temporarily unavailable. Your answers are safe; retry shortly.' }) }
    }
    if (session.status !== 'completed') return res.status(409).json({ message: 'Complete all 24 questions before viewing the report.' })
    const answers = session.answers.map((answer) => { const question = session.questions.find((item) => String(item._id) === String(answer.question)); return { question: { _id: question._id, question: question.question, topic: question.canonicalTopic, category: question.category, difficulty: question.difficulty }, answer: answer.answer, timeTaken: answer.timeTaken, timeLimit: answer.timeLimit, submittedAutomatically: answer.submittedAutomatically, evaluation: answer.evaluation } })
    return res.json({ session: { ...publicSession(session), answers } })
}

async function listSessionsController(req, res) {
    const sessions = await focusedSessionModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select('-sourceText -questions -answers').lean()
    return res.json({ sessions })
}

module.exports = { createSessionController, getSessionController, submitAnswerController, getReportController, listSessionsController }
