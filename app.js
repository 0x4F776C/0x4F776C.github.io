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
                exploits.value = allExploits.value.slice(0, 5) // Preload first 5 exploits
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
            selectedExploit.value = JSON.parse(JSON.stringify(exploit)) // Create a deep copy
        }

        const closeModal = () => {
            selectedExploit.value = null
        }

        const addStep = () => {
            if (selectedExploit.value) {
                selectedExploit.value.steps.push('')
            }
        }

        const saveChanges = () => {
            const index = allExploits.value.findIndex(e => e.id === selectedExploit.value.id)
            if (index !== -1) {
                allExploits.value[index] = selectedExploit.value
                searchExploits() // Update the displayed exploits
            }
            closeModal()
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
            closeModal,
            addStep,
            saveChanges
        }
    }
}).mount('#app')