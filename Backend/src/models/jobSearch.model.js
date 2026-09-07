const mongoose = require('mongoose')

const jobSearchSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    query: { type: String, default: '' },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true })

jobSearchSchema.index({ user: 1, createdAt: -1 })
module.exports = mongoose.model('JobSearch', jobSearchSchema)
