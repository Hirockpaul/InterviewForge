const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

if (process.env.NODE_ENV === 'production') {
    const required = [ 'MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_ORIGIN' ]
    const missing = required.filter((name) => !process.env[name])
    if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(', ')}`)
}

const app = require('./src/app')
const connectToDB = require('./src/config/database')


connectToDB().then(() => {
    app.listen(3000,() => {
        console.log('Server is running on port 3000')
    })
    const { syncRecentJobs } = require('./src/services/jobs/jobs.services')
    const hasJobProvider = process.env.JOBDATALAKE_API_KEY || (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) || process.env.JSEARCH_API_KEY
    if (hasJobProvider) {
        const sync = () => syncRecentJobs().catch((error) => console.error('Scheduled job sync failed:', error.message))
        sync()
        const timer = setInterval(sync, 60 * 60 * 1000)
        timer.unref()
    }
}).catch((err) => {
    console.error('Server failed to start:', err.message)
    process.exit(1)
})
