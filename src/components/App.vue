// Fixed version of App.vue
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
                <option v-for="category in categories" :key="category.name">
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

        <div class="malware-grid">
            <div v-for="mal in truncatedMalware" :key="mal.id || mal.name" class="malware-card" @click="openModal(mal)">
                <div class="card-header">
                    <h3>{{ mal.name }}</h3>
                    <div class="tag-container">
                        <span class="category-tag">{{ mal.category }}</span>
                        <span :class="['type-tag', mal.itemType === 'Malware' ? 'malware-type' : 'infra-type']">
                            {{ mal.itemType }}
                        </span>
                    </div>
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
                <div>
                    <h2>{{ selectedMalware.name }}</h2>
                    <span :class="['type-badge', selectedMalware.itemType === 'Malware' ? 'malware-badge' : 'infra-badge']">
                        {{ selectedMalware.itemType }}
                    </span>
                </div>
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
                <button 
                    v-for="tab in availableTabs" 
                    :key="tab.id"
                    :class="['tab-button', { 
                        active: activeTab === tab.id,
                        disabled: isTabDisabled(tab.id)
                    }]" 
                    @click="!isTabDisabled(tab.id) && (activeTab = tab.id)"
                    :title="isTabDisabled(tab.id) ? getTabUnavailabilityReason(tab.id) : ''"
                >
                    <i :class="tab.icon"></i> {{ tab.label }}
                </button>
            </div>

            <div class="tab-content-container">
                <!-- Info Tab -->
                <div v-if="activeTab === 'info' && selectedMalware.infoContent" class="tab-content">
                    <div class="markdown-content" v-html="renderMarkdown(selectedMalware.infoContent)"></div>
                </div>

                <!-- Code Tab -->
                <div v-if="activeTab === 'code'" class="tab-content">
                    <div v-if="selectedMalware.codeFiles && selectedMalware.codeFiles.length > 0">
                        <div v-for="file in selectedMalware.codeFiles" :key="file.name" class="file-container">
                            <div class="file-header">
                                <i class="fas fa-file-code"></i>
                                <h3>{{ file.name }}</h3>
                            </div>
                            <pre><code :class="getLanguage(file.name)">{{ file.content }}</code></pre>
                        </div>
                    </div>
                    <div v-else-if="isTabDisabled('code')" class="content-unavailable">
                        <i class="fas fa-exclamation-triangle"></i> 
                        <span>Source code is not available for Infrastructure items</span>
                    </div>
                    <div v-else class="empty-content">
                        <i class="fas fa-code"></i>
                        <p>No code files available for this sample.</p>
                    </div>
                </div>

                <!-- Analysis Tab -->
                <div v-if="activeTab === 'analysis'" class="tab-content">
                    <div v-if="selectedMalware.analysisContent" class="markdown-content" v-html="renderMarkdown(selectedMalware.analysisContent)"></div>
                    <div v-else-if="isTabDisabled('analysis')" class="content-unavailable">
                        <i class="fas fa-exclamation-triangle"></i> 
                        <span>Analysis is not available for Infrastructure items</span>
                    </div>
                    <div v-else class="empty-content">
                        <i class="fas fa-microscope"></i>
                        <p>No analysis content available for this sample.</p>
                    </div>
                </div>

                <!-- Steps Tab -->
                <div v-if="activeTab === 'steps'" class="tab-content">
                    <div v-if="selectedMalware.stepsContent" class="markdown-content" v-html="renderMarkdown(selectedMalware.stepsContent)"></div>
                    <div v-else-if="isTabDisabled('steps')" class="content-unavailable">
                        <i class="fas fa-exclamation-triangle"></i> 
                        <span>Steps are not available for Malware samples</span>
                    </div>
                    <div v-else class="empty-content">
                        <i class="fas fa-list-ol"></i>
                        <p>No steps content available for this sample.</p>
                    </div>
                </div>

                <!-- Config Tab -->
                <div v-if="activeTab === 'config'" class="tab-content">
                    <div v-if="selectedMalware.configContent" class="markdown-content" v-html="renderMarkdown(selectedMalware.configContent)"></div>
                    <div v-else-if="isTabDisabled('config')" class="content-unavailable">
                        <i class="fas fa-exclamation-triangle"></i> 
                        <span>Configuration is not available for Malware samples</span>
                    </div>
                    <div v-else class="empty-content">
                        <i class="fas fa-cog"></i>
                        <p>No configuration content available for this sample.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import { ref, computed, nextTick, onMounted } from 'vue';
import axios from 'axios';
import { marked } from 'marked';
import hljs from 'highlight.js';

export default {
    setup() {
        const searchQuery = ref('');
        const allMalware = ref([]);
        const malware = ref([]);
        const selectedCategory = ref('');
        const errorMessage = ref('');
        const selectedMalware = ref(null);
        const isLoading = ref(true);
        const activeTab = ref('info');
        
        // Configure marked options for security
        marked.setOptions({
            headerIds: false,
            mangle: false,
            gfm: true,
            breaks: true,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            xhtml: false
        });

        const availableTabs = ref([
            { id: 'info', label: 'Information', icon: 'fas fa-info-circle' },
            { id: 'code', label: 'Source Code', icon: 'fas fa-code' },
            { id: 'analysis', label: 'Analysis', icon: 'fas fa-microscope' },
            { id: 'steps', label: 'Steps', icon: 'fas fa-list-ol' },
            { id: 'config', label: 'Configuration', icon: 'fas fa-cog' }
        ]);

        const categories = computed(() => {
            if (!allMalware.value.length) return [];
            
            const categoryCounts = {};
            allMalware.value.forEach(mal => {
                if (!categoryCounts[mal.category]) {
                    categoryCounts[mal.category] = 0;
                }
                categoryCounts[mal.category]++;
            });
            
            return Object.keys(categoryCounts).map(name => ({
                name,
                count: categoryCounts[name]
            })).sort((a, b) => a.name.localeCompare(b.name));
        });

        const hasTabContent = (tabId) => {
            if (!selectedMalware.value) return false;
            
            const itemType = selectedMalware.value.itemType;
            
            // For Malware items, disable Steps and Config tabs
            if (itemType === 'Malware') {
                if (tabId === 'steps' || tabId === 'config') {
                    return false;
                }
            }
            
            // For Infrastructure items, disable Code and Analysis tabs
            if (itemType === 'Infrastructure') {
                if (tabId === 'code' || tabId === 'analysis') {
                    return false;
                }
            }
            
            // Check if content exists for tabs
            switch(tabId) {
                case 'info': return !!selectedMalware.value.infoContent;
                case 'code': return selectedMalware.value.codeFiles?.length > 0;
                case 'analysis': return !!selectedMalware.value.analysisContent;
                case 'steps': return !!selectedMalware.value.stepsContent;
                case 'config': return !!selectedMalware.value.configContent;
                default: return false;
            }
        };

        const isTabDisabled = (tabId) => {
            if (!selectedMalware.value) return true;
            
            const itemType = selectedMalware.value.itemType;
            
            if (itemType === 'Malware') {
                return (tabId === 'steps' || tabId === 'config');
            }
            
            if (itemType === 'Infrastructure') {
                return (tabId === 'code' || tabId === 'analysis');
            }
            
            return false;
        };

        const getTabUnavailabilityReason = (tabId) => {
            if (!selectedMalware.value) return '';
            
            const itemType = selectedMalware.value.itemType;
            
            if (itemType === 'Malware' && (tabId === 'steps' || tabId === 'config')) {
                return `${tabId.charAt(0).toUpperCase() + tabId.slice(1)} are not applicable for Malware samples`;
            }
            
            if (itemType === 'Infrastructure' && (tabId === 'code' || tabId === 'analysis')) {
                return `${tabId.charAt(0).toUpperCase() + tabId.slice(1)} is not applicable for Infrastructure items`;
            }
            
            return '';
        };

        const renderMarkdown = (markdown) => {
            if (!markdown) return '';
            try {
                return marked(markdown);
            } catch (error) {
                console.error('Error rendering markdown:', error);
                return `<p>Error rendering content: ${error.message}</p>`;
            }
        };

        // Function to perform HTTP requests with retry capability
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

        // Extract metadata from markdown content
        const extractMetadata = (content) => {
            if (!content) return { description: '', category: 'Unknown', references: [] };
            
            try {
                const description = content.split('\n').find(line => 
                    line.trim().startsWith('## Description') || 
                    line.trim().startsWith('# Description') ||
                    line.trim().startsWith('## Overview')
                );
                
                let descriptionText = 'No description available';
                if (description) {
                    descriptionText = content.split(description)[1].split('##')[0].trim();
                } else {
                    // Fall back to first paragraph if no description heading
                    const firstParagraph = content.split('\n\n')[1];
                    if (firstParagraph && !firstParagraph.startsWith('#')) {
                        descriptionText = firstParagraph.trim();
                    }
                }
                
                // Try to find category
                const categoryLine = content.split('\n').find(line => 
                    line.toLowerCase().includes('category:') || 
                    line.toLowerCase().includes('type:')
                );
                let category = 'Unspecified';
                if (categoryLine) {
                    category = categoryLine.split(':')[1].trim();
                }
                
                // Try to find references
                const references = [];
                if (content.toLowerCase().includes('## references') || content.toLowerCase().includes('# references')) {
                    const referencesSection = content.split(/## references|# references/i)[1].split('##')[0];
                    // Updated regex to better catch different reference formats
                    const links = referencesSection.match(/\[.*?\]\((https?:\/\/\S+)\)|https?:\/\/\S+/g);
                    if (links) {
                        links.forEach(link => {
                            let url = link;
                            if (link.includes('](')) {
                                url = link.match(/\[.*?\]\((https?:\/\/\S+)\)/)[1];
                            }
                            if (url.startsWith('http')) {
                                references.push(url);
                            }
                        });
                    }
                }
                
                return {
                    description: descriptionText,
                    category,
                    references
                };
            } catch (error) {
                console.error('Error extracting metadata:', error);
                return { 
                    description: 'Error extracting description', 
                    category: 'Error', 
                    references: [] 
                };
            }
        };

        // Helper function to determine if item is likely a malware sample or infrastructure
        const determineItemType = (item) => {
            // Check for specific directories that indicate the type
            const hasAnalysis = item.analysisContent !== null;
            const hasConfig = item.configContent !== null;
            const category = item.category.toLowerCase();
            
            // Categories that strongly indicate malware
            const malwareKeywords = ['malware', 'virus', 'trojan', 'ransomware', 'worm', 'spyware', 'rootkit', 'backdoor', 'exploit'];
            
            // Categories that indicate infrastructure
            const infraKeywords = ['infrastructure', 'server', 'config', 'setup', 'guide'];
            
            if (malwareKeywords.some(keyword => category.includes(keyword)) || hasAnalysis) {
                return 'Malware';
            } else if (infraKeywords.some(keyword => category.includes(keyword)) || hasConfig) {
                return 'Infrastructure';
            }
            
            // Default fallback based on directory presence
            return hasAnalysis ? 'Malware' : 'Infrastructure';
        };

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

                // First check the root repository structure
                const repoUrl = 'https://api.github.com/repos/0x4F776C/ThreatPlayground/contents';
                const repoContentsResponse = await fetchWithRetry(repoUrl, { headers });
                
                // Check if we have a structured repo with Malware/Infrastructure directories
                const rootDirs = repoContentsResponse.data.filter(item => item.type === 'dir');
                const malwareDir = rootDirs.find(dir => dir.name === 'Malware');
                const infraDir = rootDirs.find(dir => dir.name === 'Infrastructure');
                
                let allEntries = [];
                
                // Process structured repository format
                if (malwareDir || infraDir) {
                    // Process Malware directory if it exists
                    if (malwareDir) {
                        const malwareContentsResponse = await fetchWithRetry(malwareDir.url, { headers });
                        const malwareSamples = await processCategoryDirectory(malwareContentsResponse.data, 'Malware', headers);
                        allEntries = [...allEntries, ...malwareSamples];
                    }
                    
                    // Process Infrastructure directory if it exists
                    if (infraDir) {
                        const infraContentsResponse = await fetchWithRetry(infraDir.url, { headers });
                        const infraSamples = await processCategoryDirectory(infraContentsResponse.data, 'Infrastructure', headers);
                        allEntries = [...allEntries, ...infraSamples];
                    }
                } else {
                    // Legacy/flat repository format - all directories at root
                    const entries = await processCategoryDirectory(rootDirs, null, headers);
                    allEntries = entries;
                }
                
                // Filter out nulls and sort by name
                allMalware.value = allEntries
                    .filter(item => item !== null)
                    .sort((a, b) => a.name.localeCompare(b.name));
                    
                malware.value = allMalware.value;
                
                // Cache the data
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
                        errorMessage.value = 'Failed to load data. Please try again later.';
                    }
                } else {
                    errorMessage.value = 'Failed to load data. Please try again later.';
                }
            } finally {
                isLoading.value = false;
            }
        };
        
        // Process directories within a category folder or root
        const processCategoryDirectory = async (directories, categoryPrefix, headers) => {
            return await Promise.all(directories.map(async (dir) => {
                try {
                    const dirContentsResponse = await fetchWithRetry(dir.url, { headers });
                    const dirContents = dirContentsResponse.data;
                    
                    // Get info.md or README.md content
                    const infoFile = dirContents.find(file => 
                        file.name.toLowerCase() === 'info.md' || 
                        file.name.toLowerCase() === 'readme.md'
                    );
                    
                    if (!infoFile) {
                        console.warn(`No info/README file found in ${dir.name}`);
                        return null;
                    }

                    const infoResponse = await fetchWithRetry(infoFile.download_url, { headers });
                    const infoContent = infoResponse.data;
                    
                    // Extract metadata from the info content
                    const metadata = extractMetadata(infoContent);
                    
                    // Get code files
                    const codeDir = dirContents.find(item => item.name.toLowerCase() === 'code' && item.type === 'dir');
                    let codeFiles = [];
                    
                    if (codeDir) {
                        const codeContentsResponse = await fetchWithRetry(codeDir.url, { headers });
                        codeFiles = await Promise.all(
                            codeContentsResponse.data
                            .filter(file => file.type === 'file')
                            .map(async (file) => {
                                const fileResponse = await fetchWithRetry(file.download_url, { headers });
                                return { 
                                    name: file.name, 
                                    content: fileResponse.data 
                                };
                            })
                        );
                    }
                    
                    // Get analysis content
                    const analysisDir = dirContents.find(item => 
                        item.name.toLowerCase() === 'analysis' && 
                        item.type === 'dir'
                    );
                    
                    let analysisContent = null;
                    if (analysisDir) {
                        try {
                            const analysisContentsResponse = await fetchWithRetry(analysisDir.url, { headers });
                            const analysisFiles = analysisContentsResponse.data.filter(file => 
                                file.name.toLowerCase().endsWith('.md')
                            );
                            
                            // Combine all analysis markdown files
                            if (analysisFiles.length) {
                                let allAnalysis = '';
                                for (const file of analysisFiles) {
                                    const fileResponse = await fetchWithRetry(file.download_url, { headers });
                                    allAnalysis += `# ${file.name.replace('.md', '')}\n\n${fileResponse.data}\n\n`;
                                }
                                analysisContent = allAnalysis;
                            }
                        } catch (error) {
                            console.warn(`Error loading analysis for ${dir.name}:`, error);
                        }
                    }
                    
                    // Get steps content
                    const stepsDir = dirContents.find(item => 
                        item.name.toLowerCase() === 'steps' && 
                        item.type === 'dir'
                    );
                    
                    let stepsContent = null;
                    if (stepsDir) {
                        try {
                            const stepsContentsResponse = await fetchWithRetry(stepsDir.url, { headers });
                            const stepsFile = stepsContentsResponse.data.find(file => 
                                file.name.toLowerCase().includes('steps') && 
                                file.name.endsWith('.md')
                            );
                            
                            if (stepsFile) {
                                const stepsResponse = await fetchWithRetry(stepsFile.download_url, { headers });
                                stepsContent = stepsResponse.data;
                            }
                        } catch (error) {
                            console.warn(`Error loading steps for ${dir.name}:`, error);
                        }
                    }
                    
                    // Get config content - check both 'config' and 'configuration-files' directories
                    const configDirs = dirContents.filter(item => 
                        (item.name.toLowerCase().includes('config') || 
                         item.name.toLowerCase() === 'configuration-files') && 
                        item.type === 'dir'
                    );
                    
                    let configContent = null;
                    if (configDirs.length > 0) {
                        try {
                            // Try each possible config directory
                            for (const configDir of configDirs) {
                                const configContentsResponse = await fetchWithRetry(configDir.url, { headers });
                                const configFiles = configContentsResponse.data.filter(file => file.name.endsWith('.md'));
                                
                                if (configFiles.length > 0) {
                                    let combinedConfig = '';
                                    // Combine all config markdown files
                                    for (const file of configFiles) {
                                        const configResponse = await fetchWithRetry(file.download_url, { headers });
                                        combinedConfig += `# ${file.name.replace('.md', '')}\n\n${configResponse.data}\n\n`;
                                    }
                                    configContent = combinedConfig;
                                    break; // Found config content, no need to check other dirs
                                }
                            }
                        } catch (error) {
                            console.warn(`Error loading config for ${dir.name}:`, error);
                        }
                    }

                    const entry = {
                        name: dir.name,
                        description: metadata.description,
                        category: metadata.category,
                        references: metadata.references,
                        infoContent,
                        codeFiles,
                        analysisContent,
                        stepsContent,
                        configContent
                    };
                    
                    // If categoryPrefix provided, determine if this is Malware or Infrastructure
                    if (!categoryPrefix) {
                        entry.itemType = determineItemType(entry);
                    } else {
                        entry.itemType = categoryPrefix;
                    }

                    return entry;
                } catch (error) {
                    console.error(`Error processing ${dir.name}:`, error);
                    return null;
                }
            }));
        };

        const searchMalware = () => {
            const query = searchQuery.value.toLowerCase();
            malware.value = allMalware.value.filter(item =>
                // Search in name and description
                (item.name.toLowerCase().includes(query) ||
                 item.description.toLowerCase().includes(query)) &&
                // Filter by selected category if needed
                (selectedCategory.value === '' || item.category === selectedCategory.value)
            );
        };

        const truncatedMalware = computed(() => {
            return malware.value.map(mal => ({
                ...mal,
                truncatedDescription: mal.description && mal.description.length > 70
                    ? mal.description.substring(0, 70) + '...'
                    : mal.description || 'No description available'
            }));
        });

        const escapeHtml = (unsafe) => {
            if (!unsafe) return '';
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        const openModal = (malware) => {
            selectedMalware.value = malware;
            
            // Select the first available and enabled tab with content
            let tabSelected = false;
            for (const tab of availableTabs.value) {
                if (hasTabContent(tab.id) && !isTabDisabled(tab.id)) {
                    activeTab.value = tab.id;
                    tabSelected = true;
                    break;
                }
            }
            
            // If no suitable tab was found, default to info tab
            if (!tabSelected) {
                activeTab.value = 'info';
            }
            
            document.body.classList.add('modal-open');
            
            nextTick(() => {
                highlightAll();
            });
        };

        const closeModal = () => {
            selectedMalware.value = null;
            document.body.classList.remove('modal-open');
        };

        const getLanguage = (fileName) => {
            if (!fileName) return 'language-plaintext';
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

        const darkMode = ref(
            localStorage.getItem('darkMode') === 'true' || 
            (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        );

        const applyTheme = (isDark) => {
            if (isDark) {
                document.documentElement.classList.add('dark-theme');
            } else {
                document.documentElement.classList.remove('dark-theme');
            }
            localStorage.setItem('darkMode', isDark);
        };

        const toggleTheme = () => {
            darkMode.value = !darkMode.value;
            applyTheme(darkMode.value);
        };

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
            applyTheme(darkMode.value);
            
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                    if (localStorage.getItem('darkMode') === null) {
                        darkMode.value = e.matches;
                        applyTheme(darkMode.value);
                    }
                });
            }
        });

        return {
            availableTabs,
            hasTabContent,
            isTabDisabled,
            getTabUnavailabilityReason,
            renderMarkdown,
            escapeHtml,
            searchQuery,
            categories,
            selectedCategory,
            malware,
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
            toggleTheme,
            clearSearch: () => {
                searchQuery.value = '';
                searchMalware();
            }
        };
    },
    updated() {
        this.$nextTick(() => {
            this.highlightAll();
        });
    }
}
</script>