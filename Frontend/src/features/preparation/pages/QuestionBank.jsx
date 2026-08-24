import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import { getQuestionBank, removeQuestion } from '../services/preparation.api'
import '../style/preparation.scss'

const QuestionBank = () => {
    const navigate = useNavigate()
    const [ questions, setQuestions ] = useState([]), [ loading, setLoading ] = useState(true), [ error, setError ] = useState('')
    const [ search, setSearch ] = useState(''), [ category, setCategory ] = useState('all'), [ sort, setSort ] = useState('newest')
    const load = useCallback(async () => { setLoading(true); setError(''); try { setQuestions((await getQuestionBank({ search, category, sort })).questions) } catch (e) { setError(e.response?.data?.message || 'Unable to load your question bank.') } finally { setLoading(false) } }, [ search, category, sort ])
    useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id) }, [ load ])
    const remove = async (id) => { try { await removeQuestion(id); setQuestions((items) => items.filter((item) => item._id !== id)) } catch (e) { setError(e.response?.data?.message || 'Unable to remove question.') } }
    return <div className='prep-page'><AppHeader/><main className='prep-main'>
        <header className='prep-heading'><p>Personal library</p><h1>My question bank</h1><span>{questions.length} saved question{questions.length === 1 ? '' : 's'}. Revisit difficult questions and turn them into focused timed practice.</span></header>
        <section className='prep-card prep-controls'><div className='prep-field'><label htmlFor='bank-search'>Search</label><input id='bank-search' value={search} onChange={(e)=>setSearch(e.target.value)} placeholder='Search questions or topics'/></div><div className='prep-field'><label htmlFor='bank-category'>Category</label><select id='bank-category' value={category} onChange={(e)=>setCategory(e.target.value)}>{['all','technical','behavioral','system-design','project','hr'].map(x=><option key={x} value={x}>{x}</option>)}</select></div><div className='prep-field'><label htmlFor='bank-sort'>Sort</label><select id='bank-sort' value={sort} onChange={(e)=>setSort(e.target.value)}><option value='newest'>Newest</option><option value='oldest'>Oldest</option><option value='question'>Question A–Z</option></select></div></section>
        {error && <div className='prep-error' role='alert'>{error} <button className='prep-secondary' onClick={load}>Retry</button></div>}
        {loading ? <div className='prep-state'>Opening your question library...</div> : questions.length === 0 ? <div className='prep-card prep-state'><h2>No saved questions yet</h2><p>Save questions while reviewing an interview plan, then practice them here.</p><button className='prep-primary' onClick={()=>navigate('/interviews')}>Browse interview questions</button></div> : <section className='prep-list'>{questions.map((q,index)=><article className='prep-card prep-question' key={q._id}><span className='prep-question__number'>{String(index+1).padStart(2,'0')}</span><div><h2>{q.questionText}</h2><div className='prep-meta'><span>{q.category}</span><span>· {q.topic}</span><span>· {q.difficulty}</span><span>· {q.source}</span><span>· Saved {new Date(q.createdAt).toLocaleDateString()}</span></div>{q.personalAnswer&&<details className='bank-answer'><summary>Your saved answer {q.evaluationSnapshot?.score!=null&&`· ${q.evaluationSnapshot.score}%`}</summary><h3>Your answer</h3><p>{q.personalAnswer}</p>{q.evaluationSnapshot?.feedback&&<><h3>Feedback</h3><p>{q.evaluationSnapshot.feedback}</p></>}</details>}</div><div className='prep-actions'><button className='prep-primary' onClick={()=>navigate('/focused-practice')}>Technical questions</button><button className='prep-secondary' onClick={()=>remove(q._id)}>Remove</button></div></article>)}</section>}
    </main></div>
}
export default QuestionBank
