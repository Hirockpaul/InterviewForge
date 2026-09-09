const mongoose = require('mongoose')
const { ALLOWED_AVATAR_STYLES, DEFAULT_AVATAR_STYLE } = require('../config/avatarStyles')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: [true, 'username already taken'],
        required: true
    },
    email: {
        type: String,
        unique: [true, 'Account already exists with this email adress'],
        required: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },

    avatarStyle: {
        type: String,
        enum: ALLOWED_AVATAR_STYLES,
        default: DEFAULT_AVATAR_STYLE
    },
    avatarSeed: {
        type: String,
        trim: true,
        maxlength: 120
    },

    sessionVersion: {
        type: Number,
        min: 0,
        default: 0,
        select: false
    }
}, { timestamps: true })

module.exports = mongoose.model('Users', userSchema)
