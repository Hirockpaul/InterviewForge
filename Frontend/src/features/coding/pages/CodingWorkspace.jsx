import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import AppHeader from '../../../components/layout/AppHeader'
import CodeEditor from '../components/CodeEditor'
import OutputPanel from '../components/OutputPanel'
import { LANGUAGES } from '../constants/languages'
import { getCodingProblem, runCode } from '../services/coding.api'
import '../styles/coding-workspace.scss'

const savedCodeKey = (problemId, language) => `interviewforge:code:${problemId || 'workspace'}:${language}`

const genericCode = () => Object.fromEntries(Object.entries(LANGUAGES).map(([ key, config ]) => [
    key, localStorage.getItem(savedCodeKey(null, key)) ?? config.starterCode
]))

const CodingWorkspace = () => {
    const { problemId } = useParams()
    const [ language, setLanguage ] = useState('javascript')
    const [ codeByLanguage, setCodeByLanguage ] = useState(genericCode)
    const [ problem, setProblem ] = useState(null)
    const [ problemError, setProblemError ] = useState(null)
    const [ result, setResult ] = useState(null)
    const [ isRunning, setIsRunning ] = useState(false)
    const [ fontSize, setFontSize ] = useState(20)
    const selectedLanguage = LANGUAGES[language]
    const currentProblemError = problemError?.problemId === problemId ? problemError.message : ''
    const isProblemLoading = Boolean(problemId && String(problem?._id) !== problemId && !currentProblemError)

    useEffect(() => {
        if (!problemId) return
        let active = true
        getCodingProblem(problemId)
            .then(({ problem: loadedProblem }) => {
                if (!active) return
                setProblem(loadedProblem)
                setProblemError(null)
                setCodeByLanguage(Object.fromEntries(Object.entries(LANGUAGES).map(([ key, config ]) => [
                    key,
                    localStorage.getItem(savedCodeKey(problemId, key)) ?? loadedProblem.starterCode?.[key] ?? config.starterCode
                ])))
            })
            .catch(() => { if (active) setProblemError({ problemId, message: 'This coding problem could not be loaded.' }) })
        return () => { active = false }
    }, [problemId])

    const updateCode = (code) => {
        setCodeByLanguage((current) => ({ ...current, [language]: code }))
        localStorage.setItem(savedCodeKey(problemId, language), code)
    }

    const changeLanguage = (event) => {
        setLanguage(event.target.value)
        setResult(null)
    }

    const resetCode = () => {
        updateCode(selectedLanguage.starterCode)
        setResult(null)
    }

    const execute = async () => {
        if (isRunning) return

        setIsRunning(true)
        setResult(null)

        try {
            const execution = await runCode({
                language,
                versionIndex: selectedLanguage.versionIndex,
                code: codeByLanguage[language],
                stdin: ''
            })
            setResult(execution)
        } catch (error) {
            setResult(error.response?.data || {
                success: false,
                output: '',
                error: 'Code execution service is temporarily unavailable.',
                status: 'api_error'
            })
        } finally {
            setIsRunning(false)
        }
    }

    return (
        <div className='coding-page'>
            <AppHeader />
            <main className={`coding-main ${problemId ? 'coding-main--problem' : ''}`}>
                {!problem && <header className='coding-title'>
                    <div>
                        <p>Practice workspace</p>
                        <h1>{problem?.title || 'Coding Practice'}</h1>
                        <span>{problem ? `${problem.difficulty} · ${problem.topic.replaceAll('-', ' ')}` : 'Write and run code in an isolated compiler environment.'}</span>
                    </div>
                </header>}

                {currentProblemError && <div className='coding-notice coding-notice--error'>{currentProblemError} <Link to='/coding-practice'>Browse problems</Link></div>}
                {isProblemLoading ? <div className='coding-notice'>Loading problem workspace...</div> : !currentProblemError && (
                    <div className={problem ? 'coding-problem-layout' : ''}>
                        {problem && (
                            <article className='coding-problem-detail'>
                                <header className='coding-problem-detail__title'>
                                    <span>Problem</span>
                                    <h1>{problem.title}</h1>
                                    <p><b className={`difficulty difficulty--${problem.difficulty}`}>{problem.difficulty}</b> <span aria-hidden='true'>•</span> {problem.topic.replaceAll('-', ' ')}</p>
                                </header>
                                <section><h2>Description</h2><p>{problem.description}</p></section>
                                <section><h2>Examples</h2>{problem.examples.map((example, index) => <div className='coding-example' key={`${example.input}-${index}`}><strong>Example {index + 1}</strong><pre>Input: {example.input}{'\n'}Output: {example.output}</pre>{example.explanation && <p>{example.explanation}</p>}</div>)}</section>
                                <section><h2>Constraints</h2><ul>{problem.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul></section>
                                <section><h2>Hints</h2><ol>{problem.hints.map((hint) => <li key={hint}>{hint}</li>)}</ol></section>
                            </article>
                        )}
                        <div className='coding-ide'>
                            <section className='coding-workspace' aria-label='Code editor'>
                                <div className='coding-workspace__bar'>
                                    <label>
                                        <span className='sr-only'>Programming language</span>
                                        <select value={language} onChange={changeLanguage} disabled={isRunning}>
                                            {Object.entries(LANGUAGES).map(([ key, config ]) => <option key={key} value={key}>{config.name}</option>)}
                                        </select>
                                    </label>
                                    <div className='coding-workspace__tools'>
                                        <button type='button' onClick={resetCode} disabled={isRunning}>Reset</button>
                                        <label>Font <select value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))}><option value='18'>18</option><option value='20'>20</option><option value='22'>22</option><option value='24'>24</option></select></label>
                                    </div>
                                </div>
                                <CodeEditor language={selectedLanguage.editorLanguage} value={codeByLanguage[language]} onChange={updateCode} fontSize={fontSize} />
                            </section>

                            {(isRunning || result) && <OutputPanel result={result} isRunning={isRunning} />}

                            <div className='coding-actions coding-actions--footer'>
                                <button type='button' onClick={execute} disabled={isRunning || !codeByLanguage[language].trim()}>
                                    {isRunning ? 'Running...' : 'Run Code'}
                                </button>
                                {problem && <button type='button' className='coding-submit' disabled title='Solution submission will be available in the next phase'>Submit</button>}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default CodingWorkspace
