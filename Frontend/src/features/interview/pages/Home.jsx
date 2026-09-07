import { useState, useRef } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useLocation, useNavigate } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader.jsx'

const Home = () => {

    const { loading, generateReport,reports } = useInterview()
    const location = useLocation()
    const [ jobDescription, setJobDescription ] = useState(location.state?.jobDescription || "")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ resumeFile, setResumeFile ] = useState(null)
    const [ resumeError, setResumeError ] = useState("")
    const [ generationError, setGenerationError ] = useState("")
    const [ generating, setGenerating ] = useState(false)
    const [ isDraggingResume, setIsDraggingResume ] = useState(false)
    const resumeInputRef = useRef()

    const navigate = useNavigate()

    const selectResume = (file) => {
        if (!file) return

        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")

        if (!isPdf) {
            setResumeFile(null)
            setResumeError("Please upload a PDF file.")
            if (resumeInputRef.current) resumeInputRef.current.value = ""
            return
        }

        if (file.size > 3 * 1024 * 1024) {
            setResumeFile(null)
            setResumeError("Resume must be 3MB or smaller.")
            if (resumeInputRef.current) resumeInputRef.current.value = ""
            return
        }

        setResumeFile(file)
        setResumeError("")
    }

    const handleResumeDrop = (event) => {
        event.preventDefault()
        setIsDraggingResume(false)
        selectResume(event.dataTransfer.files[0])
    }

    const handleGenerateReport = async () => {
        setGenerationError("")

        if (!jobDescription.trim()) {
            setGenerationError("Please add the target job description.")
            return
        }

        if (!resumeFile && !selfDescription.trim()) {
            setResumeError("Upload a resume or add a self-description.")
            return
        }

        try {
            setGenerating(true)
            const data = await generateReport({ jobDescription, selfDescription, resumeFile })
            navigate(`/interviews/${data._id}`)
        } catch (error) {
            setGenerationError(error.message)
        } finally {
            setGenerating(false)
        }
    }

    if (loading && !generating) {
        return (
            <main className='loading-screen'>
                <h1>Loading your interview plan...</h1>
            </main>
        )
    }

    return (
        <div className='home-page'>

            <AppHeader />

            {/* Page Header */}
            <header className='page-header'>
                <p className='page-header__eyebrow'>Personalized preparation</p>
                <h1>Create your custom<br /><span>interview plan.</span></h1>
                <p>Let AI turn your target role and experience into a focused strategy built around you.</p>
            </header>

            {/* Main Card */}
            <div className='interview-card'>
                <div className='interview-card__body' aria-busy={generating}>

                    {/* Left Panel - Job Description */}
                    <div className='panel panel--left'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                            </span>
                            <h2>Target Job Description</h2>
                            <span className='badge badge--required'>Required</span>
                        </div>
                        <textarea
                            onChange={(e) => { setJobDescription(e.target.value) }}
                            value={jobDescription}
                            className='panel__textarea'
                            placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
                            maxLength={5000}
                        />
                        <div className='char-counter'>{jobDescription.length} / 5000 chars</div>
                    </div>

                    {/* Vertical Divider */}
                    <div className='panel-divider' />

                    {/* Right Panel - Profile */}
                    <div className='panel panel--right'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </span>
                            <h2>Your Profile</h2>
                        </div>

                        {/* Upload Resume */}
                        <div className='upload-section'>
                            <label className='section-label'>
                                Upload Resume
                                <span className='badge badge--best'>Best Results</span>
                            </label>
                            <div
                                className={`dropzone${isDraggingResume ? " dropzone--dragging" : ""}${resumeFile ? " dropzone--success" : ""}${resumeError ? " dropzone--error" : ""}`}
                                role='button'
                                tabIndex={0}
                                onClick={() => resumeInputRef.current?.click()}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault()
                                        resumeInputRef.current?.click()
                                    }
                                }}
                                onDragEnter={(event) => {
                                    event.preventDefault()
                                    setIsDraggingResume(true)
                                }}
                                onDragOver={(event) => event.preventDefault()}
                                onDragLeave={(event) => {
                                    event.preventDefault()
                                    if (!event.currentTarget.contains(event.relatedTarget)) setIsDraggingResume(false)
                                }}
                                onDrop={handleResumeDrop}
                            >
                                <span className='dropzone__icon'>
                                    {resumeFile ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m8 12 2.5 2.5L16 9" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                                    )}
                                </span>
                                <p className='dropzone__title'>{resumeFile ? "Resume ready" : isDraggingResume ? "Drop your resume here" : "Click to upload or drag & drop"}</p>
                                <p className='dropzone__subtitle'>{resumeFile ? `${resumeFile.name} · ${(resumeFile.size / 1024 / 1024).toFixed(2)}MB` : "PDF only (Max 3MB)"}</p>
                                <input ref={resumeInputRef} hidden type='file' id='resume' name='resume' accept='application/pdf,.pdf' onChange={(event) => selectResume(event.target.files[0])} />
                            </div>
                            {resumeError && <p className='upload-error' role='alert'>{resumeError}</p>}
                        </div>

                        {/* OR Divider */}
                        <div className='or-divider'><span>OR</span></div>

                        {/* Quick Self-Description */}
                        <div className='self-description'>
                            <label className='section-label' htmlFor='selfDescription'>Quick Self-Description</label>
                            <textarea
                                onChange={(e) => { setSelfDescription(e.target.value) }}
                                value={selfDescription}
                                id='selfDescription'
                                name='selfDescription'
                                className='panel__textarea panel__textarea--short'
                                placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                            />
                        </div>

                        {/* Info Box */}
                        <div className='info-box'>
                            <span className='info-box__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" stroke="#1a1f27" strokeWidth="2" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#1a1f27" strokeWidth="2" /></svg>
                            </span>
                            <p>Either a <strong>Resume</strong> or a <strong>Self Description</strong> is required to generate a personalized plan.</p>
                        </div>
                    </div>
                </div>

                {/* Card Footer */}
                <div className='interview-card__footer'>
                    <span className='footer-info'>
                        <strong>AI-powered strategy generation</strong>
                        Approx. 30 seconds
                    </span>
                    <button
                        onClick={handleGenerateReport}
                        className='generate-btn'
                        disabled={generating}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                        {generating ? 'Generating your strategy…' : 'Generate My Interview Strategy'}
                    </button>
                </div>
                {generationError && <p className='generation-error' role='alert'>{generationError}</p>}
            </div>

            {/* Recent Reports List */}
            <section className='recent-reports'>
                <div className='recent-reports__header'>
                    <p>Continue preparing</p>
                    <h2>Your recent plans</h2>
                </div>
                {reports.length > 0 ? (
                    <ul className='reports-list'>
                        {reports.map(report => (
                            <li key={report._id}>
                                <button className='report-item' type='button' onClick={() => navigate(`/interviews/${report._id}`)}>
                                    <span className='report-item__topline'>
                                        <h3>{report.title || 'Untitled Position'}</h3>
                                        <span className='match-score'>{report.matchScore}% match</span>
                                    </span>
                                    <span className='report-meta'>Generated {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <span className='report-link'>View interview plan <span aria-hidden='true'>&rarr;</span></span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className='reports-empty'>
                        <h3>No interview plans yet</h3>
                        <p>Your personalized strategies will appear here after you generate your first plan.</p>
                        <button type='button' onClick={() => document.querySelector('.interview-card')?.scrollIntoView({ behavior: 'smooth' })}>Create interview plan</button>
                    </div>
                )}
            </section>

            {/* Page Footer */}
            <footer className='page-footer'>
                <a href='#'>Privacy Policy</a>
                <a href='#'>Terms of Service</a>
                <a href='#'>Help Center</a>
            </footer>
        </div>
    )
}

export default Home
