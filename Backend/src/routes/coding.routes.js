const express = require('express')
const { authUser } = require('../middlewares/auth.middlewares')
const { aiLimiter } = require('../middlewares/rateLimit.middlewares')
const controller = require('../controllers/coding.controller')

const router = express.Router()

router.use(authUser)
router.get('/topics', controller.topicsController)
router.get('/problems', controller.problemsController)
router.post('/problems/generate', aiLimiter, controller.generateProblemsController)
router.get('/problems/:id', controller.problemController)
router.post('/run', controller.runCodeController)

module.exports = router
