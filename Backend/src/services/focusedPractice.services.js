const crypto = require('crypto')

const difficulties = ['easy', 'medium', 'hard']

const topicAliases = new Map(Object.entries({
    'python-programming': 'python',
    'python-3': 'python',
    'node-js': 'nodejs',
    node: 'nodejs',
    express: 'expressjs',
    'express-js': 'expressjs',
    'mongo-db': 'mongodb',
    'react-js': 'react',
    golang: 'go',
    'c-plus-plus': 'cpp',
    c: 'cpp',
    'operating-systems': 'operating-systems',
    'database-management-systems': 'dbms',
    'computer-networks': 'computer-networks',
    'system-design': 'system-design'
}))

function slug(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/c\+\+/g, 'cpp')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

function resolveTopic(value) {
    const normalizedTopic = slug(value)
    const words = normalizedTopic.split('-').filter(Boolean)

    const matchingAlias = [...topicAliases.keys()]
        .sort((first, second) => second.length - first.length)
        .find(alias => `-${normalizedTopic}-`.includes(`-${alias}-`))

    const candidates = [
        normalizedTopic,
        matchingAlias,
        words.slice(0, 2).join('-'),
        words[0]
    ]

    const alias = candidates.find(candidate => topicAliases.has(candidate))
    const fallbackTopic = words.slice(0, 3).join('-') || 'general-interview'
    const canonicalTopic = alias ? topicAliases.get(alias) : fallbackTopic
    const aliases = normalizedTopic && normalizedTopic !== canonicalTopic
        ? [normalizedTopic]
        : []

    return {
        canonicalTopic,
        displayTopic: String(value || 'General interview').trim(),
        aliases
    }
}

function normalizeQuestion(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function sourceKey(userId, type, text) {
    const source = `${userId}:${type}:${String(text).trim().toLowerCase()}`

    return crypto.createHash('sha256').update(source).digest('hex')
}

function shuffle(items, random = Math.random) {
    const shuffledItems = [...items]

    for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
        const otherIndex = Math.floor(random() * (index + 1))
        const currentItem = shuffledItems[index]

        shuffledItems[index] = shuffledItems[otherIndex]
        shuffledItems[otherIndex] = currentItem
    }

    return shuffledItems
}

function timeLimitFor(difficulty) {
    const timeLimits = {
        easy: 60,
        medium: 90,
        hard: 120
    }

    return timeLimits[difficulty]
}

function average(values) {
    if (values.length === 0) {
        return 0
    }

    const total = values.reduce((sum, value) => sum + value, 0)
    return Math.round(total / values.length)
}

function missingByDifficulty(questions) {
    return Object.fromEntries(
        difficulties.map(difficulty => {
            const availableCount = questions.filter(
                question => question.difficulty === difficulty
            ).length

            return [difficulty, Math.max(0, 8 - availableCount)]
        })
    )
}

function selectQuestions(questions, attemptedIds = new Set(), random = Math.random) {
    return difficulties.flatMap(difficulty => {
        const matchingQuestions = questions.filter(
            question => question.difficulty === difficulty
        )

        const newQuestions = shuffle(
            matchingQuestions.filter(
                question => !attemptedIds.has(String(question._id))
            ),
            random
        )

        const repeatedQuestions = shuffle(
            matchingQuestions.filter(
                question => attemptedIds.has(String(question._id))
            ),
            random
        )

        return [...newQuestions, ...repeatedQuestions].slice(0, 8)
    })
}

function buildReport(questionDocuments, answers) {
    const answerRows = answers.map(answer => ({
        answer,
        question: questionDocuments.find(
            question => String(question._id) === String(answer.question)
        )
    }))

    const difficultyPerformance = Object.fromEntries(
        difficulties.map(difficulty => {
            const scores = answerRows
                .filter(row => row.question?.difficulty === difficulty)
                .map(row => row.answer.evaluation?.score || 0)

            return [difficulty, average(scores)]
        })
    )

    const dimensionNames = [
        'technicalAccuracy',
        'communication',
        'clarity',
        'depth',
        'relevance'
    ]

    const dimensions = Object.fromEntries(
        dimensionNames.map(dimension => [
            dimension,
            average(
                answerRows.map(row => row.answer.evaluation?.[dimension] || 0)
            )
        ])
    )

    const scoresByTopic = new Map()

    for (const { question, answer } of answerRows) {
        const topic = question?.canonicalTopic || 'general'
        const scores = scoresByTopic.get(topic) || []

        scores.push(answer.evaluation?.score || 0)
        scoresByTopic.set(topic, scores)
    }

    const strongestTopics = [...scoresByTopic]
        .map(([topic, scores]) => ({ topic, score: average(scores) }))
        .sort((first, second) => second.score - first.score)

    const weakestTopics = [...strongestTopics]
        .sort((first, second) => first.score - second.score)

    const improvementPriority = weakestTopics[0]?.topic || 'answer structure'

    return {
        overallScore: average(
            answerRows.map(row => row.answer.evaluation?.score || 0)
        ),
        difficultyPerformance,
        dimensions,
        strongestAreas: strongestTopics
            .slice(0, 3)
            .map(item => `${item.topic} (${item.score}%)`),
        weakAreas: weakestTopics
            .filter(item => item.score < 70)
            .slice(0, 3)
            .map(item => `${item.topic} (${item.score}%)`),
        priorityImprovement: improvementPriority,
        recommendations: [
            `Review the expected points for your lowest-scoring ${improvementPriority} answers.`,
            `Practice two ${improvementPriority} answers with a direct opening, evidence, and trade-offs.`,
            `Retake hard questions in ${improvementPriority} after reviewing feedback.`
        ]
    }
}

module.exports = {
    resolveTopic,
    normalizeQuestion,
    sourceKey,
    shuffle,
    timeLimitFor,
    missingByDifficulty,
    selectQuestions,
    buildReport
}
