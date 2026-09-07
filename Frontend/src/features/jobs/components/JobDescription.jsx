import { useMemo } from 'react'
import { normalizeJobDescription } from '../utils/normalizeJobDescription'

const SafeContent = ({ html }) => <div className='job-description' dangerouslySetInnerHTML={{ __html: html }} />

const JobDescription = ({ description, title, company }) => {
    const content = useMemo(() => normalizeJobDescription(description, { title, company }), [ description, title, company ])
    if (!content.roleHtml && !content.companyHtml) return <section><h2>About the role</h2><p>Full job description is not available.</p></section>
    return <>
        {content.roleHtml && <section><h2>About the role</h2><SafeContent html={content.roleHtml} /></section>}
        {content.companyHtml && <section><h2>About the company</h2><SafeContent html={content.companyHtml} /></section>}
    </>
}

export default JobDescription
