const { z } = require('zod')
const { ai } = require('./ai.services')
const { CODING_TOPIC_IDS } = require('../config/codingTopics')
const { CODING_LANGUAGES } = require('../config/codingLanguages')

const model = 'gemini-3-flash-preview'
const languageIds = Object.keys(CODING_LANGUAGES)

const generatedProblemSchema = z.object({
    title: z.string().trim().min(4).max(160),
    shortDescription: z.string().trim().min(20).max(320),
    description: z.string().trim().min(80).max(10_000),
    difficulty: z.enum([ 'easy', 'medium', 'hard' ]),
    topic: z.enum(CODING_TOPIC_IDS),
    constraints: z.array(z.string().trim().min(1)).min(1).max(12),
    examples: z.array(z.object({
        input: z.string().trim().min(1),
        output: z.string().trim().min(1),
        explanation: z.string().trim()
    })).min(2).max(5),
    starterCode: z.object({
        javascript: z.string().trim().min(10),
        python: z.string().trim().min(10),
        java: z.string().trim().min(10),
        cpp: z.string().trim().min(10),
        c: z.string().trim().min(10)
    }),
    supportedLanguages: z.array(z.enum(languageIds)).min(1),
    hints: z.array(z.string().trim().min(8)).min(2).max(5),
    explanation: z.string().trim().min(40),
    timeComplexity: z.string().trim().min(3),
    spaceComplexity: z.string().trim().min(3)
})

const generatedProblemsSchema = z.object({ problems: z.array(generatedProblemSchema).min(1).max(10) })

// Gemini enforces its own response-schema complexity limit. Keep the transport
// schema simple, then apply the stricter application schema before persistence.
const aiResponseSchema = z.object({ problems: z.array(z.object({
    title: z.string(), shortDescription: z.string(), description: z.string(),
    difficulty: z.string(), topic: z.string(), constraints: z.array(z.string()),
    examples: z.array(z.object({ input: z.string(), output: z.string(), explanation: z.string() })),
    starterCode: z.object({ javascript: z.string(), python: z.string(), java: z.string(), cpp: z.string(), c: z.string() }),
    supportedLanguages: z.array(z.string()), hints: z.array(z.string()), explanation: z.string(),
    timeComplexity: z.string(), spaceComplexity: z.string()
})) })

async function generateCodingProblems({ topic, displayTopic, difficulty, count, existingTitles }) {
    const response = await ai.models.generateContent({
        model,
        contents: `You are an expert technical-interview problem designer.
Generate exactly ${count} original coding interview problem${count === 1 ? '' : 's'}.
Topic: ${displayTopic} (return topic id exactly as "${topic}")
Difficulty: ${difficulty}

Requirements:
- Every problem must genuinely match the requested topic and difficulty.
- Problems must be algorithmic, clear, unambiguous, and reasonably executable with standard input/output.
- Include realistic constraints and at least two examples with expected outputs.
- Provide compilable function-oriented starter code for javascript, python, java, cpp, and c without a completed solution.
- supportedLanguages must contain exactly: javascript, python, java, cpp, c.
- Provide progressive hints without immediately revealing the solution.
- Include the intended explanation, time complexity, and space complexity.
- Do not include hidden tests or full solution code in starterCode.
- Avoid these existing titles: ${existingTitles.slice(0, 100).join(' | ') || '(none)'}.
- Return structured JSON only.`,
        config: {
            responseMimeType: 'application/json',
            responseJsonSchema: z.toJSONSchema(aiResponseSchema)
        }
    })

    const generated = generatedProblemsSchema.parse(JSON.parse(response.text)).problems

    return generated.map((problem) => ({
        ...problem,
        starterCode: Object.fromEntries(Object.entries(problem.starterCode).map(([ language, code ]) => [
            language,
            code.includes('\\n') && !code.includes('\n')
                ? code.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
                : code
        ]))
    }))
}

module.exports = { generateCodingProblems, generatedProblemSchema, generatedProblemsSchema }
