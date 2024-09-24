const { createApp, ref, computed, onMounted } = Vue

createApp({
    setup() {
        const searchQuery = ref('')
        const allExploits = ref([])
        const exploits = ref([])
        const selectedCategory = ref('')
        const errorMessage = ref('')
        const selectedExploit = ref(null)

        const categories = computed(() => {
            const categorySet = new Set(allExploits.value.map(e => e.category))
            return Array.from(categorySet)
        })

        const loadExploits = async () => {
            try {
                const response = await axios.get('exploits.json')
                allExploits.value = response.data
                exploits.value = allExploits.value
            } catch (error) {
                console.error('Error fetching exploits:', error)
                errorMessage.value = 'Failed to load exploit data. Please try again later.'
            }
        }

        const searchExploits = () => {
            exploits.value = allExploits.value.filter(exploit => 
                (exploit.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                exploit.description.toLowerCase().includes(searchQuery.value.toLowerCase())) &&
                (selectedCategory.value === '' || exploit.category === selectedCategory.value)
            )
        }

        const openModal = (exploit) => {
            selectedExploit.value = exploit
        }

        const closeModal = () => {
            selectedExploit.value = null
        }

        onMounted(() => {
            loadExploits()
        })

        return {
            searchQuery,
            exploits,
            searchExploits,
            categories,
            selectedCategory,
            errorMessage,
            selectedExploit,
            openModal,
            closeModal
        }
    }
}).mount('#app')