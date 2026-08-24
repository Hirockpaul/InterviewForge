const STATUS_LABELS = {
    success: 'Execution successful',
    compilation_error: 'Compilation Error',
    runtime_error: 'Runtime Error',
    timeout: 'Time Limit Exceeded',
    api_error: 'Execution Error',
    invalid_request: 'Invalid Request',
    unknown_error: 'Execution Error'
}

const OutputPanel = ({ result, isRunning = false }) => {
    const status = result?.status || 'idle'
    const successful = result?.success === true

    return (
        <section className={`coding-output ${successful ? 'is-success' : result ? 'is-error' : ''}`} aria-live='polite'>
            <div className='coding-output__heading'>
                <h2>Output</h2>
                {isRunning
                    ? <span>Running code...</span>
                    : result && <span>{successful ? '✓' : '✗'} {STATUS_LABELS[status] || 'Execution completed'}</span>}
            </div>
            <pre>{isRunning ? 'Waiting for the execution result...' : (result?.output || result?.error || 'Program completed without output.')}</pre>
        </section>
    )
}

export default OutputPanel
