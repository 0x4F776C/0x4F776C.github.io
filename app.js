// Updated app.js for Professional Malware WebApp
const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
    setup() {
        const searchQuery = ref('');
        const allMalware = ref([]);
        const malware = ref([]);
        const selectedCategory = ref('');
        const errorMessage = ref('');
        const selectedMalware = ref(null);
        const isLoading = ref(true);

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
                const response = await axios.get('https://api.github.com/repos/0x4F776C/Malware/contents');
                const directories = response.data.filter(item => item.type === 'dir');
                
                const malwareData = await Promise.all(directories.map(async (dir) => {
                    try {
                        const dirContentsResponse = await axios.get(dir.url);
                        const infoFile = dirContentsResponse.data.find(file => file.name === 'info.json');
                        if (!infoFile) return null;

                        const infoResponse = await axios.get(infoFile.download_url);
                        const info = infoResponse.data;

                        return {
                            name: info.name || dir.name,
                            category: info.category,
                            description: info.description,
                            references: info.references || []
                        };
                    } catch (error) {
                        console.error(`Error processing ${dir.name}:`, error);
                        return null;
                    }
                }));

                allMalware.value = malwareData.filter(item => item !== null);
                malware.value = allMalware.value;
            } catch (error) {
                console.error('Error fetching malware:', error);
                errorMessage.value = 'Failed to load malware data. Please try again later.';
            } finally {
                isLoading.value = false;
            }
        };

        const searchMalware = () => {
            malware.value = allMalware.value.filter(malware => 
                (malware.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                 malware.description.toLowerCase().includes(searchQuery.value.toLowerCase())) &&
                (selectedCategory.value === '' || malware.category === selectedCategory.value)
            );
        };

        const openModal = (malware) => {
            selectedMalware.value = malware;
        };

        const closeModal = () => {
            selectedMalware.value = null;
        };

        onMounted(() => {
            loadMalware();
        });

        return {
            searchQuery,
            malware,
            searchMalware,
            categories,
            selectedCategory,
            errorMessage,
            selectedMalware,
            openModal,
            closeModal,
            isLoading
        };
    }
}).mount('#app');
