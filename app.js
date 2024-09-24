const { createApp, ref, computed } = Vue

createApp({
    setup() {
        const searchQuery = ref('')
        const exploits = ref([])
        const selectedCategory = ref('')
        const errorMessage = ref('')

        const categories = computed(() => {
            const categorySet = new Set(exploits.value.map(e => e.category))
            return Array.from(categorySet)
        })

        const searchExploits = async () => {
            if (searchQuery.value.length < 3 && !selectedCategory.value) return
            errorMessage.value = '' // Clear any previous error message
            try {
                const response = await axios.get('exploits.json')
                const allExploits = response.data
                exploits.value = allExploits.filter(exploit => 
                    (exploit.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                    exploit.description.toLowerCase().includes(searchQuery.value.toLowerCase())) &&
                    (selectedCategory.value === '' || exploit.category === selectedCategory.value)
                )
            } catch (error) {
                console.error('Error fetching exploits:', error)
                errorMessage.value = 'Failed to load exploit data. Please check the console for more details.'
            }
        }

        // Initial data load
        searchExploits()

        return {
            searchQuery,
            exploits,
            searchExploits,
            categories,
            selectedCategory,
            errorMessage
        }
    }
}).mount('#app')