const express = require('express')
const cookieparser = require('cookie-parser')
const cors = require("cors")
const helmet = require('helmet')

const app = express()

const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const isAllowedOrigin = (origin) => {
    if (!origin) return true

    if (configuredOrigins.includes(origin)) return true

    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieparser())
app.use((req, res, next) => {
    if ([ 'GET', 'HEAD', 'OPTIONS' ].includes(req.method)) return next()
    const origin = req.get('origin')
    if (!origin || isAllowedOrigin(origin)) return next()
    return res.status(403).json({ message: 'Request origin is not allowed.' })
})
app.use(cors({
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true)
        }

        return callback(new Error(`CORS blocked origin: ${origin}`))
    },
    credentials: true
}))

/* require all the routes here */
const authRoutes = require('./routes/auth.routes')
const interviewRouter = require("./routes/interview.routes")
const mockInterviewRouter = require('./routes/mockInterview.routes')
const progressRouter = require('./routes/progress.routes')
const preparationRouter = require('./routes/preparation.routes')
const focusedPracticeRouter = require('./routes/focusedPractice.routes')
const mcqRouter = require('./routes/mcq.routes')
const codingRouter = require('./routes/coding.routes')
const jobsRouter = require('./routes/jobs.routes')


/* using  all the routes here */
app.use("/api/auth", authRoutes)
app.use("/api/interview",interviewRouter)
app.use('/api/mock-interviews', mockInterviewRouter)
app.use('/api/progress', progressRouter)
app.use('/api/preparation', preparationRouter)
app.use('/api/focused-practice', focusedPracticeRouter)
app.use('/api/mcq', mcqRouter)
app.use('/api/coding', codingRouter)
app.use('/api/jobs', jobsRouter)

app.use((error, req, res, next) => {
    console.error('Unhandled request error:', error.message)

    if (res.headersSent) return next(error)
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' })
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Resume PDF must be 3 MB or smaller.' })
    if (error.name === 'MulterError') return res.status(400).json({ message: 'The resume upload could not be processed.' })
    return res.status(500).json({ message: 'An unexpected server error occurred.' })
})

module.exports = app
