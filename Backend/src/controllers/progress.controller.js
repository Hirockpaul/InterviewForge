const mockInterviewModel = require('../models/mockInterview.model')
const { calculateProgress } = require('../services/progress.services')
const timedPracticeModel = require('../models/timedPractice.model')
const preparationActivityModel = require('../models/preparationActivity.model')
const focusedPracticeModel = require('../models/focusedPracticeSession.model')
const mcqSessionModel = require('../models/mcqSession.model')

async function getProgressController(req, res) {
    try {
        const [ sessions, timedPractices, focusedPractices, mcqPractices, activityGroups ] = await Promise.all([
            mockInterviewModel.find({ user: req.user.id, status: 'completed' }).sort({ createdAt: 1 }).populate('interviewPlan', 'title').lean(),
            timedPracticeModel.find({ user: req.user.id, status: 'completed' }).sort({ createdAt: 1 }).lean(),
            focusedPracticeModel.find({ user: req.user.id, status: 'completed' }).sort({ createdAt: 1 }).populate('questions', 'canonicalTopic difficulty').lean(),
            mcqSessionModel.find({ user: req.user.id, status: 'completed' }).sort({ createdAt: 1 }).lean(),
            preparationActivityModel.aggregate([ { $match: { user: require('mongoose').Types.ObjectId.createFromHexString(req.user.id) } }, { $group: { _id: '$type', count: { $sum: 1 } } } ])
        ])
        const activityCounts = Object.fromEntries(activityGroups.map((item) => [ item._id, item.count ]))

        return res.status(200).json({ progress: calculateProgress(sessions, timedPractices, activityCounts, focusedPractices, mcqPractices) })
    } catch (error) {
        console.error('Failed to calculate progress:', error.message)
        return res.status(500).json({ message: 'Unable to load interview progress.' })
    }
}

module.exports = { getProgressController }
