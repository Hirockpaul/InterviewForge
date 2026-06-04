const express = require('express')
const cookieparser = require('cookie-parser')
const cors = require("cors")

const app = express()

app.use(express.json())
app.use(cookieparser())
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}))

/* require all the routes here */
const authRoutes = require('./routes/auth.routes')
const interviewRouter = require("./routes/interview.routes")


/* using  all the routes here */
app.use("/api/auth", authRoutes)
app.use("/api/interview",interviewRouter)

module.exports = app