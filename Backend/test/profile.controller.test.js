const test = require('node:test')
const assert = require('node:assert/strict')
const userModel = require('../src/models/user.model')
const tokenBlacklistModel = require('../src/models/blacklist.model')
const jwt = require('jsonwebtoken')
const { authUser } = require('../src/middlewares/auth.middlewares')
const { updateProfileController, getMeController, serializeUser } = require('../src/controllers/auth.controller')

function responseRecorder() {
    return {
        statusCode: 200, body: null,
        status(code) { this.statusCode = code; return this },
        json(body) { this.body = body; return this },
        cookie() { return this }
    }
}

function profileUser(overrides = {}) {
    return {
        _id: { toString: () => 'user-one', getTimestamp: () => new Date('2025-01-01') },
        username: 'Hirock', email: 'hirock@example.com', password: 'unchanged-hash',
        avatarStyle: 'pixel-art', avatarSeed: 'Hirock', createdAt: new Date('2025-01-01'),
        async save() { this.saved = true }, ...overrides
    }
}

test('authenticated user can update display name and avatar without changing account data', async () => {
    const originalFindById = userModel.findById
    const user = profileUser()
    let requestedId
    userModel.findById = async (id) => { requestedId = id; return user }
    try {
        const res = responseRecorder()
        await updateProfileController({ user: { id: 'user-one' }, body: { displayName: 'Hirock Gogoi', avatarStyle: 'adventurer' } }, res)
        assert.equal(res.statusCode, 200)
        assert.equal(requestedId, 'user-one')
        assert.equal(user.username, 'Hirock Gogoi')
        assert.equal(user.avatarStyle, 'adventurer')
        assert.equal(user.email, 'hirock@example.com')
        assert.equal(user.password, 'unchanged-hash')
        assert.equal(res.body.user.avatarSeed, 'Hirock')
    } finally { userModel.findById = originalFindById }
})

test('invalid avatar style is rejected before accessing MongoDB', async () => {
    const originalFindById = userModel.findById
    let accessed = false
    userModel.findById = async () => { accessed = true }
    try {
        const res = responseRecorder()
        await updateProfileController({ user: { id: 'user-one' }, body: { displayName: 'Hirock', avatarStyle: 'untrusted-style' } }, res)
        assert.equal(res.statusCode, 400)
        assert.equal(accessed, false)
    } finally { userModel.findById = originalFindById }
})

test('request body cannot select another user account', async () => {
    const originalFindById = userModel.findById
    let requestedId
    userModel.findById = async (id) => { requestedId = id; return profileUser() }
    try {
        await updateProfileController({ user: { id: 'authenticated-user' }, body: { displayName: 'Hirock', avatarStyle: 'lorelei', userId: 'another-user' } }, responseRecorder())
        assert.notEqual(requestedId, 'another-user')
    } finally { userModel.findById = originalFindById }
})

test('unauthenticated profile request is rejected by existing auth middleware', async () => {
    const res = responseRecorder()
    await authUser({ cookies: {} }, res, () => assert.fail('middleware should not continue'))
    assert.equal(res.statusCode, 401)
})

test('authentication rejects an access token after its session version is revoked', async () => {
    const originalExists = tokenBlacklistModel.exists
    const originalFindById = userModel.findById
    const originalSecret = process.env.JWT_SECRET
    process.env.JWT_SECRET = 'test-session-secret'
    tokenBlacklistModel.exists = async () => false
    userModel.findById = () => ({ select() { return this }, lean: async () => ({ sessionVersion: 2 }) })
    const token = jwt.sign({ id: 'user-one', tokenType: 'access', sessionVersion: 1 }, process.env.JWT_SECRET)
    try {
        const res = responseRecorder()
        await authUser({ cookies: { token } }, res, () => assert.fail('revoked session should not continue'))
        assert.equal(res.statusCode, 401)
    } finally {
        tokenBlacklistModel.exists = originalExists
        userModel.findById = originalFindById
        process.env.JWT_SECRET = originalSecret
    }
})

test('missing avatar fields receive and persist a stable fallback on profile load', async () => {
    const originalFindById = userModel.findById
    const user = profileUser({ avatarStyle: undefined, avatarSeed: undefined, saved: false })
    userModel.findById = () => ({ select: async () => user })
    try {
        const res = responseRecorder()
        await getMeController({ user: { id: 'user-one' }, cookies: { refreshToken: 'present' } }, res)
        assert.equal(user.saved, true)
        assert.equal(res.body.user.avatarStyle, 'pixel-art')
        assert.equal(res.body.user.avatarSeed, 'Hirock')
    } finally { userModel.findById = originalFindById }
})

test('serialized existing profile includes a stable member date and avatar', () => {
    const serialized = serializeUser(profileUser())
    assert.equal(serialized.avatarStyle, 'pixel-art')
    assert.equal(serialized.avatarSeed, 'Hirock')
    assert.equal(serialized.memberSince.toISOString(), '2025-01-01T00:00:00.000Z')
})
