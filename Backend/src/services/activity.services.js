const preparationActivityModel = require('../models/preparationActivity.model')

async function recordActivity({ user, type, sourceId, occurredAt = new Date() }) {
    return preparationActivityModel.findOneAndUpdate(
        { user, type, sourceId: String(sourceId) },
        { $setOnInsert: { occurredAt } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )
}

function partsFor(date, timeZone) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })
    return Object.fromEntries(
        formatter.formatToParts(date)
            .filter(part => part.type !== 'literal')
            .map(part => [part.type, part.value])
    )
}

const dateKey = (date, timeZone) => {
    const parts = partsFor(date, timeZone)
    return `${parts.year}-${parts.month}-${parts.day}`
}

const ordinal = (key) => {
    const [year, month, day] = key.split('-').map(Number)
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

function calculateStreak(activities, timeZone = 'UTC', now = new Date()) {
    const keys = [...new Set(
        activities.map(activity => dateKey(new Date(activity.occurredAt), timeZone))
    )].sort()
    if (!keys.length) {
        return {
            currentStreak: 0,
            longestStreak: 0,
            totalActiveDays: 0,
            lastActivityDate: null,
            preparationThisWeek: 0,
            week: []
        }
    }

    let longestStreak = 1
    let run = 1
    for (let index = 1; index < keys.length; index += 1) {
        run = ordinal(keys[index]) - ordinal(keys[index - 1]) === 1 ? run + 1 : 1
        longestStreak = Math.max(longestStreak, run)
    }

    const today = dateKey(now, timeZone)
    const last = keys.at(-1)
    const gap = ordinal(today) - ordinal(last)
    let currentStreak = 0
    if (gap <= 1) {
        currentStreak = 1
        for (
            let index = keys.length - 1;
            index > 0 && ordinal(keys[index]) - ordinal(keys[index - 1]) === 1;
            index -= 1
        ) {
            currentStreak += 1
        }
    }

    const todayOrdinal = ordinal(today)
    const dayOfWeek = new Date(todayOrdinal * 86400000).getUTCDay()
    const mondayOrdinal = todayOrdinal - ((dayOfWeek + 6) % 7)
    const active = new Set(keys)
    const week = Array.from({ length: 7 }, (_, index) => {
        const date = new Date((mondayOrdinal + index) * 86400000).toISOString().slice(0, 10)
        return {
            date,
            label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index],
            active: active.has(date)
        }
    })

    return {
        currentStreak,
        longestStreak,
        totalActiveDays: keys.length,
        lastActivityDate: last,
        preparationThisWeek: week.filter(day => day.active).length,
        week
    }
}

module.exports = { recordActivity, calculateStreak, dateKey }
