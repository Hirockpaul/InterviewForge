const express = require('express')
const { authUser } = require('../middlewares/auth.middlewares')
const { aiLimiter } = require('../middlewares/rateLimit.middlewares')
const upload = require('../middlewares/file.middleware')
const controller = require('../controllers/focusedPractice.controller')

const router = express.Router()
router.use(authUser)
router.get('/', controller.listSessionsController)
router.post('/', aiLimiter, upload.single('resume'), controller.createSessionController)
router.get('/:id', controller.getSessionController)
router.post('/:id/answer', controller.submitAnswerController)
router.get('/:id/report', controller.getReportController)

module.exports = router
