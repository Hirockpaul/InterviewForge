const userModel = require('../models/user.model')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const tokenBlacklistModel = require('../models/blacklist.model')
const { OAuth2Client } = require('google-auth-library')

const ACCESS_TOKEN_AGE = 15 * 60 * 1000
const REFRESH_TOKEN_AGE = 30 * 24 * 60 * 60 * 1000
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET

const cookieOptions = (maxAge) => {
    const sameSite = process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')
    const options = {
        httpOnly: true,
        sameSite,
        secure: sameSite === 'none' || process.env.NODE_ENV === 'production',
        path: '/'
    }

    if (maxAge) options.maxAge = maxAge
    if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN
    return options
}

const createSession = (res, user) => {
    const accessToken = jwt.sign(
        { id: user._id, username: user.username, tokenType: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    )
    const refreshToken = jwt.sign(
        { id: user._id, tokenType: 'refresh' },
        refreshSecret(),
        { expiresIn: '30d' }
    )

    res.cookie('token', accessToken, cookieOptions(ACCESS_TOKEN_AGE))
    res.cookie('refreshToken', refreshToken, cookieOptions(REFRESH_TOKEN_AGE))
}

const serializeUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email
})


/**
 * @name registerUserController
 * @description Register a new user,expect username ,email and password in the request body
 * @access Public
 */
async function registerUserController(req,res) {

    const {username,email,password} = req.body

    if(!username || !email || !password){
        return res.status(400).json({
            message: "Please provide username, email and password"
        })
}

     const isUserAlreadyExists = await userModel.findOne({
        $or:[ { username }, { email}]
     })

     if(isUserAlreadyExists){
        return res.status(400).json({
            message: "User already exists with this username or email"
        })
}

       const hashedPassword = await bcrypt.hash(password,10)

         const user = await userModel.create({
            username,
            email,
            password: hashedPassword
         })

        createSession(res, user)

        res.status(201).json({
            message: "user registered successfully",
            user: serializeUser(user)
        })
}


/**
 * @name loginUserController
 * @description login a user, expect email and password in the requwst body
 * @access public
 */

async function loginUserController(req, res) {

    const {email, password} = req.body

    const user = await userModel.findOne({email})

    if(!user) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if(!isPasswordValid) {
        return res.status(400).json ({
            message: "Invalid email or password"
        })
    }

    createSession(res, user)
    res.status(200).json({
        message: "user loggedIn successfully",
        user: serializeUser(user)
    })
}

async function googleLoginController(req, res) {
    const { code } = req.body

    if (!code) {
        return res.status(400).json({ message: 'Google authorization code is required' })
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ message: 'Google login is not configured' })
    }

    const googleClient = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'postmessage'
    )
    const { tokens } = await googleClient.getToken(code)
    const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
    })
    const profile = ticket.getPayload()

    if (!profile?.sub || !profile.email || !profile.email_verified) {
        return res.status(401).json({ message: 'Google account email could not be verified' })
    }

    const normalizedEmail = profile.email.toLowerCase()
    let user = await userModel.findOne({
        $or: [{ googleId: profile.sub }, { email: normalizedEmail }]
    })

    if (user) {
        if (!user.googleId) {
            user.googleId = profile.sub
            await user.save()
        }
    } else {
        const usernameBase = (profile.name || normalizedEmail.split('@')[0])
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 24) || 'candidate'
        let username = usernameBase
        let suffix = 1

        while (await userModel.exists({ username })) {
            username = `${usernameBase}${suffix}`
            suffix += 1
        }

        user = await userModel.create({
            username,
            email: normalizedEmail,
            password: await bcrypt.hash(`${profile.sub}:${Date.now()}`, 10),
            googleId: profile.sub
        })
    }

    createSession(res, user)
    return res.status(200).json({
        message: 'Google login successful',
        user: serializeUser(user)
    })
}

/**
 * 
 * @name logoutUserController
 * @description clear the token from cookie and add the token in blacklist
 * @access public
 
 */
async function logoutUserController(req, res) {
    const token = req.cookies.token

    if(token) {
        await tokenBlacklistModel.create({token})
    }
    res.clearCookie('token', cookieOptions())
    res.clearCookie('refreshToken', cookieOptions())
    res.status(200).json({
        message: " user logged out successfully"
    })
}

async function refreshSessionController(req, res) {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) {
        return res.status(401).json({ message: 'Session expired. Please log in again.' })
    }

    try {
        const decoded = jwt.verify(refreshToken, refreshSecret())
        if (decoded.tokenType !== 'refresh') {
            return res.status(401).json({ message: 'Invalid refresh token.' })
        }

        const user = await userModel.findById(decoded.id)
        if (!user) {
            res.clearCookie('token', cookieOptions())
            res.clearCookie('refreshToken', cookieOptions())
            return res.status(401).json({ message: 'Account no longer exists.' })
        }

        createSession(res, user)
        return res.status(200).json({ user: serializeUser(user) })
    } catch {
        res.clearCookie('token', cookieOptions())
        res.clearCookie('refreshToken', cookieOptions())
        return res.status(401).json({ message: 'Session expired. Please log in again.' })
    }
}

/**
 *
 * @name getMeController
 * @description get the current logged in user details
 * @access private
 */
async function getMeController(req, res) {
    const user = await userModel.findById(req.user.id)

    if (!user) {
        return res.status(401).json({ message: 'Account no longer exists.' })
    }

    if (!req.cookies.refreshToken) {
        createSession(res, user)
    }


    res.status(200).json({
        message: "User details fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}


module.exports = {
     registerUserController,
     loginUserController,
     googleLoginController,
     refreshSessionController,
     logoutUserController,
     getMeController

}
