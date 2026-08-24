const jwt = require('jsonwebtoken')
const tokenBlacklistModel = require('../models/blacklist.model')
const userModel = require('../models/user.model')


async function authUser(req,res,next) {

    const token = req.cookies.token

    if(!token){
        return res.status(401).json({
            message: "Token not provided."
        })
    }

    try { 
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        if (decoded.tokenType && decoded.tokenType !== 'access') {
            return res.status(401).json({ message: "Invalid access token" })
        }

        const [ isTokenBlacklisted, user ] = await Promise.all([
            tokenBlacklistModel.exists({ token }),
            userModel.findById(decoded.id).select('+sessionVersion').lean()
        ])
        if (isTokenBlacklisted || !user || (decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) {
            return res.status(401).json({ message: 'Session is no longer valid. Please log in again.' })
        }
        req.user = decoded

        next()

    } catch (err) {

        return res.status(401).json({
            message: "Invalid token"

        })

    }
    
}

module.exports =  {authUser}
