const test = require('node:test')
const assert = require('node:assert/strict')
const { calculateStreak } = require('../src/services/activity.services')

const activity = (occurredAt) => ({ occurredAt })

test('returns an empty streak for an existing user with no activity', () => {
    assert.deepEqual(calculateStreak([], 'UTC', new Date('2026-08-22T12:00:00Z')), {
        currentStreak: 0, longestStreak: 0, totalActiveDays: 0, lastActivityDate: null, preparationThisWeek: 0, week: []
    })
})

test('counts multiple activities on one day once', () => {
    const result = calculateStreak([ activity('2026-08-22T01:00:00Z'), activity('2026-08-22T22:00:00Z') ], 'UTC', new Date('2026-08-22T23:00:00Z'))
    assert.equal(result.currentStreak, 1)
    assert.equal(result.longestStreak, 1)
    assert.equal(result.totalActiveDays, 1)
})

test('handles consecutive days, missed days, and longest streak', () => {
    const values = [ '2026-08-14', '2026-08-15', '2026-08-16', '2026-08-19', '2026-08-20', '2026-08-21' ].map((day) => activity(`${day}T12:00:00Z`))
    const result = calculateStreak(values, 'UTC', new Date('2026-08-22T08:00:00Z'))
    assert.equal(result.currentStreak, 3)
    assert.equal(result.longestStreak, 3)
    assert.equal(result.totalActiveDays, 6)
})

test('resets the current streak after a missed day without losing the longest streak', () => {
    const values = [ '2026-08-14', '2026-08-15', '2026-08-16' ].map((day) => activity(`${day}T12:00:00Z`))
    const result = calculateStreak(values, 'UTC', new Date('2026-08-19T08:00:00Z'))
    assert.equal(result.currentStreak, 0)
    assert.equal(result.longestStreak, 3)
})

test('uses the candidate timezone when assigning calendar days', () => {
    const values = [ activity('2026-08-21T23:30:00Z'), activity('2026-08-22T22:30:00Z') ]
    const result = calculateStreak(values, 'Asia/Kolkata', new Date('2026-08-23T03:00:00Z'))
    assert.equal(result.currentStreak, 2)
    assert.equal(result.totalActiveDays, 2)
    assert.equal(result.lastActivityDate, '2026-08-23')
})
