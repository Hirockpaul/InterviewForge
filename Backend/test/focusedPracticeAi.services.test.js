const test = require('node:test')
const assert = require('node:assert/strict')
const { ai } = require('../src/services/ai.services')
const { generateMissingQuestions } = require('../src/services/focusedPracticeAi.services')

test('focused generation sends a Gemini-compatible schema and validates locally', async () => {
    const original = ai.models.generateContent
    let providerSchema
    ai.models.generateContent = async ({ config }) => {
        providerSchema = config.responseJsonSchema
        return { text: JSON.stringify({ questions: [ {
            question: 'How does the Node.js event loop schedule asynchronous work?', difficulty: 'easy', category: 'technical',
            subtopics: [ 'event-loop' ], skills: [ 'Node.js' ], intent: 'Check core runtime understanding.',
            expectedPoints: [ 'Call stack', 'Task queues' ]
        } ] }) }
    }
    try {
        const questions = await generateMissingQuestions({ canonicalTopic: 'nodejs', displayTopic: 'Node.js', mode: 'technical', sourceText: '', missing: { easy: 1, medium: 0, hard: 0 }, existingNormalized: new Set() })
        assert.equal(questions.length, 1)
        assert.equal(providerSchema.properties.questions.maxItems, undefined)
        assert.equal(providerSchema.properties.questions.items.properties.question.minLength, undefined)
        assert.equal(questions[0].expectedPoints.length, 2)
    } finally {
        ai.models.generateContent = original
    }
})
