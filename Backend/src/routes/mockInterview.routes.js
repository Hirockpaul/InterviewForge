const express = require('express')
const authMiddleware = require('../middlewares/auth.middlewares')
const controller = require('../controllers/mockInterview.controller')
const { aiLimiter } = require('../middlewares/rateLimit.middlewares')

const mockInterviewRouter = express.Router()

mockInterviewRouter.get('/', authMiddleware.authUser, controller.listMockInterviewsController)
mockInterviewRouter.post('/', authMiddleware.authUser, aiLimiter, controller.startMockInterviewController)
mockInterviewRouter.get('/:mockInterviewId', authMiddleware.authUser, controller.getMockInterviewController)
mockInterviewRouter.post('/:mockInterviewId/answer', authMiddleware.authUser, aiLimiter, controller.answerMockInterviewController)

module.exports = mockInterviewRouter
