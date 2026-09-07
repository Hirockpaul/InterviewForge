import { Link } from 'react-router'

const money = (value, currency) => {
    if (value == null) return ''
    try { return new Intl.NumberFormat(undefined, { style: currency ? 'currency' : 'decimal', currency: currency || undefined, maximumFractionDigits: 0 }).format(value) }
    catch { return `${currency || ''} ${Number(value).toLocaleString()}`.trim() }
}
const relativeDate = (value) => {
    if (!value) return 'Date not listed'
    const hours = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 3600000))
    return hours < 24 ? `Posted ${hours} hour${hours === 1 ? '' : 's'} ago` : `Posted ${Math.round(hours / 24)} days ago`
}
const sourceLabel = (source) => ({ jobdatalake: 'JobDataLake', jsearch: 'JSearch', adzuna: 'Adzuna' }[source] || source || 'Not listed')

const JobCard = ({ job, onPrepare, onSave, savedAt, onRemove }) => {
    const salary = job.salaryMin || job.salaryMax ? [ money(job.salaryMin, job.salaryCurrency), money(job.salaryMax, job.salaryCurrency) ].filter(Boolean).join(' – ') : ''
    return <article className='job-card'>
        <div className='job-card__top'><div><h2>{job.title}</h2><p className='job-card__company'>{job.company}</p></div><div className='job-card__signals'>{job.matchScore != null ? <span className='job-card__match'><strong>{job.matchScore}%</strong> AI match</span> : <Link className='job-card__analyze' to={`/jobs/${job._id}`}>Analyze match</Link>}{onSave && <button className={`job-save ${job.saved ? 'is-saved' : ''}`} type='button' aria-label={job.saved ? 'Remove from saved jobs' : 'Save job'} title={job.saved ? 'Saved' : 'Save job'} onClick={() => onSave(job)}>{job.saved ? '♥' : '♡'}</button>}</div></div>
        <div className='job-card__location'><span>{job.location?.display || job.locations?.[0] || 'Location not provided'}</span>{job.remoteType && <span className='job-card__arrangement'>{job.remoteType}</span>}</div>
        <div className='job-card__facts'>{salary && <span>{salary}</span>}{job.employmentType && <span>{job.employmentType}</span>}{job.seniority && <span>{job.seniority}</span>}</div>
        {job.skills?.length > 0 && <div className='job-skills'>{job.skills.slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}</div>}
        <div className='job-card__footer'><div className='job-card__provenance'><span className='job-card__posted'>{relativeDate(job.postedAt)}</span><span>Source: {sourceLabel(job.source)}</span>{savedAt && <span className='job-card__saved'>Saved {new Date(savedAt).toLocaleDateString()} <button type='button' onClick={onRemove}>Remove</button></span>}</div><div><Link className='job-button job-button--quiet' to={`/jobs/${job._id}`}>View job</Link><button className='job-button' type='button' onClick={() => onPrepare(job)}>Prepare interview <span aria-hidden='true'>→</span></button></div></div>
    </article>
}

export default JobCard
