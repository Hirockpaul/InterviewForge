const JDOODLE_EXECUTE_URL = 'https://api.jdoodle.com/v1/execute'
const REQUEST_TIMEOUT_MS = 20_000

class JDoodleConfigurationError extends Error {
    constructor(message) {
        super(message)
        this.name = 'JDoodleConfigurationError'
        this.code = 'JDOODLE_CONFIGURATION_ERROR'
    }
}

function executionResult(overrides = {}) {
    return {
        success: false,
        output: '',
        error: null,
        status: 'unknown_error',
        memory: null,
        cpuTime: null,
        compilationError: null,
        ...overrides
    }
}

function normalizeOutput(output) {
    return typeof output === 'string' ? output.replace(/\r\n/g, '\n').trimEnd() : ''
}

function normalizeJDoodleResponse(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return executionResult({
            error: 'The code execution service returned an unexpected response.'
        })
    }

    const output = normalizeOutput(payload.output)
    const statusCode = Number(payload.statusCode)
    const executionSucceeded = payload.isExecutionSuccess !== false
    const compilationSucceeded = payload.isCompiled !== false

    if (statusCode === 200 && executionSucceeded && compilationSucceeded) {
        return executionResult({
            success: true,
            output,
            status: 'success',
            memory: payload.memory ?? null,
            cpuTime: payload.cpuTime ?? null
        })
    }

    const lowerOutput = output.toLowerCase()
    const isTimeout = lowerOutput.includes('time limit') || lowerOutput.includes('timed out')
    const isCompilationError = !compilationSucceeded || lowerOutput.includes('compilation error')
    const status = isTimeout
        ? 'timeout'
        : isCompilationError
            ? 'compilation_error'
            : statusCode === 200
                ? 'runtime_error'
                : 'api_error'

    const message = {
        timeout: 'Execution exceeded the allowed time.',
        compilation_error: 'Compilation failed.',
        runtime_error: 'Your program exited with an error.',
        api_error: payload.error || 'The code execution service rejected the request.'
    }[status]

    return executionResult({
        output,
        error: message,
        status,
        memory: payload.memory ?? null,
        cpuTime: payload.cpuTime ?? null,
        compilationError: isCompilationError ? output || message : null
    })
}

function validateRequest({ language, versionIndex, code, stdin }) {
    if (!language || typeof language !== 'string') throw new TypeError('A JDoodle language is required.')
    if (versionIndex === undefined || versionIndex === null || String(versionIndex).trim() === '') {
        throw new TypeError('A JDoodle version index is required.')
    }
    if (typeof code !== 'string' || !code.trim()) throw new TypeError('Source code is required.')
    if (stdin !== undefined && typeof stdin !== 'string') throw new TypeError('Standard input must be a string.')
}

async function executeCode({ language, versionIndex, code, stdin = '' }) {
    validateRequest({ language, versionIndex, code, stdin })

    const clientId = process.env.JDOODLE_CLIENT_ID
    const clientSecret = process.env.JDOODLE_CLIENT_SECRET

    if (!clientId) throw new JDoodleConfigurationError('JDOODLE_CLIENT_ID is not configured.')
    if (!clientSecret) throw new JDoodleConfigurationError('JDOODLE_CLIENT_SECRET is not configured.')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        const response = await fetch(JDOODLE_EXECUTE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId,
                clientSecret,
                script: code,
                stdin,
                language,
                versionIndex: String(versionIndex)
            }),
            signal: controller.signal
        })

        let payload
        try {
            payload = await response.json()
        } catch {
            return executionResult({
                error: 'The code execution service returned an unexpected response.'
            })
        }

        if (!response.ok) {
            const quotaReached = response.status === 429 || /quota|credit|limit/i.test(payload?.error || payload?.message || '')
            return executionResult({
                error: quotaReached
                    ? 'Daily code execution limit reached.'
                    : 'Code execution service is temporarily unavailable.',
                status: 'api_error'
            })
        }

        return normalizeJDoodleResponse(payload)
    } catch (error) {
        if (error.name === 'AbortError') {
            return executionResult({
                error: 'Execution exceeded the allowed time.',
                status: 'timeout'
            })
        }

        return executionResult({
            error: 'Code execution service is temporarily unavailable.',
            status: 'api_error'
        })
    } finally {
        clearTimeout(timeout)
    }
}

module.exports = {
    executeCode,
    normalizeJDoodleResponse,
    JDoodleConfigurationError
}
