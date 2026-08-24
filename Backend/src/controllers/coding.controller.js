const { z } = require('zod')
const jdoodleService = require('../services/jdoodle.service')
const { CODING_LANGUAGES } = require('../config/codingLanguages')
const { CODING_TOPIC_IDS } = require('../config/codingTopics')
const codingProblemModel = require('../models/codingProblem.model')
const codingService = require('../services/coding.services')
const mongoose = require('mongoose')

const runCodeSchema = z.object({
    language: z.enum(Object.keys(CODING_LANGUAGES)),
    versionIndex: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1, 'Source code is required.').max(50_000, 'Source code is too large.'),
    stdin: z.string().max(10_000, 'Standard input is too large.').default('')
}).strict()

const problemQuerySchema = z.object({
    topic: z.enum(CODING_TOPIC_IDS).optional(),
    difficulty: z.enum([ 'easy', 'medium', 'hard' ]).optional(),
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(24)
})

const generationSchema = z.object({
    topic: z.enum(CODING_TOPIC_IDS),
    difficulty: z.enum([ 'easy', 'medium', 'hard' ])
}).strict()

async function runCodeController(req, res) {
    const parsed = runCodeSchema.safeParse(req.body)

    if (!parsed.success) {
        return res.status(400).json({
            success: false,
            output: '',
            error: parsed.error.issues[0].message,
            status: 'invalid_request'
        })
    }

    const selectedLanguage = CODING_LANGUAGES[parsed.data.language]

    if (parsed.data.versionIndex && parsed.data.versionIndex !== selectedLanguage.versionIndex) {
        return res.status(400).json({
            success: false,
            output: '',
            error: 'The selected language version is not supported.',
            status: 'invalid_request'
        })
    }

    try {
        const result = await jdoodleService.executeCode({
            language: selectedLanguage.jdoodleLanguage,
            versionIndex: selectedLanguage.versionIndex,
            code: parsed.data.code,
            stdin: parsed.data.stdin
        })

        return res.json(result)
    } catch (error) {
        console.error('Coding execution failed:', error.message)
        return res.status(503).json({
            success: false,
            output: '',
            error: 'Code execution service is temporarily unavailable.',
            status: 'api_error'
        })
    }
}

async function topicsController(req, res) {
    try {
        const topics = await codingService.listTopics()
        return res.json({ topics, recommended: [ 'arrays', 'hashing', 'strings' ] })
    } catch (error) {
        console.error('Coding topics could not be loaded:', error.message)
        return res.status(500).json({ message: 'Coding topics could not be loaded.' })
    }
}

async function problemsController(req, res) {
    const parsed = problemQuerySchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message })
    try {
        return res.json(await codingService.listProblems(parsed.data))
    } catch (error) {
        console.error('Coding problems could not be loaded:', error.message)
        return res.status(500).json({ message: 'Coding problems could not be loaded.' })
    }
}

async function problemController(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid coding problem ID.' })
    try {
        const problem = await codingProblemModel.findById(req.params.id).lean({ flattenMaps: true })
        if (!problem) return res.status(404).json({ message: 'Coding problem not found.' })
        return res.json({ problem })
    } catch (error) {
        console.error('Coding problem could not be loaded:', error.message)
        return res.status(500).json({ message: 'Coding problem could not be loaded.' })
    }
}

async function generateProblemsController(req, res) {
    const parsed = generationSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message })
    try {
        const result = await codingService.generateMissing(parsed.data)
        return res.status(result.generated ? 201 : 200).json(result)
    } catch (error) {
        console.error('Coding problem generation failed:', error.message)
        return res.status(503).json({ message: 'Unable to generate new questions right now. Please try again.' })
    }
}

module.exports = {
    runCodeController,
    topicsController,
    problemsController,
    problemController,
    generateProblemsController,
    runCodeSchema,
    problemQuerySchema,
    generationSchema
}
