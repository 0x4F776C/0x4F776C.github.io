const { createApp, ref, computed } = Vue

createApp({
    setup() {
        const searchQuery = ref('')
        const exploits = ref([])
        const selectedCategory = ref('')

        const categories = computed(() => {
            const categorySet = new Set(exploits.value.map(e => e.category))
            return Array.from(categorySet)
        })

        const searchExploits = async () => {
            if (searchQuery.value.length < 3 && !selectedCategory.value) return
            try {
                const response = await axios.get(`https://api.github.com/repos/0x4F776C/0x4F776C.github.io/contents/exploits.json`)
                const content = atob(response.data.content)
                const allExploits = JSON.parse(content)
                exploits.value = allExploits.filter(exploit => 
                    (exploit.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                    exploit.description.toLowerCase().includes(searchQuery.value.toLowerCase())) &&
                    (selectedCategory.value === '' || exploit.category === selectedCategory.value)
                )
            } catch (error) {
                console.error('Error fetching exploits:', error)
            }
        }

        return {
            searchQuery,
            exploits,
            searchExploits,
            categories,
            selectedCategory
        }
    }
}).mount('#app')