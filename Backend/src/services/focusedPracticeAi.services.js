const { z } = require('zod')
const { normalizeQuestion } = require('./focusedPractice.services')
const { ai } = require('./ai.services')

const model = 'gemini-3-flash-preview'
const categories = [ 'technical', 'behavioral', 'project', 'system-design', 'role-specific' ]

const generatedQuestionSchema = z.object({
    question: z.string().trim().min(12).max(1000), difficulty: z.enum([ 'easy', 'medium', 'hard' ]),
    category: z.enum(categories), subtopics: z.array(z.string().min(1)).min(1).max(8), skills: z.array(z.string().min(1)).min(1).max(8),
    intent: z.string().trim().min(8).max(1000), expectedPoints: z.array(z.string().trim().min(1)).min(2).max(12)
})
const generationSchema = z.object({ questions: z.array(generatedQuestionSchema).max(36) })

const evaluationSchema = z.object({
    questionId: z.string(), score: z.number().min(0).max(100), technicalAccuracy: z.number().min(0).max(100),
    communication: z.number().min(0).max(100), clarity: z.number().min(0).max(100), depth: z.number().min(0).max(100),
    relevance: z.number().min(0).max(100), completeness: z.number().min(0).max(100),
    categoryScores: z.object({
        situation: z.number().min(0).max(100), task: z.number().min(0).max(100), action: z.number().min(0).max(100), result: z.number().min(0).max(100), specificity: z.number().min(0).max(100),
        technicalUnderstanding: z.number().min(0).max(100), ownership: z.number().min(0).max(100), implementationKnowledge: z.number().min(0).max(100), decisionMaking: z.number().min(0).max(100), tradeoffs: z.number().min(0).max(100), problemSolving: z.number().min(0).max(100),
        architecture: z.number().min(0).max(100), scalability: z.number().min(0).max(100), reliability: z.number().min(0).max(100), database: z.number().min(0).max(100), caching: z.number().min(0).max(100), security: z.number().min(0).max(100)
    }),
    strengths: z.array(z.string()).max(4), weaknesses: z.array(z.string()).max(4), feedback: z.string(), recommendedImprovement: z.string()
})
const evaluationBatchSchema = z.object({ evaluations: z.array(evaluationSchema).max(8) })

async function generateMissingQuestions({ canonicalTopic, displayTopic, mode, sourceText, missing, existingNormalized }) {
    const requested = Object.entries(missing).filter(([, count ]) => count > 0).map(([ difficulty, count ]) => `${difficulty}: ${count}`).join(', ')
    const privateContext = sourceText ? `Candidate-private source context:\n${sourceText}` : ''
    const response = await ai.models.generateContent({
        model,
        contents: `Create ONLY the missing reusable interview questions for topic "${displayTopic}" (canonical: ${canonicalTopic}). Required counts: ${requested}. Practice mode: ${mode}.
Return exactly the requested count for each difficulty. Modes map to categories; mixed should use a relevant mix. Questions must be open-ended, unambiguous, relevant, and contain useful expected answer points. Never include facts not present in private context. If private context exists, ground project-specific questions only in it.
Do not repeat these normalized existing questions: ${[ ...existingNormalized ].slice(0, 150).join(' | ')}
${privateContext}`,
        config: { responseMimeType: 'application/json', responseJsonSchema: z.toJSONSchema(generationSchema) }
    })
    const parsed = generationSchema.parse(JSON.parse(response.text))
    const accepted = []
    const seen = new Set(existingNormalized)
    for (const question of parsed.questions) {
        const normalized = normalizeQuestion(question.question)
        if (!normalized || seen.has(normalized)) continue
        if (!canonicalTopic || question.expectedPoints.length < 2) continue
        seen.add(normalized); accepted.push({ ...question, normalizedQuestion: normalized })
    }
    return accepted
}

function localEvaluation(item) {
    const answer = item.answer.trim(), words = answer ? answer.split(/\s+/).length : 0
    const expected = item.expectedPoints || []
    const covered = expected.filter((point) => answer.toLowerCase().includes(point.toLowerCase().split(/\s+/)[0])).length
    const relevance = expected.length ? Math.round(35 + 65 * covered / expected.length) : Math.min(100, 30 + words)
    const completeness = Math.min(100, Math.round(20 + words * 1.4 + covered * 8))
    const clarity = words ? Math.min(90, 45 + Math.round(Math.min(words, 60) / 3)) : 0
    const depth = Math.min(100, Math.round(20 + words + covered * 10))
    const technicalAccuracy = Math.round((relevance + completeness + depth) / 3)
    const communication = clarity
    const score = Math.round((technicalAccuracy + communication + clarity + depth + relevance + completeness) / 6)
    return { questionId: String(item.questionId), score, technicalAccuracy, communication, clarity, depth, relevance, completeness, categoryScores: Object.fromEntries([ 'situation','task','action','result','specificity','technicalUnderstanding','ownership','implementationKnowledge','decisionMaking','tradeoffs','problemSolving','architecture','scalability','reliability','database','caching','security' ].map((key) => [ key, 0 ])),
        strengths: answer ? [ 'Provided a response within the interview time limit.' ] : [], weaknesses: answer ? [ 'Cover more of the expected concepts explicitly.' ] : [ 'No answer was provided.' ],
        feedback: answer ? 'Connect the main conclusion to the expected concepts and support it with a concrete example or trade-off.' : 'No answer was submitted before time expired.',
        recommendedImprovement: `Review: ${expected.slice(0, 4).join(', ') || 'the core topic'}, then answer again with a direct structure.` }
}

async function evaluateBatch(items) {
    try {
        const response = await ai.models.generateContent({
            model,
            contents: `Evaluate these interview answers using the supplied category, expected points, and intent. Score consistently from 0-100. Apply category-appropriate judgment: technical accuracy/completeness; behavioral STAR/specificity; project ownership/decisions/trade-offs; system design architecture/scalability/reliability/database/caching/security. In categoryScores, score applicable criteria and use 0 for criteria that do not apply. Return one evaluation per questionId and do not add questions.\n${JSON.stringify(items)}`,
            config: { responseMimeType: 'application/json', responseJsonSchema: z.toJSONSchema(evaluationBatchSchema) }
        })
        const parsed = evaluationBatchSchema.parse(JSON.parse(response.text))
        const byId = new Map(parsed.evaluations.map((item) => [ item.questionId, item ]))
        return items.map((item) => byId.get(String(item.questionId)) || localEvaluation(item))
    } catch (error) {
        console.warn('Focused practice batch evaluation unavailable; using existing deterministic evaluation approach:', error.message)
        return items.map(localEvaluation)
    }
}

module.exports = { generateMissingQuestions, evaluateBatch }
