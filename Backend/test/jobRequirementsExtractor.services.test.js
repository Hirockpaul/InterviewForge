const test = require('node:test')
const assert = require('node:assert/strict')
const { extractExperience, extractJobRequirements, plainText } = require('../src/services/jobs/jobRequirementsExtractor.services')

test('extracts explicit minimum, plus, and bounded experience without guessing', () => {
    assert.equal(extractExperience('You need at least 10 years of engineering experience.').minYears, 10)
    assert.equal(extractExperience('<li>5+ years of experience in software engineering</li>').minYears, 5)
    const range = extractExperience('Required: 3-5 years experience building APIs')
    assert.deepEqual({ minYears: range.minYears, maxYears: range.maxYears }, { minYears: 3, maxYears: 5 })
    assert.equal(extractExperience('Significant industry experience').text, 'Significant industry experience')
    assert.equal(extractExperience('A collaborative engineer with strong judgment'), undefined)
})

test('extracts known description sections and preserves their items', () => {
    const result = extractJobRequirements('<h2>What You Will Do</h2><ul><li>Design scalable systems.</li><li>Lead architecture decisions.</li></ul><h2>Required Qualifications</h2><ul><li>5+ years of experience.</li><li>Strong communication skills.</li></ul><h2>Benefits</h2><p>Health insurance.</p>')
    assert.deepEqual(result.responsibilities, [ 'Design scalable systems.', 'Lead architecture decisions.' ])
    assert.deepEqual(result.qualifications, [ '5+ years of experience.', 'Strong communication skills.' ])
    assert.deepEqual(result.benefits, [ 'Health insurance.' ])
    assert.equal(result.experience.minYears, 5)
})

test('converts encoded provider HTML to complete readable text', () => {
    assert.equal(plainText('&lt;h2&gt;Requirements&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;Node.js&lt;/li&gt;&lt;/ul&gt;'), 'Requirements\n• Node.js')
})
