const decodeHtml = (value) => String(value || '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))

function plainText(value) {
    return decodeHtml(value)
        .replace(/<(?:strong|b)[^>]*>([^<]{2,80})<\/(?:strong|b)>/gi, '\n$1\n')
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\/\s*(p|div|li|h[1-6]|ul|ol|section)\s*>/gi, '\n')
        .replace(/<\s*li[^>]*>/gi, '• ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\r/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n +/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

const tidy = (value) => String(value || '').replace(/^[\s•*\-–—:]+|[\s:]+$/g, '').replace(/\s+/g, ' ').trim()

function extractExperience(description) {
    const content = plainText(description)
    if (!content) return undefined
    const patterns = [
        /\b(?:minimum|min\.?|at least)\s+(\d{1,2})(?:\s*\+)?\s+years?(?:\s+of)?(?:\s+[\w/&+.-]+){0,7}\s+experience\b/i,
        /\b(\d{1,2})\s*\+\s+years?(?:\s+of)?(?:\s+[\w/&+.-]+){0,7}\s+experience\b/i,
        /\b(\d{1,2})\s*(?:-|–|—|to)\s*(\d{1,2})\s+years?(?:\s+of)?(?:\s+[\w/&+.-]+){0,7}\s+experience\b/i,
        /\bexperience(?:\s+[\w/&+.-]+){0,4}\s+(?:of\s+)?(\d{1,2})\s*\+?\s+years?\b/i
    ]
    for (const pattern of patterns) {
        const match = pattern.exec(content)
        if (!match) continue
        const minYears = Number(match[1])
        const maxYears = match[2] ? Number(match[2]) : undefined
        if (!Number.isInteger(minYears) || minYears > 50 || (maxYears && (maxYears < minYears || maxYears > 50))) continue
        const start = Math.max(0, content.lastIndexOf('\n', match.index) + 1)
        const endCandidates = [ content.indexOf('\n', match.index), content.indexOf('.', match.index + match[0].length) ].filter((index) => index >= 0)
        const end = endCandidates.length ? Math.min(...endCandidates) + (content[Math.min(...endCandidates)] === '.' ? 1 : 0) : Math.min(content.length, match.index + match[0].length)
        const sentence = tidy(content.slice(start, end))
        return { minYears, ...(maxYears ? { maxYears } : {}), text: sentence || tidy(match[0]), source: 'description' }
    }
    const vague = /\b(?:significant|extensive|substantial)\s+(?:[\w-]+\s+){0,3}experience\b/i.exec(content)
    return vague ? { text: tidy(vague[0]), source: 'description' } : undefined
}

function sectionItems(description, headings) {
    const content = plainText(description)
    if (!content) return []
    const headingPattern = headings.map((heading) => heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    const allHeadings = 'responsibilities|key responsibilities|duties|what you(?:’|\'|’)ll do|what you will do|required knowledge and experiences?|requirements|what you need|what you need to have|minimum qualifications|basic qualifications|required qualifications|qualifications|preferred qualifications|benefits|what we offer|perks|success measures?|(?:company|employer) overview|about (?:the )?company'
    const match = new RegExp(`(?:^|\\n)\\s*(?:${headingPattern})\\s*:?[ \\t]*(?:\\n|$)`, 'i').exec(content)
    if (!match) return []
    const rest = content.slice(match.index + match[0].length)
    const next = new RegExp(`(?:^|\\n)\\s*(?:${allHeadings})\\s*:?[ \\t]*(?:\\n|$)`, 'i').exec(rest)
    const block = rest.slice(0, next?.index ?? rest.length).trim()
    if (!block) return []
    const bullets = block.split(/\n(?=\s*•)|\n{2,}/).map(tidy).filter((item) => item.length >= 3)
    return bullets.length > 1 ? bullets.slice(0, 40) : block.split(/(?<=[.;])\s+(?=[A-Z•])/).map(tidy).filter((item) => item.length >= 3).slice(0, 40)
}

function extractJobRequirements(description) {
    return {
        experience: extractExperience(description),
        responsibilities: sectionItems(description, [ 'responsibilities', 'key responsibilities', 'duties', "what you'll do", 'what you’ll do', 'what you will do' ]),
        requirements: sectionItems(description, [ 'requirements', 'what you need', 'what you need to have' ]),
        qualifications: sectionItems(description, [ 'minimum qualifications', 'basic qualifications', 'required qualifications', 'qualifications' ]),
        benefits: sectionItems(description, [ 'benefits', 'what we offer', 'perks' ])
    }
}

module.exports = { extractExperience, extractJobRequirements, plainText }
