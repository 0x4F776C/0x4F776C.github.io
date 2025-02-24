const { createApp, ref, computed, onMounted, nextTick } = Vue

createApp({
    setup() {
        const searchQuery = ref('')
        const allMalware = ref([])
        const malware = ref([])
        const selectedCategory = ref('')
        const errorMessage = ref('')
        const selectedMalware = ref(null)
        const isLoading = ref(true)
        const activeTab = ref('code') // New ref for tab management
        
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
                const cachedData = localStorage.getItem('cachedMalwareData');
                const cachedTimestamp = localStorage.getItem('cachedMalwareTimestamp');
                
                if (cachedData && cachedTimestamp) {
                    const currentTime = new Date().getTime();
                    const cacheAge = currentTime - parseInt(cachedTimestamp);
                    
                    if (cacheAge < 3600000) {
                        allMalware.value = JSON.parse(cachedData);
                        malware.value = allMalware.value;
                        isLoading.value = false;
                        return;
                    }
                }
                
                const repoContentsResponse = await axios.get('https://api.github.com/repos/0x4F776C/Malware/contents', {
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                });
                
                const directories = repoContentsResponse.data.filter(item => item.type === 'dir');
                const malwareData = await Promise.all(directories.map(async (dir) => {
                    try {
                        const dirContentsResponse = await axios.get(dir.url);
                        const infoFile = dirContentsResponse.data.find(file => file.name === 'info.json');
                        if (!infoFile) {
                            console.warn(`No info.json found in ${dir.name}`);
                            return null;
                        }
                        
                        const infoResponse = await axios.get(infoFile.download_url);
                        const info = infoResponse.data;
                        
                        // Fetch code files
                        const codeDir = dirContentsResponse.data.find(item => item.name === 'code' && item.type === 'dir');
                        let files = [];
                        
                        if (codeDir) {
                            const codeContentsResponse = await axios.get(codeDir.url);
                            const codeFiles = codeContentsResponse.data.filter(file => 
                                /\.(go|py|js|c|cpp|java|rb|php|cs|ts|rs|swift)$/i.test(file.name)
                            );
                            
                            files = await Promise.all(codeFiles.map(async (file) => {
                                const content = await axios.get(file.download_url);
                                return { name: file.name, content: content.data };
                            }));
                        }
                        
                        // Fetch analysis files and screenshots
                        const analysisDir = dirContentsResponse.data.find(item => item.name === 'analysis' && item.type === 'dir');
                        let analysis = null;
                        let analysisScreenshots = [];
                        
                        if (analysisDir) {
                            const analysisContentsResponse = await axios.get(analysisDir.url);
                            
                            // Get analysis.json if it exists
                            const analysisFile = analysisContentsResponse.data.find(file => file.name === 'analysis.json');
                            if (analysisFile) {
                                const analysisResponse = await axios.get(analysisFile.download_url);
                                analysis = analysisResponse.data;
                            }
                            
                            // Get screenshots
                            const screenshots = analysisContentsResponse.data.filter(file => 
                                /\.(png|jpg|jpeg|gif)$/i.test(file.name)
                            );
                            
                            analysisScreenshots = screenshots.map(screenshot => ({
                                name: screenshot.name,
                                url: screenshot.download_url
                            }));
                        }
                        
                        return {
                            name: info.name || dir.name,
                            category: info.category,
                            description: info.description,
                            references: info.references,
                            files: files,
                            analysis: analysis || {
                                steps: [],
                                reverseEngineering: {
                                    tools: [],
                                    steps: []
                                }
                            },
                            screenshots: analysisScreenshots
                        };
                    } catch (error) {
                        console.error(`Error processing ${dir.name}:`, error);
                        return null;
                    }
                }));
        
                allMalware.value = malwareData.filter(item => item !== null);
                malware.value = allMalware.value;
                
                localStorage.setItem('cachedMalwareData', JSON.stringify(allMalware.value));
                localStorage.setItem('cachedMalwareTimestamp', new Date().getTime().toString());
                
            } catch (error) {
                console.error('Error fetching malware:', error);
                errorMessage.value = 'Failed to load malware data. Please try again later.';
            } finally {
                isLoading.value = false;
            }
        };

        const visibleMalware = computed(() => {
            if (searchQuery.value || selectedCategory.value) {
                return malware.value;
            } else {
                return malware.value.slice(0, 5);
            }
        });

        const searchMalware = () => {
            malware.value = allMalware.value.filter(malware => 
                (malware.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                 malware.description.toLowerCase().includes(searchQuery.value.toLowerCase())) &&
                (selectedCategory.value === '' || malware.category === selectedCategory.value)
            );
        };

        const escapeHtml = (unsafe) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        const openModal = (malware) => {
            selectedMalware.value = malware
            activeTab.value = 'code' // Reset to code tab when opening modal
        };

        const closeModal = () => {
            selectedMalware.value = null
            activeTab.value = 'code'
        };

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
        };

        const highlightAll = () => {
            nextTick(() => {
                document.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            });
        };

        onMounted(() => {
            loadMalware()
            highlightAll()
        });

        return {
            searchQuery,
            malware,
            visibleMalware,
            searchMalware,
            categories,
            selectedCategory,
            errorMessage,
            selectedMalware,
            escapeHtml,
            openModal,
            closeModal,
            getLanguage,
            highlightAll,
            isLoading,
            activeTab
        };
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