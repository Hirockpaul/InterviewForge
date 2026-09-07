import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import { useAuth } from '../../auth/hooks/useAuth'
import { useInterview } from '../../interview/hooks/useInterview'
import '../style/dashboard.scss'
import { getStreak } from '../../preparation/services/preparation.api'
import { getRecommendedJobs, prepareJob } from '../../jobs/services/jobs.api'

const Dashboard = () => {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { loading, reports } = useInterview()
    const [ streak, setStreak ] = useState(null)
    const [ recommended, setRecommended ] = useState({ jobs: [], missingProfile: false })

    useEffect(() => { getStreak().then((data) => setStreak(data.streak)).catch(() => setStreak(null)) }, [])
    useEffect(() => { getRecommendedJobs().then(setRecommended).catch(() => setRecommended({ jobs: [], missingProfile: false })) }, [])

    const prepareRecommended = async (job) => {
        try { const data = await prepareJob(job._id); navigate(`/interviews/${data.interviewReport._id}`) }
        catch { navigate('/interviews/create', { state: { jobDescription: job.description || '' } }) }
    }

    const totalPlans = reports.length
    const highMatches = reports.filter((report) => report.matchScore >= 80).length
    const averageMatch = totalPlans
        ? Math.round(reports.reduce((total, report) => total + (report.matchScore || 0), 0) / totalPlans)
        : 0
    const recentPlans = reports.slice(0, 3)
    const firstName = user?.username?.split(/[\s_-]/)[0] || 'there'

    if (loading) {
        return <div className='dashboard-page'><AppHeader /><main className='dashboard-main dashboard-loading' aria-label='Loading dashboard'><span className='dashboard-loading__hero' /><div className='dashboard-loading__metrics'><span /><span /><span /></div><div className='dashboard-loading__panels'><span /><span /></div></main></div>
    }

    return (
        <div className='dashboard-page'>
            <AppHeader />

            <main className='dashboard-main'>
                <section className='dashboard-hero'>
                    <div>
                        <p className='dashboard-eyebrow'>Your interview workspace</p>
                        <h1>Good to see you,<br /><span>{firstName}.</span></h1>
                        <p className='dashboard-hero__copy'>Build focused preparation plans, review your strongest opportunities, and keep moving toward interview readiness.</p>
                    </div>
                    <button type='button' className='dashboard-primary' onClick={() => navigate('/interviews/create')}>
                        Create new interview plan
                        <span aria-hidden='true'>&rarr;</span>
                    </button>
                </section>

                <section className='dashboard-progress' aria-labelledby='progress-title'>
                    <div className='dashboard-section-heading'>
                        <p>At a glance</p>
                        <h2 id='progress-title'>Your progress</h2>
                    </div>
                    <div className='dashboard-stats'>
                        <article><strong>{totalPlans}</strong><span>Plans created</span></article>
                        <article><strong>{highMatches}</strong><span>High matches</span></article>
                        <article><strong>{averageMatch}%</strong><span>Average match</span></article>
                    </div>
                </section>

                <section className='dashboard-tools' aria-label='Practice shortcuts'>
                    <article className='dashboard-streak'>
                        <div><p>Interview streak</p><strong>🔥 {streak?.currentStreak || 0} day{streak?.currentStreak === 1 ? '' : 's'}</strong><span>{streak?.currentStreak ? 'Keep your preparation going.' : 'Complete meaningful practice to begin.'}</span></div>
                        <div className='dashboard-week'>{(streak?.week?.length ? streak.week : [ 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' ].map((label) => ({ label, date: label, active: false }))).map((day) => <span key={day.date} className={day.active ? 'active' : ''}>{day.label}<b aria-label={day.active ? 'Practice completed' : 'No practice completed'}>{day.active ? '✓' : '—'}</b></span>)}</div>
                    </article>
                    <article className='dashboard-quick'><p>Quick practice</p><div><button onClick={() => navigate('/focused-practice')}>Technical questions</button><button onClick={() => navigate('/coding-practice')}>Coding practice</button><button onClick={() => navigate('/mcq')}>MCQ practice</button><button onClick={() => navigate('/question-bank')}>Saved questions</button><button onClick={() => navigate('/project-questions')}>Project questions</button><button onClick={() => navigate('/introductions')}>Tell me about yourself</button></div></article>
                </section>

                <section className='dashboard-recent' aria-labelledby='recent-title'>
                    <div className='dashboard-section-heading dashboard-section-heading--row'>
                        <div>
                            <p>Pick up where you left off</p>
                            <h2 id='recent-title'>Recent interview plans</h2>
                        </div>
                        {recentPlans.length > 0 && <button type='button' onClick={() => navigate('/interviews/create')}>Create another <span aria-hidden='true'>&rarr;</span></button>}
                    </div>

                    {recentPlans.length > 0 ? (
                        <div className='dashboard-plans'>
                            {recentPlans.map((report) => (
                                <button key={report._id} type='button' className='dashboard-plan' onClick={() => navigate(`/interviews/${report._id}`)}>
                                    <span className='dashboard-plan__top'>
                                        <strong>{report.title || 'Untitled position'}</strong>
                                        <span>{report.matchScore}% match</span>
                                    </span>
                                    <span className='dashboard-plan__date'>Generated {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <span className='dashboard-plan__link'>Open preparation plan <span aria-hidden='true'>&rarr;</span></span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className='dashboard-empty'>
                            <h3>Your first plan starts with a target role</h3>
                            <p>Add a job description and resume to receive a focused interview strategy.</p>
                            <button type='button' onClick={() => navigate('/interviews/create')}>Create your first plan</button>
                        </div>
                    )}
                </section>

                <section className='dashboard-jobs' aria-labelledby='recommended-jobs-title'>
                    <div className='dashboard-section-heading dashboard-section-heading--row'><div><p>Based on your profile</p><h2 id='recommended-jobs-title'>Recommended jobs</h2></div><button type='button' onClick={() => navigate('/jobs')}>Explore all jobs <span aria-hidden='true'>→</span></button></div>
                    {recommended.jobs.length > 0 ? <div className='dashboard-job-list'>{recommended.jobs.map((job) => <article key={job._id}><div><h3>{job.title}</h3><p>{job.company}</p><span>{job.location?.display || job.locations?.[0] || 'Location not provided'}{job.remoteType ? ` · ${job.remoteType}` : ''}</span></div><div className='dashboard-job-actions'><button className='dashboard-job-actions__view' type='button' onClick={() => navigate(`/jobs/${job._id}`)}>View job details</button><button className='dashboard-job-actions__prepare' type='button' onClick={() => prepareRecommended(job)}>Prepare interview <span aria-hidden='true'>→</span></button></div></article>)}</div> : <div className='dashboard-empty'><h3>{recommended.missingProfile ? 'Complete your candidate profile' : 'No recommendations yet'}</h3><p>{recommended.missingProfile ? 'Create an interview plan with your resume or self-description to unlock relevant job recommendations.' : 'We will show current roles here as they become available.'}</p><button type='button' onClick={() => navigate(recommended.missingProfile ? '/interviews/create' : '/jobs')}>{recommended.missingProfile ? 'Add candidate information' : 'Explore jobs'}</button></div>}
                </section>
            </main>
        </div>
    )
}

export default Dashboard
