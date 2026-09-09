const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { OAuth2Client } = require('google-auth-library')
const { z } = require('zod')
const userModel = require('../models/user.model')
const tokenBlacklistModel = require('../models/blacklist.model')
const { ALLOWED_AVATAR_STYLES, DEFAULT_AVATAR_STYLE } = require('../config/avatarStyles')

const ACCESS_TOKEN_AGE = 15 * 60 * 1000
const REFRESH_TOKEN_AGE = 30 * 24 * 60 * 60 * 1000
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET

function cookieOptions(maxAge) {
    const sameSite = process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')
    const options = {
        httpOnly: true,
        sameSite,
        secure: sameSite === 'none' || process.env.NODE_ENV === 'production',
        path: '/'
    }

    if (maxAge) {
        options.maxAge = maxAge
    }
    if (process.env.COOKIE_DOMAIN) {
        options.domain = process.env.COOKIE_DOMAIN
    }
    return options
}

function createSession(res, user) {
    const accessToken = jwt.sign(
        { id: user._id, username: user.username, sessionVersion: user.sessionVersion || 0, tokenType: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    )
    const refreshToken = jwt.sign(
        { id: user._id, sessionVersion: user.sessionVersion || 0, tokenType: 'refresh' },
        refreshSecret(),
        { expiresIn: '30d' }
    )

    res.cookie('token', accessToken, cookieOptions(ACCESS_TOKEN_AGE))
    res.cookie('refreshToken', refreshToken, cookieOptions(REFRESH_TOKEN_AGE))
}

const stableAvatarSeed = (user) => String(user.avatarSeed || user.username || user._id)

async function ensureAvatar(user) {
    let changed = false

    if (!ALLOWED_AVATAR_STYLES.includes(user.avatarStyle)) {
        user.avatarStyle = DEFAULT_AVATAR_STYLE
        changed = true
    }
    if (!user.avatarSeed) {
        user.avatarSeed = stableAvatarSeed(user)
        changed = true
    }
    if (changed) {
        await user.save()
    }
    return user
}

function clearSessionCookies(res) {
    res.clearCookie('token', cookieOptions())
    res.clearCookie('refreshToken', cookieOptions())
}

const serializeUser = (user) => ({
    id: user._id,
    username: user.username,
    email: user.email,
    avatarStyle: ALLOWED_AVATAR_STYLES.includes(user.avatarStyle) ? user.avatarStyle : DEFAULT_AVATAR_STYLE,
    avatarSeed: stableAvatarSeed(user),
    memberSince: user.createdAt || user._id?.getTimestamp?.() || null
})

const profileUpdateSchema = z.object({
    displayName: z.string().trim().min(2).max(40),
    avatarStyle: z.enum(ALLOWED_AVATAR_STYLES)
}).strict()


async function registerUserController(req, res) {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide username, email and password' })
    }

    const existingUser = await userModel.findOne({ $or: [{ username }, { email }] })
    if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this username or email' })
    }

    const user = await userModel.create({
        username,
        email,
        password: await bcrypt.hash(password, 10)
    })

    await ensureAvatar(user)
    createSession(res, user)
    return res.status(201).json({
        message: 'user registered successfully',
        user: serializeUser(user)
    })
}

async function loginUserController(req, res) {
    const { email, password } = req.body
    const user = await userModel.findOne({ email }).select('+password +sessionVersion')

    if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
        return res.status(400).json({ message: 'Invalid email or password' })
    }

    await ensureAvatar(user)
    createSession(res, user)
    return res.status(200).json({
        message: 'user loggedIn successfully',
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
    }).select('+sessionVersion')

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

    await ensureAvatar(user)
    createSession(res, user)
    return res.status(200).json({
        message: 'Google login successful',
        user: serializeUser(user)
    })
}

async function logoutUserController(req, res) {
    const token = req.cookies.token
    const refreshToken = req.cookies.refreshToken

    if (token) {
        await tokenBlacklistModel.create({ token })
    }
    if (refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, refreshSecret())
            if (decoded.tokenType === 'refresh') {
                await userModel.findByIdAndUpdate(decoded.id, { $inc: { sessionVersion: 1 } })
            }
        } catch {
            // Invalid refresh cookies are still cleared below.
        }
    }
    clearSessionCookies(res)
    return res.status(200).json({ message: ' user logged out successfully' })
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

        const user = await userModel.findById(decoded.id).select('+sessionVersion')
        if (!user) {
            clearSessionCookies(res)
            return res.status(401).json({ message: 'Account no longer exists.' })
        }

        if ((decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) {
            clearSessionCookies(res)
            return res.status(401).json({ message: 'Session has been revoked. Please log in again.' })
        }

        await ensureAvatar(user)
        createSession(res, user)
        return res.status(200).json({ user: serializeUser(user) })
    } catch {
        clearSessionCookies(res)
        return res.status(401).json({ message: 'Session expired. Please log in again.' })
    }
}

async function getMeController(req, res) {
    const user = await userModel.findById(req.user.id).select('+sessionVersion')

    if (!user) {
        return res.status(401).json({ message: 'Account no longer exists.' })
    }

    await ensureAvatar(user)

    if (!req.cookies.refreshToken) {
        createSession(res, user)
    }
    return res.status(200).json({
        message: 'User details fetched successfully',
        user: serializeUser(user)
    })
}

async function updateProfileController(req, res) {
    const parsed = profileUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0].message })
    }

    try {
        const user = await userModel.findById(req.user.id)
        if (!user) {
            return res.status(401).json({ message: 'Account no longer exists.' })
        }

        user.username = parsed.data.displayName
        user.avatarStyle = parsed.data.avatarStyle
        if (!user.avatarSeed) {
            user.avatarSeed = stableAvatarSeed(user)
        }
        await user.save()
        return res.json({ message: 'Profile updated successfully.', user: serializeUser(user) })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'That display name is already in use.' })
        }
        console.error('Profile update failed:', error.message)
        return res.status(500).json({ message: 'Profile could not be updated.' })
    }
}
module.exports = {
    registerUserController,
    loginUserController,
    googleLoginController,
    refreshSessionController,
    logoutUserController,
    getMeController,
    updateProfileController,
    profileUpdateSchema,
    serializeUser
}
