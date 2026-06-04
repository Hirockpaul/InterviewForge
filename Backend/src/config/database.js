const mongoose = require('mongoose')



async function connectToDB(){

    const mongoUri = process.env.MONGO_URI

    if (!mongoUri) {
        throw new Error('MONGO_URI is missing. Add it to Backend/.env')
    }

    try {
        await mongoose.connect(mongoUri)

        console.log('Connected to MongoDB')
    }
    catch(err){
        console.error('MongoDB connection failed:', err.message)
        throw err
    }
}

module.exports = connectToDB
