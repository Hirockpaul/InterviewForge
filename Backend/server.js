const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
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
