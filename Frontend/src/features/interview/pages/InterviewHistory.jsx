import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import { useInterview } from '../hooks/useInterview'
import { startMockInterview } from '../../mockInterview/services/mockInterview.api'
import '../style/history.scss'

const InterviewHistory = () => {
    const navigate = useNavigate()
    const { loading, error, reports, removeReport, getResumePdf } = useInterview()
    const [ search, setSearch ] = useState('')
    const [ deletingId, setDeletingId ] = useState('')
    const [ startingId, setStartingId ] = useState('')
    const [ actionError, setActionError ] = useState('')

    const filteredReports = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return reports
        return reports.filter((report) => report.title?.toLowerCase().includes(query))
    }, [ reports, search ])

    const deleteReport = async (report) => {
        const confirmed = window.confirm(`Delete "${report.title || 'Untitled position'}"? This cannot be undone.`)
        if (!confirmed) return

        setDeletingId(report._id)
        setActionError('')
        try {
            await removeReport(report._id)
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || 'Unable to delete this interview plan.')
        } finally {
            setDeletingId('')
        }
    }

    const startMock = async (reportId) => {
        setStartingId(reportId)
        setActionError('')
        try {
            const data = await startMockInterview(reportId)
            navigate(`/mock-interview/${data.mockInterview._id}`)
        } catch (requestError) {
            setActionError(requestError.response?.data?.message || 'Unable to start a mock interview.')
        } finally {
            setStartingId('')
        }
    }

    return (
        <div className='history-page'>
            <AppHeader />
            <main className='history-main'>
                <header className='history-heading'>
                    <div>
                        <p>Your preparation library</p>
                        <h1>Interview history</h1>
                        <span>Review and manage every strategy generated for your target roles.</span>
                    </div>
                    <button type='button' onClick={() => navigate('/interviews/create')}>Create interview plan <span aria-hidden='true'>&rarr;</span></button>
                </header>

                <div className='history-toolbar'>
                    <label htmlFor='plan-search'>Search plans</label>
                    <input id='plan-search' type='search' value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search by job title...' />
                </div>

                {(error || actionError) && <p className='history-error' role='alert'>{actionError || error}</p>}

                {loading ? (
                    <div className='history-state'>Loading your interview plans...</div>
                ) : filteredReports.length > 0 ? (
                    <ul className='history-list'>
                        {filteredReports.map((report) => (
                            <li key={report._id} className='history-card'>
                                <div>
                                    <span className='history-card__score'>{report.matchScore}% match</span>
                                    <h2>{report.title || 'Untitled position'}</h2>
                                    <p>Generated {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                <div className='history-card__actions'>
                                    <button type='button' className='history-card__mock' onClick={() => startMock(report._id)} disabled={startingId === report._id}>
                                        {startingId === report._id ? 'Starting...' : 'Start mock interview'}
                                    </button>
                                    <button type='button' onClick={() => navigate(`/interviews/${report._id}`)}>Open plan</button>
                                    <button type='button' onClick={() => getResumePdf(report._id)}>Download resume</button>
                                    <button type='button' className='history-card__delete' onClick={() => deleteReport(report)} disabled={deletingId === report._id}>{deletingId === report._id ? 'Deleting...' : 'Delete'}</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className='history-state'>
                        <h2>{search ? 'No matching plans' : 'No interview plans yet'}</h2>
                        <p>{search ? 'Try a different job title.' : 'Create a plan for the next role you are targeting.'}</p>
                    </div>
                )}
            </main>
        </div>
    )
}

export default InterviewHistory
