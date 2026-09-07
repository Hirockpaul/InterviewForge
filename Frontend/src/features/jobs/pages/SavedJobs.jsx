import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import JobCard from '../components/JobCard'
import { getSavedJobs, prepareJob, unsaveJob } from '../services/jobs.api'
import '../style/jobs.scss'

const SavedJobs = () => {
    const navigate = useNavigate()
    const [ jobs, setJobs ] = useState([])
    const [ loading, setLoading ] = useState(true)
    const [ error, setError ] = useState('')
    useEffect(() => { const controller = new AbortController(); getSavedJobs(controller.signal).then((data) => setJobs(data.jobs)).catch((requestError) => { if (requestError.code !== 'ERR_CANCELED') setError('Saved jobs could not be loaded.') }).finally(() => setLoading(false)); return () => controller.abort() }, [])
    const prepare = async (job) => { try { const data = await prepareJob(job._id); navigate(`/interviews/${data.interviewReport._id}`) } catch { navigate(`/jobs/${job._id}`) } }
    const remove = async (job) => { try { await unsaveJob(job._id); setJobs((current) => current.filter((item) => item._id !== job._id)) } catch { setError('Could not remove that saved job.') } }
    return <div className='jobs-page'><AppHeader /><main className='jobs-main jobs-library'><header className='jobs-page-heading'><p className='jobs-eyebrow'>Career workspace</p><h1>Saved jobs</h1><p>Keep promising roles together and move from discovery to focused preparation.</p></header>{error && <p className='jobs-notice jobs-notice--error'>{error}</p>}{loading ? <div className='jobs-skeleton-list'><span /><span /><span /></div> : jobs.length ? <div className='jobs-list'>{jobs.map((job) => <JobCard key={job._id} job={job} onPrepare={prepare} savedAt={job.savedAt} onRemove={() => remove(job)} />)}</div> : <div className='jobs-state'><h2>No saved jobs yet</h2><p>Save jobs while searching and they’ll appear here.</p><Link className='job-button' to='/jobs'>Browse jobs</Link></div>}</main></div>
}
export default SavedJobs
