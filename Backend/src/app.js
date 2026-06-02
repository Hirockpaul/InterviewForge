const express = require('express')
const cookieparser = require('cookie-parser')

const app = express()

app.use(express.json())
app.use(cookieparser())

/* require all the routes here */
const authRoutes = require('./routes/auth.routes')


/* using  all the routes here */
app.use("/api/auth", authRoutes)

module.exports = app