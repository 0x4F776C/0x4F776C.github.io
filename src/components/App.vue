<template>
    <div id="app" class="container" :class="{ 'dark-theme': darkMode }">
    <header>
        <div class="brand">
            <i class="fas fa-shield-alt"></i>
            <h1 id="threatplayground">ThreatPlayground</h1>
        </div>
        <nav>
            <a href="https://github.com/0x4F776C" target="_blank"><i class="fab fa-github"></i> GitHub</a>
            <a href="https://www.linkedin.com/in/lee-chun-hao" target="_blank"><i class="fab fa-linkedin"></i>
                LinkedIn</a>
            <button class="theme-toggle" @click="toggleTheme" title="Toggle dark/light mode">
                <i :class="darkMode ? 'fas fa-sun' : 'fas fa-moon'"></i>
            </button>
        </nav>
    </header>

    <div class="search-container">
        <div class="search-input-wrapper">
            <i class="fas fa-search search-icon"></i>
            <input type="text" v-model="searchQuery" @input="searchMalware" placeholder="Search malware samples...">
            <button v-if="searchQuery" @click="clearSearch" class="clear-search-btn" title="Clear search">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="category-select-wrapper">
            <i class="fas fa-filter filter-icon"></i>
            <select v-model="selectedCategory" @change="searchMalware">
                <option value="">All Categories</option>
                <option v-for="category in categories" :value="category.name">
                    {{ category.name }} ({{ category.count }})
                </option>
            </select>
        </div>
    </div>

    <div v-if="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Loading malware samples...</p>
    </div>

    <div v-else>
        <div v-if="errorMessage" class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>{{ errorMessage }}</p>
        </div>

        <div v-else class="malware-grid">
            <div v-for="mal in truncatedMalware" :key="mal.id" class="malware-card" @click="openModal(mal)">
                <div class="card-header">
                    <h3>{{ mal.name }}</h3>
                    <span class="category-tag">{{ mal.category }}</span>
                </div>
                <p class="description">{{ mal.truncatedDescription }}</p>
                <div class="card-footer">
                    <span class="view-details">View details <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>
        </div>
    </div>

    <div v-if="selectedMalware" class="modal" @click="closeModal">
        <div class="modal-content" @click.stop="">
            <div class="modal-header">
                <h2>{{ selectedMalware.name }}</h2>
                <span class="close" @click="closeModal"><i class="fas fa-times"></i></span>
            </div>

            <div class="modal-meta">
                <div class="meta-item">
                    <i class="fas fa-tag"></i>
                    <p><strong>Category:</strong> {{ selectedMalware.category }}</p>
                </div>
            </div>

            <div class="description-section">
                <h3><i class="fas fa-info-circle"></i> Description</h3>
                <p>{{ selectedMalware.description }}</p>
            </div>

            <div v-if="selectedMalware.references && selectedMalware.references.length > 0" class="references-section">
                <h3><i class="fas fa-link"></i> References</h3>
                <ul>
                    <li v-for="ref in selectedMalware.references" :key="ref">
                        <a class="reflink" :href="ref" target="_blank" rel="noopener noreferrer">
                            <i class="fas fa-external-link-alt"></i> {{ ref }}
                        </a>
                    </li>
                </ul>
            </div>

            <div class="tab-navigation">
                <button :class="['tab-button', { active: activeTab === 'code' }]" @click="activeTab = 'code'">
                    <i class="fas fa-code"></i> Source Code
                </button>
                <button :class="['tab-button', { active: activeTab === 'analysis' }]" @click="activeTab = 'analysis'">
                    <i class="fas fa-microscope"></i> Analysis
                </button>
                <button :class="['tab-button', { active: activeTab === 'reversing' }]" @click="activeTab = 'reversing'">
                    <i class="fas fa-wrench"></i> Reverse Engineering
                </button>
            </div>

            <div v-if="activeTab === 'code'" class="tab-content">
                <div v-for="file in selectedMalware.files" :key="file.name" class="file-container">
                    <div class="file-header">
                        <i class="fas fa-file-code"></i>
                        <h3>{{ file.name }}</h3>
                    </div>
                    <div class="code-block" :data-language="getLanguage(file.name).replace('language-', '')">
                        <pre><code :class="getLanguage(file.name)" v-html="escapeHtml(file.content)"></code></pre>
                    </div>
                </div>
            </div>

            <div v-if="activeTab === 'analysis'" class="tab-content">
                <div
                    v-if="selectedMalware.analysis && selectedMalware.analysis.steps && selectedMalware.analysis.steps.length">
                    <h3 class="section-title"><i class="fas fa-tasks"></i> Analysis Steps</h3>
                    <div v-for="(step, index) in selectedMalware.analysis.steps" :key="index" class="analysis-step">
                        <div class="step-header">
                            <div class="step-number">{{ index + 1 }}</div>
                            <h4>{{ step.title }}</h4>
                        </div>
                        <div class="step-content">
                            <p>{{ step.description }}</p>

                            <div v-if="step.codeBlocks && step.codeBlocks.length" class="step-code-blocks">
                                <div v-for="(code, codeIndex) in step.codeBlocks" :key="codeIndex">
                                    <h5 v-if="code.title">
                                        <i class="fas fa-chevron-right"></i> {{ code.title }}
                                    </h5>
                                    <div class="code-block" :data-language="code.language">
                                        <pre><code :class="getLanguage(code.language)" v-html="escapeHtml(code.content)"></code></pre>
                                    </div>
                                    <p v-if="code.explanation" class="code-explanation">{{ code.explanation }}</p>
                                </div>
                            </div>

                            <div v-if="step.output" class="step-output">
                                <h5><i class="fas fa-terminal"></i> Output:</h5>
                                <pre class="output-block">{{ step.output }}</pre>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="selectedMalware.screenshots && selectedMalware.screenshots.length">
                    <h3 class="section-title"><i class="fas fa-images"></i> Analysis Screenshots</h3>
                    <div class="screenshot-grid">
                        <div v-for="screenshot in selectedMalware.screenshots" :key="screenshot.name"
                            class="screenshot-item">
                            <img :src="screenshot.url" :alt="screenshot.name" @click="openScreenshot(screenshot)">
                            <p>{{ screenshot.name }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="activeTab === 'reversing'" class="tab-content">
                <div v-if="selectedMalware.analysis && selectedMalware.analysis.reverseEngineering">
                    <div v-if="selectedMalware.analysis.reverseEngineering.tools.length">
                        <h3 class="section-title"><i class="fas fa-tools"></i> Tools Used</h3>
                        <ul class="tools-list">
                            <li v-for="tool in selectedMalware.analysis.reverseEngineering.tools" :key="tool.name">
                                <i class="fas fa-wrench"></i>
                                <strong>{{ tool.name }}</strong>: {{ tool.purpose }}
                            </li>
                        </ul>
                    </div>

                    <div v-if="selectedMalware.analysis.reverseEngineering.steps.length">
                        <h3 class="section-title"><i class="fas fa-search-plus"></i> Reverse Engineering Analysis</h3>
                        <div v-for="(step, index) in selectedMalware.analysis.reverseEngineering.steps" :key="index"
                            class="reversing-step">
                            <div class="step-header">
                                <div class="step-number">{{ index + 1 }}</div>
                                <h4>{{ step.title }}</h4>
                            </div>
                            <div class="step-content">
                                <p>{{ step.description }}</p>

                                <div v-if="step.codeBlocks && step.codeBlocks.length" class="step-code-blocks">
                                    <div v-for="(code, codeIndex) in step.codeBlocks" :key="codeIndex">
                                        <h5><i class="fas fa-chevron-right"></i> {{ code.title }}</h5>
                                        <div class="code-block" :data-language="code.language">
                                            <pre><code :class="getLanguage(code.language)" v-html="escapeHtml(code.content)"></code></pre>
                                        </div>
                                        <p v-if="code.explanation" class="code-explanation">{{ code.explanation }}</p>
                                    </div>
                                </div>

                                <div v-if="step.findings" class="step-findings">
                                    <h5><i class="fas fa-lightbulb"></i> Findings:</h5>
                                    <ul>
                                        <li v-for="(finding, findingIndex) in step.findings" :key="findingIndex">
                                            {{ finding }}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
    import { ref, computed, onMounted, nextTick } from 'vue'
    import axios from 'axios';

    export default {
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
                    const CACHE_VALIDITY = 24 * 60 * 60 * 1000;

                    if (cachedData && cachedTimestamp) {
                        const currentTime = new Date().getTime();
                        const cacheAge = currentTime - parseInt(cachedTimestamp);

                        if (cacheAge < CACHE_VALIDITY) {
                            allMalware.value = JSON.parse(cachedData);
                            malware.value = allMalware.value;
                            isLoading.value = false;
                            return;
                        }
                    }

                    const github_token = process.env.GITHUB_TOKEN || '';

                    const headers = { 'Accept': 'application/vnd.github.v3+json' };

                    if (github_token) {
                        headers['Authorization'] = `token ${github_token}`;
                    }

                    const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
                        let retries = 0;

                        while (retries < maxRetries) {
                            try {
                                return await axios.get(url, options);
                            } catch (error) {
                                const isRateLimit = error.response && error.response.status === 403 &&
                                    error.response.headers['x-ratelimit-remaining'] === '0';

                                if (isRateLimit && retries < maxRetries - 1) {
                                    const delay = Math.pow(2, retries) * 1000; // Exponential backoff
                                    console.log(`Rate limited. Retrying in ${delay}ms...`);
                                    await new Promise(resolve => setTimeout(resolve, delay));
                                    retries++;
                                } else {
                                    throw error;
                                }
                            }
                        }
                    };

                    const repoContentsResponse = await fetchWithRetry('https://api.github.com/repos/0x4F776C/Malware/contents', { headers });

                    const directories = repoContentsResponse.data.filter(item => item.type === 'dir');
                    const malwareData = await Promise.all(directories.map(async (dir) => {
                        try {
                            const dirContentsResponse = await fetchWithRetry(dir.url, { headers });
                            const infoFile = dirContentsResponse.data.find(file => file.name === 'info.json');
                            if (!infoFile) {
                                console.warn(`No info.json found in ${dir.name}`);
                                return null;
                            }

                            const infoResponse = await fetchWithRetry(infoFile.download_url, { headers });
                            const info = infoResponse.data;

                            const codeDir = dirContentsResponse.data.find(item => item.name === 'code' && item.type === 'dir');
                            let files = [];

                            if (codeDir) {
                                const codeContentsResponse = await fetchWithRetry(codeDir.url, { headers });
                                const codeFiles = codeContentsResponse.data.filter(file =>
                                    /\.(go|py|js|jsx|ts|tsx|c|cpp|java|rb|php|cs|rs|swift|sh|bash|zsh|bat|cmd|ps1|html|htm|css|scss|sass|less|json|xml|yaml|yml|sql|psql|hs|ml|clj|cljc|cljs|lua|r|jl|kt|scala|dart|toml|ini|md|csv|tsv|makefile|dockerfile|gradle|groovy|asm|s|coffee)$/i.test(file.name)
                                );

                                files = await Promise.all(codeFiles.map(async (file) => {
                                    const content = await fetchWithRetry(file.download_url, { headers });
                                    return { name: file.name, content: content.data };
                                }));
                            }


                            const analysisDir = dirContentsResponse.data.find(item => item.name === 'analysis' && item.type === 'dir');
                            let analysis = null;
                            let analysisScreenshots = [];

                            if (analysisDir) {
                                const analysisContentsResponse = await fetchWithRetry(analysisDir.url, { headers });

                                const analysisFile = analysisContentsResponse.data.find(file => file.name === 'analysis.json');
                                if (analysisFile) {
                                    const analysisResponse = await fetchWithRetry(analysisFile.download_url, { headers });
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

                    if (error.response && error.response.status === 403) {
                        const rateLimitRemaining = error.response.headers['x-ratelimit-remaining'];
                        const rateLimitReset = error.response.headers['x-ratelimit-reset'];

                        if (rateLimitRemaining === '0') {
                            const resetDate = new Date(rateLimitReset * 1000);
                            const resetTimeString = resetDate.toLocaleTimeString();

                            errorMessage.value = `GitHub API rate limit exceeded. Limit will reset at ${resetTimeString}. Using cached data if available.`;

                            const cachedData = localStorage.getItem('cachedMalwareData');
                            if (cachedData) {
                                allMalware.value = JSON.parse(cachedData);
                                malware.value = allMalware.value;
                                errorMessage.value += ' Using cached data for now.';
                            }
                        } else {
                            errorMessage.value = 'Failed to load malware data. Please try again later.';
                        }
                    } else {
                        errorMessage.value = 'Failed to load malware data. Please try again later.';
                    }
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
    }
</script>