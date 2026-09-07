import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import JobCard from '../components/JobCard'
import { prepareJob, saveJob, searchJobs, unsaveJob } from '../services/jobs.api'
import '../style/jobs.scss'

const indianLocations = [ 'All India', 'Bengaluru', 'Hyderabad', 'Mumbai', 'Delhi', 'New Delhi', 'Pune', 'Chennai', 'Kolkata', 'Gurugram', 'Noida', 'Ahmedabad', 'Jaipur', 'Chandigarh', 'Kochi', 'Indore', 'Coimbatore', 'Lucknow', 'Bhubaneswar', 'Visakhapatnam' ]
const initial = { q: '', location: 'All India', country: 'IN', remote: '', experience: '', employmentType: '', salaryMin: '', salaryMax: '', posted: '', sort: 'newest', page: 1, limit: 12 }

const Jobs = () => {
    const navigate = useNavigate()
    const [ draft, setDraft ] = useState(initial)
    const [ filters, setFilters ] = useState(initial)
    const [ data, setData ] = useState({ jobs: [], pagination: {}, metadata: {} })
    const [ loading, setLoading ] = useState(true)
    const [ error, setError ] = useState('')
    const [ filtersOpen, setFiltersOpen ] = useState(false)
    const [ preparing, setPreparing ] = useState('')
    const requestId = useRef(0)

    useEffect(() => {
        const controller = new AbortController(); const id = ++requestId.current
        searchJobs(Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')), controller.signal)
            .then((result) => { if (id === requestId.current) setData(result) })
            .catch((requestError) => { if (requestError.code !== 'ERR_CANCELED' && id === requestId.current) setError(requestError.response?.data?.message || 'Jobs are temporarily unavailable. Please try again.') })
            .finally(() => { if (id === requestId.current) setLoading(false) })
        return () => controller.abort()
    }, [ filters])

    const set = (name, value) => setDraft((current) => ({ ...current, [name]: value }))
    const load = (next) => { setLoading(true); setError(''); setFilters(next) }
    const apply = (event) => { event?.preventDefault(); load({ ...draft, page: 1 }) }
    const prepare = async (job) => {
        setPreparing(job._id)
        try { const result = await prepareJob(job._id); navigate(`/interviews/${result.interviewReport._id}`) }
        catch (requestError) { requestError.response?.data?.code === 'PROFILE_REQUIRED' ? navigate('/interviews/create', { state: { jobDescription: job.description || '' } }) : setError('Could not create the interview plan. Please try again.') }
        finally { setPreparing('') }
    }
    const toggleSave = async (job) => {
        try { job.saved ? await unsaveJob(job._id) : await saveJob(job._id); setData((current) => ({ ...current, jobs: current.jobs.map((item) => item._id === job._id ? { ...item, saved: !item.saved } : item) })) }
        catch { setError('Could not update the saved job. Please try again.') }
    }

    return <div className='jobs-page'><AppHeader /><main className='jobs-main'>
        <header className='jobs-hero'><p className='jobs-eyebrow'>Job search</p><h1>Find your next <span>opportunity.</span></h1><p>Search current roles, understand your fit, and prepare specifically for the interview.</p>
            <form className='jobs-search' onSubmit={apply}><label><span>Search</span><input value={draft.q} onChange={(e) => set('q', e.target.value)} placeholder='Search jobs, skills, companies' /></label><label><span>Location</span><input list='job-locations' value={draft.location} onChange={(e) => set('location', e.target.value)} placeholder={draft.country === 'IN' ? 'All India' : 'All locations'} /><datalist id='job-locations'>{(draft.country === 'IN' ? indianLocations : [ 'All locations', 'Remote' ]).map((place) => <option key={place} value={place} />)}</datalist></label><label className='jobs-search__country'><span>Country</span><select value={draft.country} onChange={(e) => { const country = e.target.value; setDraft((current) => ({ ...current, country, location: country === 'IN' ? 'All India' : 'All locations' })) }}><option value='IN'>India</option><option value='US'>United States</option><option value='GB'>United Kingdom</option><option value='CA'>Canada</option><option value='AU'>Australia</option><option value='SG'>Singapore</option></select></label><button type='submit'>Search</button></form>
        </header>
        <div className='jobs-toolbar'><button className='jobs-filter-toggle' type='button' onClick={() => setFiltersOpen((open) => !open)}>Filters</button><div><label htmlFor='job-sort'>Sort</label><select id='job-sort' value={draft.sort} onChange={(e) => { set('sort', e.target.value); load({ ...filters, sort: e.target.value, page: 1 }) }}><option value='newest'>Newest</option><option value='best-match'>Best match</option><option value='salary-desc'>Salary high → low</option><option value='salary-asc'>Salary low → high</option><option value='relevance'>Relevance</option></select></div></div>
        <div className='jobs-layout'>
            <aside className={`jobs-filters ${filtersOpen ? 'is-open' : ''}`}><div className='jobs-filters__heading'><h2>Filters</h2><button type='button' onClick={() => { setDraft(initial); load(initial) }}>Clear</button></div>
                <fieldset><legend>Work arrangement</legend>{[ [ 'remote', 'Remote' ], [ 'hybrid', 'Hybrid' ], [ 'on-site', 'On-site' ] ].map(([ value, label ]) => <label key={value}><input type='radio' name='remote' checked={draft.remote === value} onChange={() => set('remote', value)} />{label}</label>)}</fieldset>
                <fieldset><legend>Experience</legend>{[ 'entry', 'mid', 'senior' ].map((value) => <label key={value}><input type='radio' name='experience' checked={draft.experience === value} onChange={() => set('experience', value)} />{value[0].toUpperCase() + value.slice(1)}</label>)}</fieldset>
                <fieldset><legend>Employment</legend>{[ [ 'full-time', 'Full-time' ], [ 'part-time', 'Part-time' ], [ 'contract', 'Contract' ] ].map(([ value, label ]) => <label key={value}><input type='radio' name='employment' checked={draft.employmentType === value} onChange={() => set('employmentType', value)} />{label}</label>)}</fieldset>
                <fieldset><legend>Salary</legend><div className='jobs-salary'><label><span>Min</span><input type='number' min='0' value={draft.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} placeholder='₹ min' /></label><label><span>Max</span><input type='number' min='0' value={draft.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} placeholder='₹ max' /></label></div></fieldset>
                <fieldset><legend>Posted</legend>{[ [ 'today', 'Today' ], [ '3d', '3 days' ], [ '7d', '7 days' ], [ '30d', '30 days' ] ].map(([ value, label ]) => <label key={value}><input type='radio' name='posted' checked={draft.posted === value} onChange={() => set('posted', value)} />{label}</label>)}</fieldset>
                <button className='job-button jobs-apply-filters' type='button' onClick={apply}>Apply filters</button>
            </aside>
            <section className='jobs-results' aria-live='polite'><div className='jobs-results__heading'><div><h2>{data.pagination.total ?? 0} jobs found</h2>{data.metadata.lastUpdated && <p>Updated {new Date(data.metadata.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}</div></div>
                {data.metadata.partialFailure && <p className='jobs-notice'>Some job sources are temporarily unavailable. Showing available results.</p>}
                {error && <div className='jobs-state jobs-state--error'><h3>We couldn't load jobs</h3><p>{error}</p><button type='button' onClick={() => load({ ...filters })}>Try again</button></div>}
                {!error && !loading && data.jobs.length === 0 && <div className='jobs-state'><h3>No jobs found</h3><p>Try changing your search or filters.</p></div>}
                {!error && loading && <div className='jobs-skeleton-list' aria-label='Loading jobs'><span /><span /><span /></div>}
                {!error && !loading && <div className='jobs-list'>{data.jobs.map((job) => <JobCard key={job._id} job={job} onPrepare={prepare} onSave={toggleSave} />)}</div>}
                {preparing && <div className='jobs-preparing'>Creating your interview plan…</div>}
                {!loading && data.jobs.length > 0 && <nav className='jobs-pagination' aria-label='Job results pages'><button disabled={filters.page <= 1} onClick={() => load({ ...filters, page: filters.page - 1 })}>Previous</button><span>Page {filters.page}</span><button disabled={!data.pagination.hasNext} onClick={() => load({ ...filters, page: filters.page + 1 })}>Next</button></nav>}
            </section>
        </div>
    </main></div>
}

export default Jobs
