const { createApp, ref, computed, onMounted, nextTick, watchEffect } = Vue

createApp({
    setup() {
        const matrixEnabled = ref(false)
        const searchQuery = ref('')
        const allMalware = ref([])
        const malware = ref([])
        const selectedCategory = ref('')
        const errorMessage = ref('')
        const selectedMalware = ref(null)
        const itemsPerPage = 10
        const currentPage = ref(1)
        const loading = ref(false)
        const CACHE_KEY = 'malwareData'
        const CACHE_EXPIRY = 60 * 60 * 1000 // 1 hour

        const toggleMatrix = () => {
            matrixEnabled.value = !matrixEnabled.value
            const canvas = document.getElementById('matrixCanvas')
            canvas.style.display = matrixEnabled.value ? 'block' : 'none'
            if (matrixEnabled.value) {
                startMatrix()
            }
        }
        
        const categories = computed(() => {
            const categoryCounts = allMalware.value.reduce((acc, malware) => {
                acc[malware.category] = (acc[malware.category] || 0) + 1
                return acc
            }, {})
        
            return Object.keys(categoryCounts).map(category => ({
                name: category,
                count: categoryCounts[category]
            }))
        })

        const loadMalware = async () => {
            try {
                loading.value = true
                // Check cache first
                const cachedData = localStorage.getItem(CACHE_KEY)
                if (cachedData) {
                    const { data, timestamp } = JSON.parse(cachedData)
                    if (Date.now() - timestamp < CACHE_EXPIRY) {
                        allMalware.value = data
                        malware.value = data
                        loading.value = false
                        return
                    }
                }

                const repoContentsResponse = await axios.get('https://api.github.com/repos/0x4F776C/Malware/contents', {
                    headers: { 
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': `token ${process.env.GITHUB_TOKEN}` // Make sure to set this environment variable
                    }
                })
                
                const directories = repoContentsResponse.data.filter(item => item.type === 'dir')
                const malwareData = await Promise.all(directories.map(fetchMalwareInfo))
                
                allMalware.value = malwareData.filter(item => item !== null)
                malware.value = allMalware.value

                // Save to cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: allMalware.value,
                    timestamp: Date.now()
                }))
            } catch (error) {
                console.error('Error fetching malware:', error)
                errorMessage.value = 'Failed to load malware data. Please try again later.'
            } finally {
                loading.value = false
            }
        }

        const fetchMalwareInfo = async (dir) => {
            try {
                const infoResponse = await axios.get(`https://api.github.com/repos/0x4F776C/Malware/contents/${dir.name}/info.json`, {
                    headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
                })
                const info = JSON.parse(atob(infoResponse.data.content))
                
                return {
                    name: info.name || dir.name,
                    category: info.category,
                    description: info.description,
                    references: info.references,
                    dirName: dir.name, // Store the directory name for later use
                    files: [] // We'll load files lazily
                }
            } catch (error) {
                console.error(`Error processing ${dir.name}:`, error)
                return null
            }
        }

        const loadCodeFiles = async (malware) => {
            if (!malware.files || malware.files.length === 0) {
                try {
                    const codeDir = await axios.get(`https://api.github.com/repos/0x4F776C/Malware/contents/${malware.dirName}/code`, {
                        headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
                    })
                    const codeFiles = codeDir.data.filter(file => /\.(go|py|js|c|cpp|java|rb|php|cs|ts|rs|swift)$/i.test(file.name))
        
                    malware.files = await Promise.all(codeFiles.map(async (file) => {
                        const content = await axios.get(file.download_url, {
                            headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
                        })
                        return { name: file.name, content: content.data }
                    }))
                } catch (error) {
                    console.error(`Error loading code files for ${malware.name}:`, error)
                    malware.files = []
                }
            }
        }

        const visibleMalware = computed(() => {
            if (searchQuery.value || selectedCategory.value) {
                return malware.value
            } else {
                return malware.value.slice(0, currentPage.value * itemsPerPage)
            }
        })

        const searchMalware = () => {
            malware.value = allMalware.value.filter(malware => 
                (malware.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                 malware.description.toLowerCase().includes(searchQuery.value.toLowerCase())) &&
                (selectedCategory.value === '' || malware.category === selectedCategory.value)
            )
            currentPage.value = 1 // Reset to first page when searching
        }

        const escapeHtml = (unsafe) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
        }

        const openModal = async (malware) => {
            selectedMalware.value = malware
            await loadCodeFiles(malware)
        }

        const closeModal = () => {
            selectedMalware.value = null
        }

        const getLanguage = (fileName) => {
            const extension = fileName.split('.').pop().toLowerCase()
            const languageMap = {
                'go': 'language-go',
                'py': 'language-python',
                'js': 'language-javascript',
                'c': 'language-c',
                'cpp': 'language-cpp',
                'java': 'language-java',
                'rb': 'language-ruby',
                'php': 'language-php',
                'cs': 'language-csharp',
                'ts': 'language-typescript',
                'rs': 'language-rust',
                'swift': 'language-swift'
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

        const loadMore = () => {
            if (currentPage.value * itemsPerPage < malware.value.length) {
                currentPage.value++
            }
        }

        onMounted(() => {
            loadMalware()
            document.getElementById('matrixToggle').addEventListener('click', toggleMatrix)
            highlightAll()

            // Intersection Observer for infinite scrolling
            const observer = new IntersectionObserver((entries) => {
                const lastEntry = entries[entries.length - 1]
                if (lastEntry.isIntersecting && !loading.value) {
                    loadMore()
                }
            }, {
                root: null,
                rootMargin: '0px',
                threshold: 0.1
            })

            watchEffect(() => {
                nextTick(() => {
                    const lastItem = document.querySelector('.malware-item:last-child')
                    if (lastItem) observer.observe(lastItem)
                })
            })
        })

        watchEffect(() => {
            if (searchQuery.value || selectedCategory.value) {
                searchMalware()
            }
        })

        return {
            searchQuery,
            malware: visibleMalware,
            searchMalware,
            categories,
            selectedCategory,
            errorMessage,
            selectedMalware,
            escapeHtml,
            openModal,
            closeModal,
            matrixEnabled,
            toggleMatrix,
            getLanguage,
            highlightAll,
            loading
        }
    },
    methods: {
        clearSearch() {
            this.searchQuery = ''
            this.searchMalware()
        }
    },
    updated() {
        this.highlightAll()
    }
}).mount('#app')

const backToTopButton = document.getElementById("backToTop")

window.onscroll = function() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    backToTopButton.style.display = "block"
  } else {
    backToTopButton.style.display = "none"
  }
}

backToTopButton.onclick = function() {
  document.body.scrollTop = 0 // For Safari
  document.documentElement.scrollTop = 0 // For Chrome, Firefox, IE and Opera
}