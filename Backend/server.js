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
}).catch((err) => {
    console.error('Server failed to start:', err.message)
    process.exit(1)
})
