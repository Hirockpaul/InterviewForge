const path = require('path')
const test = require('node:test')
const assert = require('node:assert/strict')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { executeCode } = require('../src/services/jdoodle.service')

test('JDoodle executes JavaScript and returns a normalized result', async () => {
    const result = await executeCode({
        language: 'nodejs',
        versionIndex: '4',
        code: 'console.log(2 + 3);',
        stdin: ''
    })

    assert.deepEqual(
        { success: result.success, output: result.output, error: result.error, status: result.status },
        { success: true, output: '5', error: null, status: 'success' }
    )
})
