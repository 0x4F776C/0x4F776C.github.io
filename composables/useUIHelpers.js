import { nextTick } from 'vue'

export function useUIHelpers() {
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
  }

  const getLanguage = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase()
    const languageMap = {
      // General-purpose programming languages
      'c': 'language-c',
      'cpp': 'language-cpp',
      'cs': 'language-csharp',
      'go': 'language-go',
      'java': 'language-java',
      'js': 'language-javascript',
      'jsx': 'language-javascript',
      'ts': 'language-typescript',
      'tsx': 'language-typescript',
      'py': 'language-python',
      'rb': 'language-ruby',
      'php': 'language-php',
      'rs': 'language-rust',
      'swift': 'language-swift',
      'kt': 'language-kotlin',
      'scala': 'language-scala',
      'dart': 'language-dart',
      'lua': 'language-lua',
      'perl': 'language-perl',
      'pl': 'language-perl',
      'r': 'language-r',
      'jl': 'language-julia',

      // Web development
      'html': 'language-html',
      'htm': 'language-html',
      'css': 'language-css',
      'scss': 'language-scss',
      'sass': 'language-sass',
      'less': 'language-less',
      'json': 'language-json',
      'xml': 'language-xml',
      'yaml': 'language-yaml',
      'yml': 'language-yaml',

      // Shell scripting and system-level scripting
      'sh': 'language-shell',
      'bash': 'language-shell',
      'zsh': 'language-shell',
      'bat': 'language-batch',
      'cmd': 'language-batch',
      'ps1': 'language-powershell',

      // Database and query languages
      'sql': 'language-sql',
      'psql': 'language-postgresql',

      // Functional programming
      'hs': 'language-haskell',
      'ml': 'language-ocaml',
      'clj': 'language-clojure',
      'cljc': 'language-clojure',
      'cljs': 'language-clojurescript',

      // Data science and configuration files
      'toml': 'language-toml',
      'ini': 'language-ini',
      'md': 'language-markdown',
      'csv': 'language-csv',
      'tsv': 'language-tsv',

      // Miscellaneous
      'makefile': 'language-makefile',
      'dockerfile': 'language-dockerfile',
      'gradle': 'language-gradle',
      'groovy': 'language-groovy',

      // Assembly languages
      'asm': 'language-assembly',
      's': 'language-assembly',

      // Misc
      'coffee': 'language-coffeescript',
    }

    return languageMap[extension] || 'language-plaintext'
  }

  const highlightAll = () => {
    nextTick(() => {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
    })
  }

  return {
    escapeHtml,
    getLanguage,
    highlightAll
  }
}