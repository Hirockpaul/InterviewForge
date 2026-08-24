import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import { useTimer } from '../../preparation/hooks/useTimer'
import { getFocusedSession, submitFocusedAnswer } from '../services/focusedPractice.api'
import '../../preparation/style/preparation.scss'
import '../style/focused-practice.scss'

const QuestionRunner=({session,onSubmit,busy})=>{const question=session.currentQuestion,[answer,setAnswer]=useState(''),initial=question.remainingSeconds
const expire=useCallback(()=>onSubmit({questionId:question._id,answer,submittedAutomatically:true}),[answer,onSubmit,question._id])
const {remaining,progress,start}=useTimer({duration:initial,onComplete:expire})
useEffect(()=>{start()},[start])
return <><section className='focused-progress'><div><span>Question {session.currentQuestionIndex+1} of 24</span><strong>{Math.round(session.currentQuestionIndex/24*100)}%</strong></div><div><span style={{width:`${session.currentQuestionIndex/24*100}%`}}/></div></section><section className='timer focused-timer' aria-live='polite'><span>Time remaining</span><strong>{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</strong><div className='timer__track'><span style={{width:`${progress}%`}}/></div></section><section className='prep-card focused-question'><div className='prep-meta'><span>{question.difficulty}</span><span>· {question.category}</span><span>· {question.canonicalTopic}</span></div><h1>{question.question}</h1><div className='prep-field'><label htmlFor='focused-answer'>Your answer</label><textarea id='focused-answer' value={answer} onChange={e=>setAnswer(e.target.value)} autoFocus placeholder='Answer clearly and support your reasoning...'/></div><button className='prep-primary' disabled={busy||answer.trim().length===0} onClick={()=>onSubmit({questionId:question._id,answer,submittedAutomatically:false})}>{busy?'Saving answer...':'Submit answer'}</button></section></>}

const FocusedPracticeSession=()=>{const{id}=useParams(),navigate=useNavigate(),[session,setSession]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('')
const load=useCallback(()=>{setLoading(true);getFocusedSession(id).then(({session:s})=>{if(s.status==='completed')navigate(`/focused-practice/${id}/report`,{replace:true});else setSession(s)}).catch(e=>setError(e.response?.data?.message||'Unable to restore this session.')).finally(()=>setLoading(false))},[id,navigate])
useEffect(()=>{getFocusedSession(id).then(({session:s})=>{if(s.status==='completed')navigate(`/focused-practice/${id}/report`,{replace:true});else setSession(s)}).catch(e=>setError(e.response?.data?.message||'Unable to restore this session.')).finally(()=>setLoading(false))},[id,navigate])
const submit=useCallback(async(payload)=>{if(busy)return;setBusy(true);setError('');try{const{session:s}=await submitFocusedAnswer(id,payload);if(s.status==='completed')navigate(`/focused-practice/${id}/report`);else setSession(s)}catch(e){setError(e.response?.data?.message||'Unable to save this answer.');if(e.response?.status===409)load()}finally{setBusy(false)}},[busy,id,load,navigate])
return <div className='prep-page focused-session-page'><AppHeader/><main className='prep-main'>{loading?<div className='prep-state'>Preparing your technical questions...</div>:error&&!session?<div className='prep-card prep-state'><h1>Session unavailable</h1><p>{error}</p><button className='prep-secondary' onClick={load}>Retry</button></div>:session?<><header className='prep-heading'><p>Technical practice · {session.mode}</p><h2>{session.displayTopic}</h2></header>{error&&<div className='prep-error'>{error}</div>}<QuestionRunner key={session.currentQuestion?._id} session={session} onSubmit={submit} busy={busy}/></>:null}</main></div>}
export default FocusedPracticeSession
