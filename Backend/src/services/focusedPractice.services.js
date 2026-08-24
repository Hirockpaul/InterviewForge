const crypto = require('crypto')

const aliasMap = new Map(Object.entries({
    'python-programming': 'python', 'python-3': 'python', 'node-js': 'nodejs', 'node': 'nodejs',
    'express': 'expressjs', 'express-js': 'expressjs', 'mongo-db': 'mongodb', 'react-js': 'react',
    'golang': 'go', 'c-plus-plus': 'cpp', 'c': 'cpp', 'operating-systems': 'operating-systems',
    'database-management-systems': 'dbms', 'computer-networks': 'computer-networks', 'system-design': 'system-design'
}))

function slug(value) {
    return String(value || '').toLowerCase().replace(/c\+\+/g, 'cpp').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function resolveTopic(value) {
    const normalized = slug(value)
    const words = normalized.split('-').filter(Boolean)
    const candidate = [ normalized, ...[ ...aliasMap.keys() ].sort((a, b) => b.length - a.length).filter((item) => `-${normalized}-`.includes(`-${item}-`)), words.slice(0, 2).join('-'), words[0] ].find((item) => aliasMap.has(item))
    const canonicalTopic = candidate ? aliasMap.get(candidate) : (words.slice(0, 3).join('-') || 'general-interview')
    return { canonicalTopic, displayTopic: String(value || 'General interview').trim(), aliases: [ normalized ].filter((item) => item && item !== canonicalTopic) }
}

const normalizeQuestion = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
const sourceKey = (userId, type, text) => crypto.createHash('sha256').update(`${userId}:${type}:${String(text).trim().toLowerCase()}`).digest('hex')
const shuffle = (items, random = Math.random) => {
    const result = [ ...items ]
    for (let index = result.length - 1; index > 0; index -= 1) { const other = Math.floor(random() * (index + 1)); [ result[index], result[other] ] = [ result[other], result[index] ] }
    return result
}
const timeLimitFor = (difficulty) => ({ easy: 60, medium: 90, hard: 120 })[difficulty]
const average = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0

function missingByDifficulty(questions) {
    return Object.fromEntries([ 'easy', 'medium', 'hard' ].map((difficulty) => [ difficulty, Math.max(0, 8 - questions.filter((item) => item.difficulty === difficulty).length) ]))
}

function selectQuestions(questions, attemptedIds = new Set(), random = Math.random) {
    return [ 'easy', 'medium', 'hard' ].flatMap((difficulty) => {
        const matching = questions.filter((item) => item.difficulty === difficulty)
        const fresh = shuffle(matching.filter((item) => !attemptedIds.has(String(item._id))), random)
        const repeated = shuffle(matching.filter((item) => attemptedIds.has(String(item._id))), random)
        return [ ...fresh, ...repeated ].slice(0, 8)
    })
}

function buildReport(questionDocs, answers) {
    const rows = answers.map((answer) => ({ answer, question: questionDocs.find((item) => String(item._id) === String(answer.question)) }))
    const difficultyPerformance = Object.fromEntries([ 'easy', 'medium', 'hard' ].map((difficulty) => [ difficulty, average(rows.filter((row) => row.question?.difficulty === difficulty).map((row) => row.answer.evaluation?.score || 0)) ]))
    const dimensionKeys = [ 'technicalAccuracy', 'communication', 'clarity', 'depth', 'relevance' ]
    const dimensions = Object.fromEntries(dimensionKeys.map((key) => [ key, average(rows.map((row) => row.answer.evaluation?.[key] || 0)) ]))
    const topics = new Map()
    rows.forEach(({ question, answer }) => { const key = question?.canonicalTopic || 'general'; const values = topics.get(key) || []; values.push(answer.evaluation?.score || 0); topics.set(key, values) })
    const ranked = [ ...topics ].map(([ topic, scores ]) => ({ topic, score: average(scores) })).sort((a, b) => b.score - a.score)
    const weakest = [ ...ranked ].sort((a, b) => a.score - b.score)
    const priority = weakest[0]?.topic || 'answer structure'
    return {
        overallScore: average(rows.map((row) => row.answer.evaluation?.score || 0)), difficultyPerformance, dimensions,
        strongestAreas: ranked.slice(0, 3).map((item) => `${item.topic} (${item.score}%)`),
        weakAreas: weakest.filter((item) => item.score < 70).slice(0, 3).map((item) => `${item.topic} (${item.score}%)`),
        priorityImprovement: priority,
        recommendations: [ `Review the expected points for your lowest-scoring ${priority} answers.`, `Practice two ${priority} answers with a direct opening, evidence, and trade-offs.`, `Retake hard questions in ${priority} after reviewing feedback.` ]
    }
}

module.exports = { resolveTopic, normalizeQuestion, sourceKey, shuffle, timeLimitFor, missingByDifficulty, selectQuestions, buildReport }
