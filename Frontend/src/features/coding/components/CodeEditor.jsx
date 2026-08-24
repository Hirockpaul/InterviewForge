import Editor from '@monaco-editor/react'

const CodeEditor = ({ language, value, onChange, fontSize = 20 }) => (
    <div className='coding-editor'>
        <Editor
            height='100%'
            language={language}
            value={value}
            theme='vs-dark'
            loading={<p className='coding-editor__loading'>Loading editor...</p>}
            onChange={(nextValue) => onChange(nextValue ?? '')}
            options={{
                automaticLayout: true,
                fontSize,
                lineHeight: Math.round(fontSize * 1.5),
                lineNumbers: 'on',
                minimap: { enabled: false },
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                tabSize: 4
            }}
        />
    </div>
)

export default CodeEditor
