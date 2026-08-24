import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import TopicCard from '../components/TopicCard'
import { getCodingTopics } from '../services/coding.api'
import '../styles/coding-practice.scss'

const CodingPractice = () => {
    const [ data, setData ] = useState({ topics: [], recommended: [] })
    const [ error, setError ] = useState('')

    useEffect(() => {
        let active = true
        getCodingTopics()
            .then((result) => { if (active) setData(result) })
            .catch(() => { if (active) setError('Coding topics could not be loaded. Please try again.') })
        return () => { active = false }
    }, [])

    const recommended = data.recommended.map((id) => data.topics.find((topic) => topic.id === id)).filter(Boolean)

    return (
        <div className='coding-page'>
            <AppHeader />
            <main className='coding-practice-main'>
                <header className='coding-practice-hero'>
                    <p>Interview-ready algorithms</p>
                    <h1>Coding Practice</h1>
                    <span>Choose a topic and work through focused, AI-created interview problems.</span>
                    <Link to='/coding-practice/workspace'>Open free workspace <span aria-hidden='true'>&rarr;</span></Link>
                </header>

                {error && <div className='coding-notice coding-notice--error'>{error}</div>}
                {!error && !data.topics.length && <div className='coding-notice'>Loading coding topics...</div>}

                {recommended.length > 0 && (
                    <section className='coding-recommended'>
                        <div><p>Recommended for you</p><h2>Start with the fundamentals</h2></div>
                        <div>{recommended.map((topic) => <Link key={topic.id} to={`/coding-practice/${topic.slug}`}>{topic.displayName}</Link>)}</div>
                    </section>
                )}

                {data.topics.length > 0 && (
                    <section className='coding-topics' aria-labelledby='coding-topics-title'>
                        <div className='coding-section-title'><p>Choose a topic</p><h2 id='coding-topics-title'>Build one skill at a time</h2></div>
                        <div className='coding-topic-grid'>{data.topics.map((topic) => <TopicCard key={topic.id} topic={topic} />)}</div>
                    </section>
                )}
            </main>
        </div>
    )
}

export default CodingPractice
