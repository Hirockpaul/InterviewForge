const mongoose = require('mongoose')
const { z } = require('zod')
const mcqQuestionModel = require('../models/mcqQuestion.model')
const mcqSessionModel = require('../models/mcqSession.model')
const mcqAttemptModel = require('../models/mcqAttempt.model')
const { resolveTopic } = require('../services/focusedPractice.services')
const { buildMcqResult } = require('../services/mcqCore.services')
const { mcqPool } = require('../services/mcqPool.services')
const { recordActivity } = require('../services/activity.services')

const createSchema = z.object({
    topic: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(80),
    difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']),
    questionCount: z.union([z.literal(10), z.literal(20), z.literal(30)]),
    timerEnabled: z.boolean().default(true)
})
const answerSchema = z.object({
    questionId: z.string(),
    selectedOption: z.number().int().min(0).max(3).nullable(),
    submittedAutomatically: z.boolean().default(false)
})
const timeLimitFor = (difficulty) => ({ easy: 45, medium: 60, hard: 90 })[difficulty]
const slugCategory = (value) => resolveTopic(value).canonicalTopic

function publicSession(session) {
    const currentQuestion = session.questions?.[session.currentQuestionIndex]
    const timeLimit = currentQuestion ? timeLimitFor(currentQuestion.difficulty) : null
    const elapsed = session.currentQuestionStartedAt ? Math.max(0, Math.floor((Date.now() - new Date(session.currentQuestionStartedAt)) / 1000)) : 0
    const visibleQuestion = currentQuestion && session.status === 'in-progress'
        ? {
            _id: currentQuestion._id,
            question: currentQuestion.question,
            options: currentQuestion.options,
            topic: currentQuestion.canonicalTopic,
            subtopic: currentQuestion.subtopic,
            difficulty: currentQuestion.difficulty,
            timeLimit,
            remainingSeconds: session.timerEnabled ? Math.max(0, timeLimit - elapsed) : null
        }
        : null

    return {
        _id: session._id,
        canonicalTopic: session.canonicalTopic,
        displayTopic: session.displayTopic,
        category: session.category,
        difficulty: session.difficulty,
        questionCount: session.questionCount,
        currentQuestionIndex: session.currentQuestionIndex,
        status: session.status,
        timerEnabled: session.timerEnabled,
        startedAt: session.startedAt,
        score: session.score,
        correctCount: session.correctCount,
        currentQuestion: visibleQuestion
    }
}

async function createSessionController(req, res) {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message })
    }

    const data = parsed.data
    const topic = resolveTopic(data.topic)
    const category = slugCategory(data.category)

    try {
        const recentAttempts = await mcqAttemptModel.find({ user: req.user.id })
            .sort({ attemptedAt: -1 })
            .limit(300)
            .select('question')
            .lean()
        const pool = await mcqPool.getForSession({
            canonicalTopic: topic.canonicalTopic,
            category,
            difficulty: data.difficulty,
            count: data.questionCount,
            attemptedIds: new Set(recentAttempts.map(item => String(item.question)))
        })
        const counts = await mcqPool.counts(topic.canonicalTopic, category)

        if (!pool.sufficient) {
            const scheduled = mcqPool.schedule({
                canonicalTopic: topic.canonicalTopic,
                displayTopic: topic.displayTopic,
                category
            })
            return res.status(202).json({
                status: 'preparing',
                message: scheduled
                    ? 'Questions for this topic are being prepared.'
                    : 'Questions are already being prepared. Try again shortly.',
                topic: { ...topic, category },
                counts
            })
        }

        if (Object.values(counts).some(count => count < 50)) {
            mcqPool.schedule({
                canonicalTopic: topic.canonicalTopic,
                displayTopic: topic.displayTopic,
                category
            })
        }

        const now = new Date()
        const session = await mcqSessionModel.create({
            user: req.user.id,
            canonicalTopic: topic.canonicalTopic,
            displayTopic: topic.displayTopic,
            category,
            difficulty: data.difficulty,
            questionCount: data.questionCount,
            questions: pool.selected.map(item => item._id),
            timerEnabled: data.timerEnabled,
            currentQuestionStartedAt: now,
            startedAt: now
        })

        await mcqQuestionModel.updateMany(
            { _id: { $in: session.questions } },
            { $inc: { usageCount: 1 } }
        )
        await session.populate('questions')
        return res.status(201).json({ status: 'ready', session: publicSession(session) })
    } catch (error) {
        console.error('MCQ session creation failed:', error.message)
        return res.status(500).json({ message: 'Unable to prepare the MCQ test.' })
    }
}

async function getSessionController(req, res) {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid MCQ session ID.' })
    }

    const session = await mcqSessionModel
        .findOne({ _id: id, user: req.user.id })
        .populate('questions')
    if (!session) {
        return res.status(404).json({ message: 'MCQ session not found.' })
    }

    return res.json({ session: publicSession(session) })
}

async function finalizeSession(sessionId, userId) {
    const session = await mcqSessionModel
        .findOne({ _id: sessionId, user: userId })
        .populate('questions')
    const correctCount = session.answers.filter(answer => answer.correct).length

    session.correctCount = correctCount
    session.score = Math.round(correctCount / session.questionCount * 100)
    session.result = buildMcqResult(session.questions, session.answers)
    session.status = 'completed'
    session.completedAt = new Date()
    await session.save()

    await mcqAttemptModel.insertMany(session.answers.map(answer => ({
        user: userId,
        session: session._id,
        question: answer.question,
        selectedOption: answer.selectedOption,
        correct: answer.correct,
        timeTaken: answer.timeTaken,
        attemptedAt: answer.submittedAt
    })))
    await recordActivity({
        user: userId,
        type: 'mcq-practice',
        sourceId: session._id,
        occurredAt: session.completedAt
    })
    return session
}

async function submitAnswerController(req, res) {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid MCQ session ID.' })
    }

    const parsed = answerSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message })
    }
    if (!mongoose.isValidObjectId(parsed.data.questionId)) {
        return res.status(400).json({ message: 'Invalid question ID.' })
    }

    const session = await mcqSessionModel.findOne({
        _id: id,
        user: req.user.id,
        status: 'in-progress'
    })
    if (!session) {
        const exists = await mcqSessionModel.exists({ _id: id, user: req.user.id })
        return res.status(exists ? 409 : 404).json({
            message: exists ? 'This MCQ test is already complete.' : 'MCQ session not found.'
        })
    }

    const questionIndex = session.currentQuestionIndex
    if (String(session.questions[questionIndex]) !== parsed.data.questionId) {
        return res.status(409).json({ message: 'This question was already submitted or is not current.' })
    }

    const question = await mcqQuestionModel.findById(parsed.data.questionId).lean()
    if (!question) {
        return res.status(409).json({ message: 'The current question is unavailable.' })
    }

    const submittedAt = new Date()
    const elapsed = Math.max(0, Math.round((submittedAt - session.currentQuestionStartedAt) / 1000))
    const timeLimit = timeLimitFor(question.difficulty)
    const selectedOption = parsed.data.selectedOption
    const submittedAutomatically = parsed.data.submittedAutomatically
        || (session.timerEnabled && elapsed >= timeLimit)
    const isLastQuestion = questionIndex === session.questionCount - 1
    const updated = await mcqSessionModel.findOneAndUpdate(
        {
            _id: session._id,
            user: req.user.id,
            status: 'in-progress',
            currentQuestionIndex: questionIndex
        },
        {
            $push: {
                answers: {
                    question: question._id,
                    selectedOption,
                    correct: selectedOption === question.correctOption,
                    startedAt: session.currentQuestionStartedAt,
                    submittedAt,
                    timeTaken: session.timerEnabled ? Math.min(timeLimit, elapsed) : elapsed,
                    submittedAutomatically
                }
            },
            $inc: { currentQuestionIndex: 1 },
            $set: { currentQuestionStartedAt: submittedAt }
        },
        { new: true }
    )

    if (!updated) {
        return res.status(409).json({ message: 'This answer was already submitted.' })
    }
    if (isLastQuestion) {
        await finalizeSession(updated._id, req.user.id)
    }

    const result = await mcqSessionModel
        .findOne({ _id: updated._id, user: req.user.id })
        .populate('questions')
    return res.json({ session: publicSession(result) })
}

async function completeController(req, res) {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid MCQ session ID.' })
    }

    const session = await mcqSessionModel
        .findOne({ _id: id, user: req.user.id, status: 'in-progress' })
        .populate('questions')
    if (!session) {
        return res.status(409).json({ message: 'This test cannot be completed.' })
    }

    const now = new Date()
    for (let index = session.currentQuestionIndex; index < session.questions.length; index += 1) {
        session.answers.push({
            question: session.questions[index]._id,
            selectedOption: null,
            correct: false,
            startedAt: index === session.currentQuestionIndex ? session.currentQuestionStartedAt : now,
            submittedAt: now,
            timeTaken: 0,
            submittedAutomatically: true
        })
    }

    session.currentQuestionIndex = session.questionCount
    await session.save()
    const completedSession = await finalizeSession(session._id, req.user.id)
    return res.json({ session: publicSession(completedSession) })
}

async function resultController(req, res) {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid MCQ session ID.' })
    }

    const session = await mcqSessionModel
        .findOne({ _id: id, user: req.user.id, status: 'completed' })
        .populate('questions')
    if (!session) {
        return res.status(404).json({ message: 'Completed MCQ result not found.' })
    }

    const review = session.answers.map(answer => {
        const question = session.questions.find(item => String(item._id) === String(answer.question))
        return {
            question: {
                _id: question._id,
                question: question.question,
                options: question.options,
                correctOption: question.correctOption,
                explanation: question.explanation,
                topic: question.canonicalTopic,
                subtopic: question.subtopic,
                category: question.category,
                difficulty: question.difficulty
            },
            selectedOption: answer.selectedOption,
            correct: answer.correct,
            timeTaken: answer.timeTaken
        }
    })

    return res.json({
        result: {
            ...publicSession(session),
            completedAt: session.completedAt,
            result: session.result,
            review
        }
    })
}

async function historyController(req, res) {
    const sessions = await mcqSessionModel.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .select('-questions -answers')
        .lean()
    return res.json({ sessions })
}

async function topicsController(req, res) {
    const topics = await mcqQuestionModel.aggregate([
        { $match: { visibility: 'global', qualityStatus: 'approved' } },
        { $group: { _id: { topic: '$canonicalTopic', category: '$category' }, count: { $sum: 1 } } },
        { $sort: { '_id.topic': 1 } }
    ])
    return res.json({
        topics: topics.map(row => ({
            canonicalTopic: row._id.topic,
            category: row._id.category,
            count: row.count
        }))
    })
}

async function poolStatusController(req, res) {
    const topic = resolveTopic(String(req.query.topic || ''))
    const category = slugCategory(String(req.query.category || 'programming'))
    const counts = await mcqPool.counts(topic.canonicalTopic, category)
    return res.json({
        topic: { ...topic, category },
        counts,
        generation: mcqPool.status(topic.canonicalTopic, category)
    })
}

module.exports = {
    createSessionController,
    getSessionController,
    submitAnswerController,
    completeController,
    resultController,
    historyController,
    topicsController,
    poolStatusController,
    serializeMcqSession: publicSession
}
