const DIMENSIONS = [
    { key: 'technicalAccuracy', label: 'Technical knowledge' },
    { key: 'communication', label: 'Communication' },
    { key: 'clarity', label: 'Clarity' },
    { key: 'depth', label: 'Answer depth' },
    { key: 'relevance', label: 'Relevance' }
]

const average = (values) => values.length
    ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
    : null

const classifyScore = (score) => {
    if (!Number.isFinite(score)) return 'Not measured'
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Strong'
    if (score >= 70) return 'Good'
    if (score >= 60) return 'Needs improvement'
    return 'Weak'
}

const recommendationFor = (key) => {
    const recommendations = {
        technicalAccuracy: 'Review the core concepts behind your lowest-scoring topics, then answer three role-specific technical questions.',
        communication: 'Practice concise two-minute answers with a clear opening, supporting example, and conclusion.',
        clarity: 'Structure each response before speaking: context, decision, reasoning, and result.',
        depth: 'Add trade-offs, failure cases, and a practical example to your next five answers.',
        relevance: 'Connect each answer directly to the target role and remove details that do not support your main point.'
    }

    return recommendations[key]
}

function calculateProgress(mockInterviews, timedPractices = [], activityCounts = {}, focusedPractices = [], mcqPractices = []) {
    const completed = mockInterviews.filter((session) => session.status === 'completed')
    const answeredQuestions = [
        ...completed.flatMap((session) => session.questions.filter((item) => item.evaluation)),
        ...timedPractices.filter((item) => item.status === 'completed' && item.evaluation).map((item) => ({ topic: item.topic, evaluation: item.evaluation })),
        ...focusedPractices.flatMap((session) => session.answers.filter((item) => item.evaluation).map((item) => ({ topic: session.questions.find((question) => String(question._id) === String(item.question))?.canonicalTopic || session.canonicalTopic, evaluation: item.evaluation })))
    ]
    const dimensions = DIMENSIONS.map(({ key, label }) => {
        const score = average(answeredQuestions.map((item) => item.evaluation[key]).filter(Number.isFinite))
        return { key, label, score, classification: classifyScore(score) }
    })
    const scoredDimensions = dimensions.filter((item) => Number.isFinite(item.score))
    const overallReadiness = average(scoredDimensions.map((item) => item.score))
    const sortedDimensions = [ ...scoredDimensions ].sort((a, b) => a.score - b.score)
    const weakestArea = sortedDimensions[0] || null
    const strongestArea = sortedDimensions.at(-1) || null

    const topicScores = new Map()
    answeredQuestions.forEach((item) => {
        const topic = item.topic || 'General'
        const scores = topicScores.get(topic) || []
        if (Number.isFinite(item.evaluation.score)) scores.push(item.evaluation.score)
        topicScores.set(topic, scores)
    })
    const weakTopics = [ ...topicScores.entries() ]
        .map(([ topic, scores ]) => ({ topic, score: average(scores), classification: classifyScore(average(scores)) }))
        .filter((item) => Number.isFinite(item.score) && item.score < 70)
        .sort((a, b) => a.score - b.score)

    const mockTrend = completed.map((session, index) => ({
        id: session._id,
        label: `Mock interview ${index + 1}`,
        score: session.overallScore,
        role: session.interviewPlan?.title || 'Interview plan',
        completedAt: session.updatedAt
    }))
    const focusedTrend = focusedPractices.map((session, index) => ({ id: session._id, label: `Focused practice ${index + 1}`, score: session.overallScore, role: session.displayTopic, completedAt: session.completedAt }))
    const focusedDifficultyPerformance = Object.fromEntries([ 'easy', 'medium', 'hard' ].map((difficulty) => [ difficulty, average(focusedPractices.map((session) => session.report?.difficultyPerformance?.[difficulty]).filter(Number.isFinite)) ]))
    const mcqAverageScore = average(mcqPractices.map((session) => session.score).filter(Number.isFinite))
    const mcqTopicScores = new Map()
    mcqPractices.forEach((session) => { Object.entries(session.result?.topicAccuracy || {}).forEach(([ topic, score ]) => { const values = mcqTopicScores.get(topic) || []; values.push(score); mcqTopicScores.set(topic, values) }) })
    const mcqTopicAccuracy = [ ...mcqTopicScores ].map(([ topic, scores ]) => ({ topic, score: average(scores) })).sort((a, b) => a.score - b.score)
    const mcqDifficultyAccuracy = Object.fromEntries([ 'easy','medium','hard' ].map((difficulty) => [ difficulty, average(mcqPractices.map((session) => session.result?.difficultyPerformance?.[difficulty]).filter(Number.isFinite)) ]))

    return {
        totalCompleted: completed.length,
        timedAnswersCompleted: timedPractices.filter((item) => item.status === 'completed').length,
        focusedPracticeCompleted: focusedPractices.length,
        focusedDifficultyPerformance,
        mcq: { completed: mcqPractices.length, averageScore: mcqAverageScore, topicAccuracy: mcqTopicAccuracy, difficultyAccuracy: mcqDifficultyAccuracy, weakTopics: mcqTopicAccuracy.filter((item) => item.score < 60) },
        activityCounts,
        overallReadiness,
        readinessClassification: classifyScore(overallReadiness),
        dimensions,
        strongestArea,
        weakestArea,
        weakTopics,
        recommendation: weakestArea ? recommendationFor(weakestArea.key) : null,
        trend: [ ...mockTrend, ...focusedTrend ].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
    }
}

module.exports = { calculateProgress, classifyScore }
