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
        const activeTab = ref('code')

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

                        const codeDir = dirContentsResponse.data.find(item => item.name === 'code' && item.type === 'dir');
                        let files = [];

                        if (codeDir) {
                            const codeContentsResponse = await axios.get(codeDir.url);
                            const codeFiles = codeContentsResponse.data.filter(file =>
                                /\.(go|py|js|jsx|ts|tsx|c|cpp|java|rb|php|cs|rs|swift|sh|bash|zsh|bat|cmd|ps1|html|htm|css|scss|sass|less|json|xml|yaml|yml|sql|psql|hs|ml|clj|cljc|cljs|lua|r|jl|kt|scala|dart|toml|ini|md|csv|tsv|makefile|dockerfile|gradle|groovy|asm|s|coffee)$/i.test(file.name)
                            );

                            files = await Promise.all(codeFiles.map(async (file) => {
                                const content = await axios.get(file.download_url);
                                return { name: file.name, content: content.data };
                            }));
                        }


                        const analysisDir = dirContentsResponse.data.find(item => item.name === 'analysis' && item.type === 'dir');
                        let analysis = null;
                        let analysisScreenshots = [];

                        if (analysisDir) {
                            const analysisContentsResponse = await axios.get(analysisDir.url);

                            const analysisFile = analysisContentsResponse.data.find(file => file.name === 'analysis.json');
                            if (analysisFile) {
                                const analysisResponse = await axios.get(analysisFile.download_url);
                                analysis = analysisResponse.data;
                            }

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

        const truncatedMalware = computed(() => {
            return malware.value.map(mal => ({
                ...mal,
                truncatedDescription: mal.description.length > 70 
                    ? mal.description.substring(0, 70) + '...' 
                    : mal.description
            }));
        });

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
            activeTab.value = 'code'
            
            document.body.classList.add('modal-open')
            
            nextTick(() => {
                highlightAll();
            });
        };

        const closeModal = () => {
            selectedMalware.value = null
            activeTab.value = 'code'
            
            document.body.classList.remove('modal-open')
        };     

        const getLanguage = (fileName) => {
            const extension = fileName.split('.').pop().toLowerCase();
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

        const darkMode = ref(localStorage.getItem('darkMode') === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches)

        const applyTheme = (isDark) => {
            if (isDark) {
                document.documentElement.classList.add('dark-theme')
            } else {
                document.documentElement.classList.remove('dark-theme')
            }
            localStorage.setItem('darkMode', isDark)
        }

        const toggleTheme = () => {
            darkMode.value = !darkMode.value
            applyTheme(darkMode.value)
        }
        
        const setupKeyboardListeners = () => {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && selectedMalware.value) {
                    closeModal();
                }
            });
        };

        onMounted(() => {
            loadMalware();
            highlightAll();
            setupKeyboardListeners();
            applyTheme(darkMode.value)

            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (localStorage.getItem('darkMode') === null) {
                    darkMode.value = e.matches
                    applyTheme(darkMode.value)
                }
            })
        });

        return {
            escapeHtml,
            searchQuery,
            categories,
            selectedCategory,
            malware,
            visibleMalware,
            searchMalware,
            selectedMalware,
            truncatedMalware,
            openModal,
            closeModal,
            activeTab,
            getLanguage,
            highlightAll,
            isLoading,
            errorMessage,
            darkMode,
            toggleTheme
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