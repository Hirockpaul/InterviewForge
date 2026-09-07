function mergeJobs(jobs) {
    const byFingerprint = new Map()
    for (const job of jobs.filter(Boolean)) {
        const existing = byFingerprint.get(job.fingerprint)
        if (!existing) {
            byFingerprint.set(job.fingerprint, { ...job, sourceReferences: [ { source: job.source, sourceJobId: job.sourceJobId } ] })
            continue
        }
        existing.sourceReferences.push({ source: job.source, sourceJobId: job.sourceJobId })
        for (const field of [ 'description', 'applyUrl', 'sourceUrl', 'employmentType', 'seniority', 'remoteType', 'experience' ]) if (!existing[field] && job[field]) existing[field] = job[field]
        existing.skills = [ ...new Set([ ...(existing.skills || []), ...(job.skills || []) ]) ]
        for (const field of [ 'responsibilities', 'requirements', 'qualifications', 'benefits' ]) existing[field] = [ ...new Set([ ...(existing[field] || []), ...(job[field] || []) ]) ]
        if (!existing.salary?.min && job.salary?.min) existing.salary = job.salary
        if ((!existing.description || job.description.length > existing.description.length) && job.description) existing.description = job.description
    }
    return [ ...byFingerprint.values() ]
}

module.exports = { mergeJobs }
