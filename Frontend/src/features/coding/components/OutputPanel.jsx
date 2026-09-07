import { useState } from 'react'

const STATUS_LABELS = {
    idle: 'Ready',
    running: 'Running',
    success: 'Execution successful',
    compilation_error: 'Compilation Error',
    runtime_error: 'Runtime Error',
    timeout: 'Time Limit Exceeded',
    api_error: 'Execution Error',
    network_error: 'Network Error',
    invalid_request: 'Invalid Request',
    unknown_error: 'Execution Error'
}

const OutputPanel = ({ result, isRunning = false }) => {
    const [ collapsed, setCollapsed ] = useState(false)
    const status = isRunning ? 'running' : result?.status || 'idle'
    const successful = result?.success === true
    const content = isRunning
        ? 'Waiting for the execution result…'
        : result
            ? (result.output || result.error || 'Program completed without output.')
            : 'Run your code to see output here.'

    return (
        <section className={`coding-output ${collapsed ? 'is-collapsed' : ''} ${successful ? 'is-success' : result ? 'is-error' : ''}`} aria-live='polite' aria-label='Code output'>
            <div className='coding-output__heading'>
                <h2>Output</h2>
                <div><span>{successful ? '✓ ' : result && !isRunning ? '✗ ' : ''}{STATUS_LABELS[status] || 'Execution completed'}</span><button type='button' aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)}>{collapsed ? 'Expand' : 'Collapse'}</button></div>
            </div>
            {!collapsed && <pre>{content}</pre>}
        </section>
    )
}

export default OutputPanel
