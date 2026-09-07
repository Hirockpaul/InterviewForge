const crypto = require('crypto')
const { GoogleGenAI } = require('@google/genai')
const { z } = require('zod')

const schema = z.object({
    matchScore: z.number().min(0).max(100), strengths: z.array(z.string()).max(12), skillGaps: z.array(z.string()).max(12),
    requiredSkills: z.array(z.string()).max(20), niceToHave: z.array(z.string()).max(20), interviewTopics: z.array(z.string()).max(16),
    difficulty: z.number().min(1).max(10), likelyRounds: z.array(z.string()).max(10)
})

function contentHash(job, candidate) {
    const normalizedJob = JSON.stringify({ title: job.title, company: job.company, description: job.description, locations: job.locations, remoteType: job.remoteType, employmentType: job.employmentType, seniority: job.seniority, experience: job.experience, skills: job.skills, requirements: job.requirements, qualifications: job.qualifications })
    return crypto.createHash('sha256').update(`${normalizedJob}\n${candidate.resume}\n${candidate.selfDescription}`).digest('hex')
}

async function analyzeMatch(job, candidate) {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Compare this candidate with the job. Use only stated evidence; never invent candidate skills or job requirements. Return concise structured analysis.\n\nJOB\nTitle: ${job.title}\nCompany: ${job.company}\nLocations: ${(job.locations || []).join(', ') || '(not provided)'}\nRemote arrangement: ${job.remoteType || '(not provided)'}\nEmployment type: ${job.employmentType || '(not provided)'}\nSeniority: ${job.seniority || '(not provided)'}\nExperience: ${job.experience?.text || [ job.experience?.minYears, job.experience?.maxYears ].filter((value) => value != null).join('-') || '(not provided)'}\nKnown skills: ${(job.skills || []).join(', ') || '(not provided)'}\nRequirements: ${(job.requirements || []).join('; ') || '(not separately provided)'}\nQualifications: ${(job.qualifications || []).join('; ') || '(not separately provided)'}\nDescription: ${job.description}\n\nCANDIDATE RESUME\n${candidate.resume || '(none)'}\n\nCANDIDATE SELF-DESCRIPTION\n${candidate.selfDescription || '(none)'}`, config: { responseMimeType: 'application/json', responseJsonSchema: z.toJSONSchema(schema) } })
    return schema.parse(JSON.parse(response.text))
}

module.exports = { analyzeMatch, contentHash }
