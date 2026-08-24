import { useState } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate, useParams } from 'react-router'
import { startMockInterview } from '../../mockInterview/services/mockInterview.api.js'
import AppHeader from '../../../components/layout/AppHeader.jsx'
import { LuChevronDown, LuCode, LuDownload, LuMessagesSquare, LuRoute, LuSparkles } from 'react-icons/lu'
import SaveQuestionButton from '../../preparation/components/SaveQuestionButton.jsx'
import '../../preparation/style/preparation.scss'



const NAV_ITEMS = [
    { id: 'technical', label: 'Technical Questions', icon: LuCode },
    { id: 'behavioral', label: 'Behavioral Questions', icon: LuMessagesSquare },
    { id: 'roadmap', label: 'Preparation Road Map', icon: LuRoute },
]

// ── Sub-components ────────────────────────────────────────────────────────────
const QuestionCard = ({ item, index, category, interviewPlanId, navigate }) => {
    const [ open, setOpen ] = useState(false)
    return (
        <div className='q-card'>
            <button type='button' className='q-card__header' onClick={() => setOpen(o => !o)} aria-expanded={open}>
                <span className='q-card__index'>Q{index + 1}</span>
                <p className='q-card__question'>{item.question}</p>
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <LuChevronDown aria-hidden='true' />
                </span>
            </button>
            {open && (
                <div className='q-card__body'>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--intention'>Intention</span>
                        <p>{item.intention}</p>
                    </div>
                    <div className='prep-actions'>
                        <SaveQuestionButton question={{ questionText: item.question, source: category, category, topic: category === 'technical' ? 'Role skills' : 'Behavioral', difficulty: 'intermediate', sourceId: `${interviewPlanId}:${category}:${index}` }} />
                        <button type='button' className='prep-secondary' onClick={() => navigate('/focused-practice', { state: { interviewPlanId } })}>Generate technical session</button>
                    </div>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                        <p>{item.answer}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

const RoadMapDay = ({ day }) => (
    <div className='roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {day.tasks.map((task, i) => (
                <li key={i}>
                    <span className='roadmap-day__bullet' />
                    {task}
                </li>
            ))}
        </ul>
    </div>
)

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
    const [ activeNav, setActiveNav ] = useState('technical')
    const [ isStartingMock, setIsStartingMock ] = useState(false)
    const [ actionError, setActionError ] = useState('')
    const { report, error, loading, getResumePdf } = useInterview()
    const { interviewId } = useParams()
    const navigate = useNavigate()

    const startMock = async () => {
        setIsStartingMock(true)
        setActionError('')
        try {
            const data = await startMockInterview(interviewId)
            navigate(`/mock-interview/${data.mockInterview._id}`)
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || 'Unable to start a mock interview.')
        } finally {
            setIsStartingMock(false)
        }
    }

    if (loading) {
        return (
            <main className='loading-screen'>
                <h1>Loading your interview plan...</h1>
            </main>
        )
    }

    if (error || !report) {
        return (
            <main className='report-error'>
                <h1>Interview plan not found</h1>
                <p>{error || 'This plan may have been deleted or you may not have access to it.'}</p>
                <button type='button' onClick={() => navigate('/interviews')}>Back to interview history</button>
            </main>
        )
    }

    const scoreColor =
        report.matchScore >= 80 ? 'score--high' :
            report.matchScore >= 60 ? 'score--mid' : 'score--low'


    return (
        <div className='interview-page'>
            <AppHeader />
            <header className='report-masthead'>
                <div>
                    <p>Interview report</p>
                    <h1>{report.title}</h1>
                </div>
                <span>Personalized preparation strategy</span>
            </header>
            <div className='interview-layout'>

                {/* ── Left Nav ── */}
                <nav className='interview-nav'>
                    <div className="nav-content">
                        <p className='interview-nav__label'>Sections</p>
                        {NAV_ITEMS.map(item => {
                            const Icon = item.icon
                            return (
                            <button
                                key={item.id}
                                className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                onClick={() => setActiveNav(item.id)}
                            >
                                <span className='interview-nav__icon'><Icon aria-hidden='true' /></span>
                                {item.label}
                            </button>
                            )
                        })}
                    </div>
                    <div className='interview-nav__actions'>
                    <button type='button' className='mock-start-btn' onClick={startMock} disabled={isStartingMock}>
                        <LuSparkles aria-hidden='true' />
                        {isStartingMock ? 'Starting interview...' : 'Start Mock Interview'}
                    </button>
                    <button
                        onClick={() => { getResumePdf(interviewId) }}
                        className='button primary-button' >
                        <LuDownload aria-hidden='true' />
                        Download Resume
                    </button>
                    {actionError && <p className='interview-action-error' role='alert'>{actionError}</p>}
                    </div>
                </nav>

                <div className='interview-divider' />

                {/* ── Center Content ── */}
                <main className='interview-content'>
                    {activeNav === 'technical' && (
                        <section>
                            <div className='content-header'>
                                <h2>Technical Questions</h2>
                                <span className='content-header__count'>{report.technicalQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {report.technicalQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} category='technical' interviewPlanId={interviewId} navigate={navigate} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'behavioral' && (
                        <section>
                            <div className='content-header'>
                                <h2>Behavioral Questions</h2>
                                <span className='content-header__count'>{report.behavioralQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {report.behavioralQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} category='behavioral' interviewPlanId={interviewId} navigate={navigate} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'roadmap' && (
                        <section>
                            <div className='content-header'>
                                <h2>Preparation Road Map</h2>
                                <span className='content-header__count'>{report.preparationPlan.length}-day plan</span>
                            </div>
                            <div className='roadmap-list'>
                                {report.preparationPlan.map((day) => (
                                    <RoadMapDay key={day.day} day={day} />
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                <div className='interview-divider' />

                {/* ── Right Sidebar ── */}
                <aside className='interview-sidebar'>

                    {/* Match Score */}
                    <div className='match-score'>
                        <p className='match-score__label'>Match Score</p>
                        <div className={`match-score__ring ${scoreColor}`}>
                            <span className='match-score__value'>{report.matchScore}</span>
                            <span className='match-score__pct'>%</span>
                        </div>
                        <p className='match-score__sub'>Strong match for this role</p>
                    </div>

                    <div className='sidebar-divider' />

                    {/* Skill Gaps */}
                    <div className='skill-gaps'>
                        <p className='skill-gaps__label'>Skill Gaps</p>
                        <div className='skill-gaps__list'>
                            {report.skillGaps.map((gap, i) => (
                                <span key={i} className={`skill-tag skill-tag--${gap.severity}`}>
                                    {gap.skill}
                                </span>
                            ))}
                        </div>
                    </div>

                </aside>
            </div>
        </div>
    )
}

export default Interview
