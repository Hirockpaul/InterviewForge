const { GoogleGenAI } = require('@google/genai')
const { z } = require('zod')

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })
const model = 'gemini-3-flash-preview'

const questionSchema = z.object({
    question: z.string().min(10),
    questionType: z.enum([ 'technical', 'behavioral', 'system-design', 'role-specific' ]),
    topic: z.string().min(2),
    difficulty: z.enum([ 'easy', 'medium', 'hard' ])
})

const answerResultSchema = z.object({
    evaluation: z.object({
        score: z.number().min(0).max(100),
        technicalAccuracy: z.number().min(0).max(100),
        communication: z.number().min(0).max(100),
        clarity: z.number().min(0).max(100),
        depth: z.number().min(0).max(100),
        relevance: z.number().min(0).max(100),
        star: z.object({
            situation: z.number().min(0).max(100),
            task: z.number().min(0).max(100),
            action: z.number().min(0).max(100),
            result: z.number().min(0).max(100)
        }).nullable(),
        strengths: z.array(z.string()).max(5),
        improvements: z.array(z.string()).max(5),
        feedback: z.string()
    }),
    nextQuestion: questionSchema
})

function fallbackQuestion(interviewPlan, questionIndex = 0) {
    const technicalQuestions = interviewPlan.technicalQuestions || []
    const behavioralQuestions = interviewPlan.behavioralQuestions || []
    const availableQuestions = [ ...technicalQuestions, ...behavioralQuestions ]
    const selected = availableQuestions[questionIndex % availableQuestions.length]
    const isBehavioral = questionIndex >= technicalQuestions.length && behavioralQuestions.length > 0

    return {
        question: selected?.question || `What experience best demonstrates your readiness for the ${interviewPlan.title} role?`,
        questionType: isBehavioral ? 'behavioral' : 'technical',
        topic: interviewPlan.skillGaps?.[questionIndex % (interviewPlan.skillGaps.length || 1)]?.skill || interviewPlan.title,
        difficulty: questionIndex < 2 ? 'easy' : questionIndex < 4 ? 'medium' : 'hard'
    }
}

function fallbackEvaluation({ interviewPlan, questions, answer }) {
    const currentQuestion = questions.at(-1)
    const wordCount = answer.trim().split(/\s+/).length
    const sentenceCount = answer.split(/[.!?]+/).filter((sentence) => sentence.trim()).length
    const includesExample = /\b(example|for instance|when i|i built|i implemented|result|outcome)\b/i.test(answer)
    const includesReasoning = /\b(because|therefore|trade-?off|reason|so that)\b/i.test(answer)
    const completeness = Math.min(100, 35 + wordCount * 1.5)
    const communication = Math.min(100, 45 + sentenceCount * 6 + (includesExample ? 12 : 0))
    const depth = Math.min(100, 35 + (includesReasoning ? 25 : 0) + (includesExample ? 20 : 0) + Math.min(wordCount, 40) / 2)
    const relevance = Math.min(100, 55 + (includesExample ? 20 : 0) + (includesReasoning ? 15 : 0))
    const technicalAccuracy = Math.round((completeness + depth) / 2)
    const clarity = Math.round((communication + relevance) / 2)
    const score = Math.round((technicalAccuracy + communication + clarity + depth + relevance) / 5)
    const isBehavioral = currentQuestion.questionType === 'behavioral'

    return {
        evaluation: {
            score,
            technicalAccuracy: Math.round(technicalAccuracy),
            communication: Math.round(communication),
            clarity,
            depth: Math.round(depth),
            relevance: Math.round(relevance),
            star: isBehavioral ? {
                situation: includesExample ? 70 : 45,
                task: wordCount >= 30 ? 70 : 50,
                action: includesReasoning ? 75 : 50,
                result: /\b(result|outcome|improved|reduced|increased)\b/i.test(answer) ? 80 : 45
            } : null,
            strengths: [ includesExample ? 'Used a practical example.' : 'Addressed the question directly.' ],
            improvements: [ wordCount < 40 ? 'Add more supporting detail.' : 'Make the main conclusion more concise.' ],
            feedback: 'This evaluation was generated locally because the AI service is unavailable. Strengthen the answer with specific decisions, trade-offs, and measurable results.'
        },
        nextQuestion: fallbackQuestion(interviewPlan, questions.length)
    }
}

async function generateOpeningQuestion(interviewPlan, focus = null) {
    try {
        const response = await ai.models.generateContent({
            model,
            contents: `Act as an interviewer for the role "${interviewPlan.title}". Ask one concise opening technical or role-specific interview question. Use these skill gaps for context: ${interviewPlan.skillGaps.map((gap) => gap.skill).join(', ')}.${focus?.projectName ? ` This is a project-focused interview about "${focus.projectName}". Ask only about these candidate-provided facts: ${focus.projectContext}. Do not assert unstated functionality.` : ''}`,
            config: {
                responseMimeType: 'application/json',
                responseJsonSchema: z.toJSONSchema(questionSchema)
            }
        })

        return questionSchema.parse(JSON.parse(response.text))
    } catch (error) {
        console.warn('Gemini opening question unavailable; using plan question:', error.message)
        return fallbackQuestion(interviewPlan)
    }
}

async function evaluateAnswer({ interviewPlan, questions, answer }) {
    const currentQuestion = questions.at(-1)
    const previousContext = questions.slice(0, -1).map((item) => ({
        question: item.question,
        answer: item.answer,
        score: item.evaluation?.score
    }))

    try {
        const response = await ai.models.generateContent({
            model,
            contents: `You are conducting an adaptive mock interview for "${interviewPlan.title}".
Current question: ${currentQuestion.question}
Question type: ${currentQuestion.questionType}
Topic: ${currentQuestion.topic}
Candidate answer: ${answer}
Previous interview context: ${JSON.stringify(previousContext)}
Evaluate the answer constructively. For behavioral questions, score each STAR element; otherwise return null for STAR. Then ask one concise follow-up question influenced by this answer and vary difficulty based on performance.`,
            config: {
                responseMimeType: 'application/json',
                responseJsonSchema: z.toJSONSchema(answerResultSchema)
            }
        })

        return answerResultSchema.parse(JSON.parse(response.text))
    } catch (error) {
        console.warn('Gemini answer evaluation unavailable; using local evaluation:', error.message)
        return fallbackEvaluation({ interviewPlan, questions, answer })
    }
}

module.exports = { generateOpeningQuestion, evaluateAnswer }
