const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const { mcqSchema, normalizeMcq } = require('../src/services/mcqCore.services')
const mcqQuestionModel = require('../src/models/mcqQuestion.model')

function parseCsv(text) {
    const rows = []
    let currentRow = []
    let currentField = ''
    let insideQuotes = false

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index]
        const nextCharacter = text[index + 1]

        if (character === '"' && insideQuotes && nextCharacter === '"') {
            currentField += '"'
            index += 1
        } else if (character === '"') {
            insideQuotes = !insideQuotes
        } else if (character === ',' && !insideQuotes) {
            currentRow.push(currentField)
            currentField = ''
        } else if ((character === '\n' || character === '\r') && !insideQuotes) {
            if (character === '\r' && nextCharacter === '\n') {
                index += 1
            }

            currentRow.push(currentField)

            if (currentRow.some(Boolean)) {
                rows.push(currentRow)
            }

            currentRow = []
            currentField = ''
        } else {
            currentField += character
        }
    }

    if (currentField || currentRow.length) {
        currentRow.push(currentField)
        rows.push(currentRow)
    }

    const headers = rows.shift()?.map(header => header.trim()) || []

    return rows.map(values => {
        const question = Object.fromEntries(
            headers.map((header, index) => [header, values[index] || ''])
        )

        return {
            ...question,
            options: [
                question.optionA,
                question.optionB,
                question.optionC,
                question.optionD
            ],
            correctOption: Number(question.correctOption),
            tags: String(question.tags || '').split('|').filter(Boolean)
        }
    })
}

function readQuestions(sourcePath) {
    const absolutePath = path.resolve(sourcePath)
    const extension = path.extname(absolutePath).toLowerCase()
    const fileContents = fs.readFileSync(absolutePath, 'utf8')

    let parsedFile

    if (extension === '.json') {
        parsedFile = JSON.parse(fileContents)
    } else if (extension === '.csv') {
        parsedFile = parseCsv(fileContents)
    } else {
        throw new Error('Only JSON and CSV files are supported.')
    }

    const questions = Array.isArray(parsedFile)
        ? parsedFile
        : parsedFile.questions

    if (!Array.isArray(questions)) {
        throw new Error('Input must be an array or an object with a questions array.')
    }

    return { questions, absolutePath }
}

async function importQuestion(value, absolutePath) {
    const validation = mcqSchema.safeParse(value)

    if (!validation.success) {
        return {
            status: 'rejected',
            message: validation.error.issues[0].message
        }
    }

    const document = normalizeMcq(validation.data, {
        source: value.source || 'imported',
        sourceReference: value.sourceReference || absolutePath,
        license: value.license || '',
        visibility: 'global',
        qualityStatus: 'approved'
    })

    try {
        await mcqQuestionModel.create(document)
        return { status: 'inserted' }
    } catch (error) {
        if (error.code === 11000) {
            return { status: 'duplicate' }
        }

        return { status: 'rejected', message: error.message }
    }
}

async function run() {
    const sourcePath = process.argv[2]

    if (!sourcePath) {
        throw new Error('Usage: npm run import:mcq -- path/to/questions.json|csv')
    }

    const { questions, absolutePath } = readQuestions(sourcePath)

    require('dotenv').config({
        path: path.join(__dirname, '../.env'),
        quiet: true
    })

    await mongoose.connect(process.env.MONGO_URI)

    const summary = {
        total: questions.length,
        inserted: 0,
        duplicates: 0,
        rejected: 0
    }

    for (const question of questions) {
        const result = await importQuestion(question, absolutePath)

        if (result.status === 'inserted') {
            summary.inserted += 1
        } else if (result.status === 'duplicate') {
            summary.duplicates += 1
        } else {
            summary.rejected += 1
            console.warn(`Rejected: ${result.message}`)
        }
    }

    console.log(JSON.stringify(summary, null, 2))
    await mongoose.disconnect()
}

if (require.main === module) {
    run().catch(error => {
        console.error(error.message)
        process.exit(1)
    })
}

module.exports = { parseCsv }
