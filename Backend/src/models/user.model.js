const mongoose = require('mongoose')


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: [true, "username already taken"],
        required:true,
    },

    email: {
        type: String,
        unique: [true, "Account already exists with this email adress"],
        required: true,
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
        enum: [
            'pixel-art', 'avataaars', 'adventurer', 'personas', 'lorelei',
            'notionists-neutral', 'notionists', 'micah', 'big-smile', 'open-peeps'
        ],
        default: 'pixel-art'
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

const userModel = mongoose.model("Users", userSchema)

module.exports = userModel
