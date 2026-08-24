const {Router} = require('express')
const authController = require('../controllers/auth.controller')
const authMiddleware = require('../middlewares/auth.middlewares')
const { authLimiter } = require('../middlewares/rateLimit.middlewares')

const authRoutes = Router()

/**
 * @route POSt/api/auth/register
 * @description Register a new user
 * @access Public
 */
authRoutes.post('/register', authLimiter, authController.registerUserController)


/**
 * @route POST/api/auth/login
 * @description login a user with email and password
 * @access Public
 */
authRoutes.post('/login', authLimiter, authController.loginUserController)

authRoutes.post('/google', authLimiter, authController.googleLoginController)
authRoutes.post('/refresh', authLimiter, authController.refreshSessionController)
 

/**
 * @route GET/api/auth/logout
 * @description claer token from cookie and add the token in blacklist
 * @access Private
 */
authRoutes.post('/logout', authController.logoutUserController)


/**
 * @route GET/api/auth/get-me
 * @description get the current logged  in user details
 * @access private
 */
authRoutes.get('/get-me', authMiddleware.authUser, authController.getMeController)
authRoutes.patch('/profile', authMiddleware.authUser, authController.updateProfileController)

module.exports = authRoutes
