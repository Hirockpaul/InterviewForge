export const LANGUAGES = {
    javascript: {
        name: 'JavaScript',
        editorLanguage: 'javascript',
        jdoodleLanguage: 'nodejs',
        versionIndex: '4',
        starterCode: 'console.log(2 + 3);\n'
    },
    python: {
        name: 'Python',
        editorLanguage: 'python',
        jdoodleLanguage: 'python3',
        versionIndex: '4',
        starterCode: 'print(2 + 3)\n'
    },
    java: {
        name: 'Java',
        editorLanguage: 'java',
        jdoodleLanguage: 'java',
        versionIndex: '4',
        starterCode: `public class Main {
    public static void main(String[] args) {
        System.out.println(2 + 3);
    }
}
`
    },
    cpp: {
        name: 'C++',
        editorLanguage: 'cpp',
        jdoodleLanguage: 'cpp17',
        versionIndex: '1',
        starterCode: `#include <iostream>

int main() {
    std::cout << 2 + 3;
    return 0;
}
`
    },
    c: {
        name: 'C',
        editorLanguage: 'c',
        jdoodleLanguage: 'c',
        versionIndex: '5',
        starterCode: `#include <stdio.h>

int main() {
    printf("%d", 2 + 3);
    return 0;
}
`
    }
}
