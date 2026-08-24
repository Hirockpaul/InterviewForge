import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import { getMockInterview, submitMockAnswer } from '../services/mockInterview.api'
import '../style/mock-interview.scss'
import SaveQuestionButton from '../../preparation/components/SaveQuestionButton'
import '../../preparation/style/preparation.scss'

const MockInterview = () => {
    const { mockInterviewId } = useParams()
    const navigate = useNavigate()
    const [ session, setSession ] = useState(null)
    const [ answer, setAnswer ] = useState('')
    const [ loading, setLoading ] = useState(true)
    const [ evaluating, setEvaluating ] = useState(false)
    const [ error, setError ] = useState('')

    useEffect(() => {
        const loadSession = async () => {
            try {
                const data = await getMockInterview(mockInterviewId)
                setSession(data.mockInterview)
            } catch (requestError) {
                setError(requestError.response?.data?.message || 'Unable to load this mock interview.')
            } finally {
                setLoading(false)
            }
        }

        loadSession()
    }, [ mockInterviewId ])

    const submitAnswer = async (event) => {
        event.preventDefault()
        if (answer.trim().length < 10 || evaluating) return

        setEvaluating(true)
        setError('')
        try {
            const data = await submitMockAnswer(mockInterviewId, answer.trim())
            setSession(data.mockInterview)
            setAnswer('')
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to evaluate your answer.')
        } finally {
            setEvaluating(false)
        }
    }

    if (loading) return <main className='mock-state'>Preparing your mock interview...</main>
    if (error && !session) return <main className='mock-state'><h1>Mock interview unavailable</h1><p>{error}</p><button onClick={() => navigate('/dashboard')}>Back to dashboard</button></main>

    const currentQuestion = session.questions.at(-1)
    const latestEvaluation = session.status === 'completed'
        ? currentQuestion.evaluation
        : session.questions.at(-2)?.evaluation

    return (
        <div className='mock-page'>
            <AppHeader />
            <main className='mock-main'>
                <header className='mock-heading'>
                    <div>
                        <p>AI interviewer</p>
                        <h1>{session.interviewPlan?.title || 'Mock interview'}</h1>
                    </div>
                    <span>{session.status === 'completed' ? 'Complete' : `Question ${session.questions.length} of 5`}</span>
                </header>

                {session.status === 'completed' ? (
                    <section className='mock-results'>
                        <p>Final evaluation</p>
                        <strong>{session.overallScore}%</strong>
                        <h2>Mock interview complete</h2>
                        <span>Review your latest feedback, then return to your preparation plan to keep improving.</span>
                        <button type='button' onClick={() => navigate('/interviews')}>Back to interview history</button>
                    </section>
                ) : (
                    <section className='mock-question'>
                        <span>
                            Question {session.questions.length}
                            {currentQuestion.questionType ? ` · ${currentQuestion.questionType}` : ''}
                            {currentQuestion.difficulty ? ` · ${currentQuestion.difficulty}` : ''}
                        </span>
                        <h2>{currentQuestion.question}</h2>
                        <div className='prep-actions'>
                            <SaveQuestionButton question={{ questionText: currentQuestion.question, source: 'mock', category: currentQuestion.questionType === 'behavioral' ? 'behavioral' : currentQuestion.questionType === 'system-design' ? 'system-design' : 'technical', topic: currentQuestion.topic || 'General', difficulty: currentQuestion.difficulty === 'easy' ? 'beginner' : currentQuestion.difficulty === 'hard' ? 'advanced' : 'intermediate', sourceId: `${session._id}:${session.questions.length}` }} />
                            <button type='button' className='prep-secondary' onClick={() => navigate('/focused-practice', { state: { interviewPlanId: session.interviewPlan?._id } })}>Technical questions</button>
                        </div>
                        <form onSubmit={submitAnswer}>
                            <label htmlFor='mock-answer'>Your answer</label>
                            <textarea id='mock-answer' value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder='Explain your thinking clearly and include a practical example where possible...' />
                            <button type='submit' disabled={answer.trim().length < 10 || evaluating}>{evaluating ? 'Evaluating your answer...' : 'Submit answer'}</button>
                        </form>
                    </section>
                )}

                {error && <p className='mock-error' role='alert'>{error}</p>}

                {latestEvaluation && (
                    <section className='mock-feedback'>
                        <div className='mock-feedback__score'><span>Answer score</span><strong>{latestEvaluation.score}%</strong></div>
                        <div className='mock-feedback__metrics'>
                            <span>Technical accuracy <strong>{latestEvaluation.technicalAccuracy}%</strong></span>
                            <span>Communication <strong>{latestEvaluation.communication}%</strong></span>
                            <span>Clarity <strong>{latestEvaluation.clarity ?? '--'}{latestEvaluation.clarity != null ? '%' : ''}</strong></span>
                            <span>Depth <strong>{latestEvaluation.depth}%</strong></span>
                            <span>Relevance <strong>{latestEvaluation.relevance ?? '--'}{latestEvaluation.relevance != null ? '%' : ''}</strong></span>
                        </div>
                        <p>{latestEvaluation.feedback}</p>
                        <div className='mock-feedback__lists'>
                            <div><h3>What you did well</h3><ul>{latestEvaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>
                            <div><h3>Improve next</h3><ul>{latestEvaluation.improvements.map((item) => <li key={item}>{item}</li>)}</ul></div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}

export default MockInterview
