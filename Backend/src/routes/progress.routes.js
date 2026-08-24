const express = require('express')
const authMiddleware = require('../middlewares/auth.middlewares')
const { getProgressController } = require('../controllers/progress.controller')

const progressRouter = express.Router()

progressRouter.get('/', authMiddleware.authUser, getProgressController)

module.exports = progressRouter
