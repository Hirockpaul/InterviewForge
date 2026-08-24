import { useCallback, useContext, useEffect } from 'react'
import { useParams } from 'react-router'
import InterviewContext from '../interview-context'
import {
    deleteInterviewReport,
    generateInterviewReport,
    generateResumePdf,
    getAllInterviewReports,
    getInterviewReportById
} from '../services/interview.api'

export const useInterview = () => {
    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error('useInterview must be used within an InterviewProvider')
    }

    const { loading, setLoading, report, setReport, reports, setReports, error, setError } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        setError('')
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (requestError) {
            const message = requestError.response?.data?.message || 'Failed to generate interview strategy. Please try again.'
            throw new Error(message, { cause: requestError })
        } finally {
            setLoading(false)
        }
    }

    const getReportById = useCallback(async (id) => {
        setLoading(true)
        setError('')
        try {
            const response = await getInterviewReportById(id)
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (requestError) {
            setReport(null)
            setError(requestError.response?.data?.message || 'Unable to load this interview plan.')
            return null
        } finally {
            setLoading(false)
        }
    }, [ setError, setLoading, setReport ])

    const getReports = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const response = await getAllInterviewReports()
            setReports(response.interviewReports)
            return response.interviewReports
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to load your interview plans.')
            return []
        } finally {
            setLoading(false)
        }
    }, [ setError, setLoading, setReports ])

    const removeReport = async (id) => {
        await deleteInterviewReport(id)
        setReports((currentReports) => currentReports.filter((item) => item._id !== id))
    }

    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        setError('')
        try {
            const response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([ response ], { type: 'application/pdf' }))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Unable to generate your resume PDF.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
    }, [ interviewId, getReportById, getReports ])

    return { loading, error, report, reports, generateReport, getReportById, getReports, removeReport, getResumePdf }
}
