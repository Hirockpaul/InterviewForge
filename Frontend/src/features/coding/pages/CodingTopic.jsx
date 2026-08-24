import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import DifficultyFilter from '../components/DifficultyFilter'
import ProblemCard from '../components/ProblemCard'
import { generateCodingProblems, getCodingProblems, getCodingTopics } from '../services/coding.api'
import '../styles/coding-practice.scss'

const CodingTopic = () => {
    const { topic: topicSlug } = useParams()
    const [ topic, setTopic ] = useState(null)
    const [ difficulty, setDifficulty ] = useState('all')
    const [ search, setSearch ] = useState('')
    const [ problems, setProblems ] = useState([])
    const [ isLoading, setIsLoading ] = useState(true)
    const [ isGenerating, setIsGenerating ] = useState(false)
    const [ error, setError ] = useState('')

    useEffect(() => {
        getCodingTopics().then((data) => setTopic(data.topics.find((item) => item.slug === topicSlug) || false)).catch(() => setTopic(false))
    }, [topicSlug])

    const query = useMemo(() => ({
        topic: topicSlug,
        ...(difficulty !== 'all' ? { difficulty } : {}),
        ...(search.trim() ? { search: search.trim() } : {})
    }), [topicSlug, difficulty, search])

    const loadProblems = useCallback(async () => {
        setIsLoading(true)
        setError('')
        try {
            const data = await getCodingProblems(query)
            setProblems(data.problems)
        } catch {
            setError('Coding problems could not be loaded. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }, [query])

    useEffect(() => {
        const timer = setTimeout(loadProblems, search ? 300 : 0)
        return () => clearTimeout(timer)
    }, [loadProblems, search])

    const generate = async () => {
        if (isGenerating) return
        setIsGenerating(true)
        setError('')
        try {
            await generateCodingProblems({ topic: topicSlug, difficulty: difficulty === 'all' ? 'easy' : difficulty })
            await loadProblems()
        } catch {
            setError('Unable to generate new questions right now. Please try again.')
        } finally {
            setIsGenerating(false)
        }
    }

    if (topic === false) return <div className='coding-page'><AppHeader /><main className='coding-practice-main'><div className='coding-notice coding-notice--error'>Coding topic not found. <Link to='/coding-practice'>Browse topics</Link></div></main></div>

    return (
        <div className='coding-page'>
            <AppHeader />
            <main className='coding-practice-main'>
                <header className='coding-topic-heading'>
                    <Link to='/coding-practice'>&larr; All topics</Link>
                    <h1>{topic?.displayName || 'Coding problems'}</h1>
                    <p>{topic?.shortDescription || 'Loading topic...'}</p>
                    {topic && <div className='coding-topic-counts'><span>Easy: {topic.counts.easy}</span><span>Medium: {topic.counts.medium}</span><span>Hard: {topic.counts.hard}</span></div>}
                </header>

                <section className='coding-problem-controls'>
                    <DifficultyFilter value={difficulty} onChange={setDifficulty} />
                    <label><span className='sr-only'>Search problems</span><input type='search' value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search problems...' /></label>
                </section>

                {error && <div className='coding-notice coding-notice--error'>{error}</div>}
                {isLoading ? <div className='coding-notice'>Loading problems...</div> : problems.length > 0 ? (
                    <div className='coding-problem-grid'>{problems.map((problem) => <ProblemCard key={problem._id} problem={problem} />)}</div>
                ) : (
                    <div className='coding-empty'>
                        <h2>No {difficulty === 'all' ? '' : `${difficulty[0].toUpperCase() + difficulty.slice(1)} `}{topic?.displayName} problems available yet.</h2>
                        <p>Ask the AI problem designer to prepare a focused set for this topic.</p>
                        <button type='button' onClick={generate} disabled={isGenerating}>{isGenerating ? 'Preparing more questions...' : 'Generate Problems'}</button>
                    </div>
                )}
            </main>
        </div>
    )
}

export default CodingTopic
