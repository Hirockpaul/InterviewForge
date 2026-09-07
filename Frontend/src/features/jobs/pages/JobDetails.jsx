import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import JobDescription from '../components/JobDescription'
import { analyzeJob, getJob, prepareJob, saveJob, unsaveJob } from '../services/jobs.api'
import '../style/jobs.scss'

const readable = (value) => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
const formatMoney = (value, currency) => {
    if (value == null) return ''
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value) }
    catch { return `${currency || ''} ${Number(value).toLocaleString()}`.trim() }
}
const salaryText = (job) => {
    const min = job.salary?.min ?? job.salaryMin; const max = job.salary?.max ?? job.salaryMax; const currency = job.salary?.currency || job.salaryCurrency
    if (min == null && max == null) return 'Not provided by employer'
    const range = [ min, max ].filter((value) => value != null).map((value) => formatMoney(value, currency)).join(' – ')
    const rawPeriod = String(job.salary?.period || '').toLowerCase()
    const period = [ 'year', 'yearly', 'annual', 'annually', 'per_year' ].includes(rawPeriod) ? 'per annum' : rawPeriod ? `per ${readable(rawPeriod).toLowerCase()}` : ''
    return `${range}${period ? ` ${period}` : ''}`
}
const experienceText = (experience) => {
    if (!experience) return 'Not provided'
    if (experience.text) return experience.text
    if (experience.minYears != null && experience.maxYears != null) return `${experience.minYears}–${experience.maxYears} years`
    if (experience.minYears != null) return `${experience.minYears}+ years`
    return 'Not provided'
}
const locationText = (job) => job.locations?.length > 1
    ? job.locations.map((location) => job.countries?.length === 1 && !location.toLowerCase().includes('india') ? `${location}, ${job.location?.country || (job.countries[0] === 'IN' ? 'India' : job.countries[0])}` : location).join(' · ')
    : job.location?.display || job.locations?.[0] || 'Location not provided'

const JobDetails = () => {
    const { id } = useParams(); const navigate = useNavigate()
    const [ state, setState ] = useState({ loading: true, error: '', job: null, analysis: null })
    const [ action, setAction ] = useState(''); const [ message, setMessage ] = useState('')
    useEffect(() => { const controller = new AbortController(); getJob(id, controller.signal).then(({ job, analysis }) => setState({ loading: false, error: '', job, analysis })).catch((error) => { if (error.code !== 'ERR_CANCELED') setState({ loading: false, error: error.response?.status === 404 ? 'This job is no longer available.' : 'We could not load this job.', job: null, analysis: null }) }); return () => controller.abort() }, [ id ])
    const toggleSave = async () => { setAction('save'); try { state.job.saved ? await unsaveJob(id) : await saveJob(id); setState((current) => ({ ...current, job: { ...current.job, saved: !current.job.saved } })) } catch { setMessage('Could not update the saved job.') } finally { setAction('') } }
    const analyze = async () => { setAction('analyze'); setMessage(''); try { const result = await analyzeJob(id); setState((current) => ({ ...current, analysis: result.analysis })) } catch (error) { setMessage(error.response?.data?.code === 'PROFILE_REQUIRED' ? 'Add a resume or self-description to an interview plan before analyzing your match.' : 'Match analysis failed. Please try again.') } finally { setAction('') } }
    const prepare = async () => { setAction('prepare'); setMessage(''); try { const result = await prepareJob(id); navigate(`/interviews/${result.interviewReport._id}`) } catch (error) { if (error.response?.data?.code === 'PROFILE_REQUIRED') navigate('/interviews/create', { state: { jobDescription: state.job.description } }); else setMessage('Could not create the interview plan.') } finally { setAction('') } }
    if (state.loading) return <div className='jobs-page'><AppHeader /><main className='job-detail'><div className='job-detail-skeleton'><span /><span /><div><span /><span /></div></div></main></div>
    if (state.error) return <div className='jobs-page'><AppHeader /><main className='jobs-state'><h1>{state.error}</h1><Link className='job-button' to='/jobs'>Back to jobs</Link></main></div>
    const { job, analysis } = state
    const hasSalary = (job.salary?.min ?? job.salaryMin) != null || (job.salary?.max ?? job.salaryMax) != null
    return <div className='jobs-page'><AppHeader /><main className='job-detail'>
        <Link className='job-detail__back' to='/jobs'>← Back to jobs</Link>
        <header className='job-detail__hero'><div><p className='jobs-eyebrow'>{job.company}</p><h1>{job.title}</h1><p className='job-detail__location'>{locationText(job)}{job.remoteType ? ` · ${readable(job.remoteType)}` : ''}</p>{job.postedAt && <p className='job-detail__posted'>Posted {new Date(job.postedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>}</div><div className='job-detail__actions'><button className='job-button job-button--quiet' disabled={action === 'save'} onClick={toggleSave}>{job.saved ? 'Saved ✓' : 'Save job'}</button>{job.applyUrl && <a className='job-button job-button--apply' href={job.applyUrl} target='_blank' rel='noopener noreferrer'>Apply on company/job site ↗</a>}<button className='job-button' disabled={action === 'prepare'} onClick={prepare}>{action === 'prepare' ? 'Preparing…' : 'Prepare interview →'}</button></div></header>
        <section className='job-summary' aria-label='Job summary'><div><span>Employment</span><strong>{job.employmentType ? readable(job.employmentType) : 'Not provided'}</strong></div><div><span>Experience</span><strong>{experienceText(job.experience)}</strong>{job.experience?.source === 'description' && <small>From job description</small>}</div><div><span>Seniority</span><strong>{job.seniority ? readable(job.seniority) : 'Not provided'}</strong></div>{hasSalary && <div><span>Salary</span><strong>{salaryText(job)}</strong></div>}</section>
        <div className='job-detail__grid'><article className='job-detail__content'>{job.skills?.length > 0 && <section><p className='jobs-eyebrow'>Technical skills</p><div className='job-skills'>{job.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></section>}<JobDescription description={job.description} title={job.title} company={job.company} />{job.responsibilities?.length > 0 && !job.derivedFields?.includes('responsibilities') && <DetailList title='Responsibilities' values={job.responsibilities} />}{job.requirements?.length > 0 && !job.derivedFields?.includes('requirements') && <DetailList title='Requirements' values={job.requirements} />}{job.qualifications?.length > 0 && !job.derivedFields?.includes('qualifications') && <DetailList title='Qualifications' values={job.qualifications} />}{job.benefits?.length > 0 && !job.derivedFields?.includes('benefits') && <DetailList title='Benefits' values={job.benefits} />}{job.niceToHaveSkills?.length > 0 && <DetailList title='Nice-to-have skills' values={job.niceToHaveSkills} />}{job.educationRequirements?.length > 0 && <DetailList title='Education requirements' values={job.educationRequirements} />}</article>
            <aside className='job-analysis'><p className='jobs-eyebrow'>AI analysis</p>{analysis ? <><div className='job-analysis__score'><strong>{analysis.matchScore}%</strong><span>AI match</span></div><AnalysisList title='Your strengths' values={analysis.strengths} tone='good' /><AnalysisList title='Skill gaps' values={analysis.skillGaps} tone='warn' /><AnalysisList title='Recommended preparation' values={analysis.interviewTopics} numbered /><AnalysisList title='Expected interview' values={analysis.likelyRounds} numbered /><p className='job-analysis__difficulty'>Expected difficulty <strong>{analysis.difficulty}/10</strong></p><button className='job-button' disabled={action === 'prepare'} onClick={prepare}>Generate interview plan →</button></> : <><h2>How well do you match?</h2><p>Compare this role with the candidate information from your latest interview plan.</p><button className='job-button' disabled={action === 'analyze'} onClick={analyze}>{action === 'analyze' ? 'Analyzing your fit…' : 'Analyze my match'}</button></>}{message && <p className='jobs-action-message' role='alert'>{message}</p>}</aside>
        </div>
    </main></div>
}

const AnalysisList = ({ title, values = [], tone, numbered }) => values.length > 0 && <section className={`job-analysis__list ${tone || ''}`}><h3>{title}</h3>{numbered ? <ol>{values.map((value) => <li key={value}>{value}</li>)}</ol> : <ul>{values.map((value) => <li key={value}>{tone === 'good' ? '✓' : '⚠'} {value}</li>)}</ul>}</section>
const DetailList = ({ title, values = [] }) => <section><h2>{title}</h2>{values.length ? <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p>Not provided by the employer</p>}</section>
export default JobDetails
