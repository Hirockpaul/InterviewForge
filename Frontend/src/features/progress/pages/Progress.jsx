import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import { getProgress } from '../services/progress.api'
import '../style/progress.scss'

const Progress = () => {
    const navigate = useNavigate()
    const [ progress, setProgress ] = useState(null)
    const [ loading, setLoading ] = useState(true)
    const [ error, setError ] = useState('')

    useEffect(() => {
        const loadProgress = async () => {
            try {
                const data = await getProgress()
                setProgress(data.progress)
            } catch (requestError) {
                setError(requestError.response?.data?.message || 'Unable to load your progress.')
            } finally {
                setLoading(false)
            }
        }

        loadProgress()
    }, [])

    return (
        <div className='progress-page'>
            <AppHeader />
            <main className='progress-main'>
                <header className='progress-heading'>
                    <p>Measured from evaluated practice</p>
                    <h1>Interview readiness</h1>
                    <span>See where your answers are improving and what to practice next.</span>
                </header>

                {loading ? (
                    <div className='progress-state'>Calculating your readiness...</div>
                ) : error ? (
                    <div className='progress-state'><h2>Progress unavailable</h2><p>{error}</p></div>
                ) : progress.totalCompleted === 0 && progress.timedAnswersCompleted === 0 && progress.focusedPracticeCompleted === 0 && progress.mcq.completed === 0 ? (
                    <div className='progress-state'>
                        <h2>Complete your first evaluated practice</h2>
                        <p>Your readiness score will be calculated from evaluated answers, not estimates.</p>
                        <button type='button' onClick={() => navigate('/interviews')}>Choose a plan and start mock</button>
                    </div>
                ) : (
                    <>
                        <section className='readiness-overview'>
                            <div className='readiness-score'>
                                <span>Overall readiness</span>
                                <strong>{progress.overallReadiness == null ? '--' : `${progress.overallReadiness}%`}</strong>
                                <p>{progress.readinessClassification}</p>
                            </div>
                            <div className='readiness-highlights'>
                                <article><span>Strongest area</span><strong>{progress.strongestArea?.label || 'Not measured'}</strong><p>{progress.strongestArea ? `${progress.strongestArea.score}%` : 'Complete answer practice'}</p></article>
                                <article><span>Priority area</span><strong>{progress.weakestArea?.label || 'Not measured'}</strong><p>{progress.weakestArea ? `${progress.weakestArea.score}%` : 'Complete answer practice'}</p></article>
                                <article><span>Completed practice</span><strong>{progress.totalCompleted}</strong><p>Mock interviews</p></article>
                                <article><span>Legacy answers</span><strong>{progress.timedAnswersCompleted}</strong><p>Previous timed answers</p></article>
                                <article><span>Technical questions</span><strong>{progress.focusedPracticeCompleted}</strong><p>24-question sessions</p></article>
                                <article><span>MCQ tests</span><strong>{progress.mcq.completed}</strong><p>{progress.mcq.averageScore == null ? 'No score yet' : `${progress.mcq.averageScore}% average`}</p></article>
                            </div>
                        </section>

                        <section className='progress-dimensions'>
                            <div className='progress-section-heading'><p>Performance breakdown</p><h2>Your answer skills</h2></div>
                            <div className='dimension-list'>
                                {progress.dimensions.map((dimension) => (
                                    <article key={dimension.key}>
                                        <div><strong>{dimension.label}</strong><span>{dimension.classification}</span></div>
                                        <div className='dimension-bar'><span style={{ width: `${dimension.score ?? 0}%` }} /></div>
                                        <b>{dimension.score == null ? '--' : `${dimension.score}%`}</b>
                                    </article>
                                ))}
                            </div>
                        </section>

                        {progress.focusedPracticeCompleted > 0 && (
                            <section className='progress-dimensions'>
                                <div className='progress-section-heading'><p>Technical questions</p><h2>Difficulty performance</h2></div>
                                <div className='readiness-highlights'>{Object.entries(progress.focusedDifficultyPerformance).map(([difficulty, score]) => <article key={difficulty}><span>{difficulty}</span><strong>{score == null ? '--' : `${score}%`}</strong><p>Across completed sessions</p></article>)}</div>
                            </section>
                        )}

                        {progress.mcq.completed > 0 && (
                            <section className='progress-dimensions'>
                                <div className='progress-section-heading'><p>MCQ assessments</p><h2>Knowledge accuracy</h2></div>
                                <div className='readiness-highlights'>{Object.entries(progress.mcq.difficultyAccuracy).map(([difficulty, score]) => <article key={difficulty}><span>{difficulty}</span><strong>{score == null ? '--' : `${score}%`}</strong><p>MCQ accuracy</p></article>)}</div>
                                {progress.mcq.weakTopics.length > 0 && <div className='weak-topics'><div>{progress.mcq.weakTopics.map(item => <article key={item.topic}><strong>{item.topic}</strong><span>{item.score}%</span><p>Recommended MCQ practice</p></article>)}</div></div>}
                            </section>
                        )}

                        {progress.weakestArea && <section className='progress-recommendation'>
                            <div><p>Recommended next step</p><h2>Focus on {progress.weakestArea?.label.toLowerCase()}</h2><span>{progress.recommendation}</span></div>
                            <button type='button' onClick={() => navigate('/interviews')}>Start targeted practice <span aria-hidden='true'>&rarr;</span></button>
                        </section>}

                        {progress.weakTopics.length > 0 && (
                            <section className='weak-topics'>
                                <div className='progress-section-heading'><p>Topics below 70%</p><h2>Knowledge gaps</h2></div>
                                <div>{progress.weakTopics.map((item) => <article key={item.topic}><strong>{item.topic}</strong><span>{item.score}%</span><p>{item.classification}</p></article>)}</div>
                            </section>
                        )}

                        <section className='progress-trend'>
                            <div className='progress-section-heading'><p>Completed sessions</p><h2>Performance trend</h2></div>
                            <div>{progress.trend.map((item) => <article key={item.id}><span>{item.label}</span><strong>{item.score}%</strong><p>{item.role}</p></article>)}</div>
                        </section>
                    </>
                )}
            </main>
        </div>
    )
}

export default Progress
