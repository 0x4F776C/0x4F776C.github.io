const { createApp, ref, computed, onMounted, nextTick } = Vue

const RepoTree = {
    props: ['tree'],
    template: `
        <ul>
            <li v-for="item in tree" :key="item.path">
                <span v-if="item.type === 'tree'">📁 {{ item.path }}</span>
                <span v-else>📄 {{ item.path }}</span>
                <repo-tree v-if="item.type === 'tree'" :tree="item.children"></repo-tree>
            </li>
        </ul>
    `
}

createApp({
    components: {
        RepoTree
    },
    setup() {
        const matrixEnabled = ref(false)
        const searchQuery = ref('')
        const allMalware = ref([])
        const malware = ref([])
        const selectedCategory = ref('')
        const errorMessage = ref('')
        const selectedMalware = ref(null)
        const repositories = ref([])
        const showRepositories = ref(false)

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
                acc[malware.category] = (acc[malware.category] || 0) + 1;
                return acc;
            }, {});
        
            return Object.keys(categoryCounts).map(category => ({
                name: category,
                count: categoryCounts[category]
            }));
        });

        const loadMalware = async () => {
            try {
                const repoContentsResponse = await axios.get('https://api.github.com/repos/0x4F776C/Malware/contents')
                const directories = repoContentsResponse.data.filter(item => item.type === 'dir')
        
                const malwareData = await Promise.all(directories.map(async (dir) => {
                    try {
                        const dirContentsResponse = await axios.get(dir.url)
                        const infoFile = dirContentsResponse.data.find(file => file.name === 'info.json')
                        
                        if (!infoFile) {
                            console.warn(`No info.json found in ${dir.name}`)
                            return null
                        }
        
                        const infoResponse = await axios.get(infoFile.download_url)
                        const info = infoResponse.data
        
                        const codeDir = dirContentsResponse.data.find(item => item.name === 'code' && item.type === 'dir')
                        let files = []
        
                        if (codeDir) {
                            const codeContentsResponse = await axios.get(codeDir.url)
                            const codeFiles = codeContentsResponse.data.filter(file => 
                                /\.(go|py|js|c|cpp|java|rb|php|cs|ts|rs|swift)$/i.test(file.name)
                            )
        
                            files = await Promise.all(codeFiles.map(async (file) => {
                                const content = await axios.get(file.download_url)
                                return { name: file.name, content: content.data }
                            }))
                        }
        
                        return {
                            name: info.name || dir.name,
                            category: info.category,
                            description: info.description,
                            references: info.references,
                            files: files
                        }
                    } catch (error) {
                        console.error(`Error processing ${dir.name}:`, error)
                        return null
                    }
                }))
        
                allMalware.value = malwareData.filter(item => item !== null)
                malware.value = allMalware.value
            } catch (error) {
                console.error('Error fetching malware:', error)
                errorMessage.value = 'Failed to load malware data. Please try again later.'
            }
        }

        const visibleMalware = computed(() => {
            if (searchQuery.value || selectedCategory.value) {
                return malware.value;
            } else {
                return malware.value.slice(0, 5);  // Show only first 5 malware
            }
        });

        const searchMalware = () => {
            malware.value = allMalware.value.filter(malware => 
                (malware.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                malware.description.toLowerCase().includes(searchQuery.value.toLowerCase())) &&
                (selectedCategory.value === '' || malware.category === selectedCategory.value)
            )
        }

        const openModal = (malware) => {
            selectedMalware.value = malware
        }

        const closeModal = () => {
            selectedMalware.value = null
        }

        const fetchRepositories = async () => {
            try {
                const response = await axios.get('https://api.github.com/users/0x4F776C/repos')
                repositories.value = response.data.map(repo => ({
                    ...repo,
                    showTree: false,
                    tree: null
                }))
                showRepositories.value = true
            } catch (error) {
                console.error('Error fetching repositories:', error)
                errorMessage.value = 'Failed to load repositories. Please try again later.'
            }
        }

        const toggleRepoTree = async (repo) => {
            if (repo.tree) {
                repo.showTree = !repo.showTree
            } else {
                try {
                    const response = await axios.get(`https://api.github.com/repos/0x4F776C/${repo.name}/git/trees/main?recursive=1`)
                    repo.tree = buildTree(response.data.tree)
                    repo.showTree = true
                } catch (error) {
                    console.error('Error fetching repository tree:', error)
                    errorMessage.value = 'Failed to load repository tree. Please try again later.'
                }
            }
        }

        const closeRepositoriesModal = () => {
            showRepositories.value = false
        }

        const buildTree = (items) => {
            const root = []
            const map = {}

            items.forEach(item => {
                map[item.path] = { ...item, children: [] }
            })

            items.forEach(item => {
                const node = map[item.path]
                const parts = item.path.split('/')
                if (parts.length === 1) {
                    root.push(node)
                } else {
                    const parentPath = parts.slice(0, -1).join('/')
                    const parent = map[parentPath]
                    if (parent) {
                        parent.children.push(node)
                    }
                }
            })

            return root
        }

        const getLanguage = (fileName) => {
            const extension = fileName.split('.').pop().toLowerCase();
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
            };
            return languageMap[extension] || 'language-plaintext';
        }

        const highlightAll = () => {
            nextTick(() => {
                document.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightBlock(block);
                });
            });
        }

        onMounted(() => {
            loadMalware()
            document.getElementById('matrixToggle').addEventListener('click', toggleMatrix)
            highlightAll()
        })

        return {
            searchQuery,
            malware,
            visibleMalware,
            searchMalware,
            categories,
            selectedCategory,
            errorMessage,
            selectedMalware,
            openModal,
            closeModal,
            repositories,
            showRepositories,
            fetchRepositories,
            closeRepositoriesModal,
            toggleRepoTree,
            matrixEnabled,
            toggleMatrix,
            getLanguage,
            highlightAll
        }
    },
    methods: {
        clearSearch() {
            this.searchQuery = '';
            this.searchMalware();
        }
    },
    updated() {
        this.highlightAll();
    }
}).mount('#app')

const backToTopButton = document.getElementById("backToTop");

window.onscroll = function() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    backToTopButton.style.display = "block";
  } else {
    backToTopButton.style.display = "none";
  }
};

backToTopButton.onclick = function() {
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
};
