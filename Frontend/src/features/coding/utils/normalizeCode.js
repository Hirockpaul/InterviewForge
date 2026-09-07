// Older AI-generated problems stored line breaks as the two visible characters
// "\\n". Decode those values at the UI boundary while leaving normal source code,
// including intentional escaped strings such as console.log("\\n"), untouched.
export const normalizeCode = (value) => {
    if (typeof value !== 'string' || value.includes('\n') || !value.includes('\\n')) return value || ''

    return value
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
}
