const { createApp, ref, computed, onMounted } = Vue

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
        const searchQuery = ref('')
        const allMalware = ref([])
        const malware = ref([])
        const selectedCategory = ref('')
        const errorMessage = ref('')
        const selectedMalware = ref(null)
        const repositories = ref([])
        const showRepositories = ref(false)

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
                const response = await axios.get('malware.json')
                allMalware.value = response.data
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

        onMounted(() => {
            loadMalware()
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
            toggleRepoTree
        }
    }
}).mount('#app')
