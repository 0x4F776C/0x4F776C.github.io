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
            <input type="text" v-model="searchQuery" @input="searchSample" placeholder="Search for ...">
            <button v-if="searchQuery" @click="clearSearch" class="clear-search-btn" title="Clear search">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="category-select-wrapper">
            <i class="fas fa-filter filter-icon"></i>
            <select v-model="selectedCategory" @change="searchSample">
                <option value="">All Categories</option>
                <option v-for="category in categories" :key="category.name" :value="category.name">
                    {{ category.name }} ({{ category.count }})
                </option>
            </select>
        </div>
    </div>

    <div v-if="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Loading data from 0x4F776C/ThreatPlayground...</p>
    </div>

    <div v-else>
        <div v-if="errorMessage" class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>{{ errorMessage }}</p>
        </div>

        <div class="sample-grid">
            <div v-for="sample in truncatedSample" :key="sample.id || sample.name" class="sample-card" @click="openModal(sample)">
                <div class="card-header">
                    <h3>{{ sample.name }}</h3>
                    <div class="tag-container">
                        <span class="category-tag">{{ sample.category }}</span>
                        <span :class="['type-tag', sample.itemType === 'Malware' ? 'malware-type' : 'infra-type']">
                            {{ sample.itemType }}
                        </span>
                    </div>
                </div>
                <p class="description">{{ sample.truncatedDescription }}</p>
                <div class="card-footer">
                    <span class="view-details">View details <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>
        </div>
    </div>

    <div v-if="selectedSample" class="modal" @click="closeModal">
        <div class="modal-content" @click.stop="">
            <div class="modal-header">
                <div>
                    <h2>{{ selectedSample.name }}</h2>
                    <span :class="['type-badge', selectedSample.itemType === 'Malware' ? 'malware-badge' : 'infra-badge']">
                        {{ selectedSample.itemType }}
                    </span>
                </div>
                <span class="close" @click="closeModal"><i class="fas fa-times"></i></span>
            </div>

            <div class="modal-meta">
                <div class="meta-item">
                    <i class="fas fa-tag"></i>
                    <p><strong>Category:</strong> {{ selectedSample.category }}</p>
                </div>
            </div>

            <div class="description-section">
                <h3><i class="fas fa-info-circle"></i> Description</h3>
                <p>{{ selectedSample.description }}</p>
            </div>

            <div v-if="selectedSample.references && selectedSample.references.length > 0" class="references-section">
                <h3><i class="fas fa-link"></i> References</h3>
                <ul>
                    <li v-for="ref in selectedSample.references" :key="ref">
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
                <div v-if="activeTab === 'info' && selectedSample.infoContent" class="tab-content">
                    <div class="markdown-content" v-html="renderMarkdown(selectedSample.infoContent)"></div>
                </div>

                <!-- Code Tab -->
                <div v-if="activeTab === 'code'" class="tab-content">
                    <div v-if="selectedSample.codeFiles && selectedSample.codeFiles.length > 0">
                        <div v-for="file in selectedSample.codeFiles" :key="file.name" class="file-container">
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
                    <div v-if="selectedSample.analysisContent" class="markdown-content" v-html="renderMarkdown(selectedSample.analysisContent)"></div>
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
                    <div v-if="selectedSample.stepsContent" class="markdown-content" v-html="renderMarkdown(selectedSample.stepsContent)"></div>
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
                    <div v-if="selectedSample.configContent" class="markdown-content" v-html="renderMarkdown(selectedSample.configContent)"></div>
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
        const allSample = ref([]);
        const sample = ref([]);
        const selectedCategory = ref('');
        const errorMessage = ref('');
        const selectedSample = ref(null);
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
            if (!allSample.value.length) return [];
            
            const categoryCounts = {};
            allSample.value.forEach(sample => {
                if (!categoryCounts[sample.category]) {
                    categoryCounts[sample.category] = 0;
                }
                categoryCounts[sample.category]++;
            });
            
            return Object.keys(categoryCounts).map(name => ({
                name,
                count: categoryCounts[name]
            })).sort((a, b) => a.name.localeCompare(b.name));
        });

        const hasTabContent = (tabId) => {
            if (!selectedSample.value) return false;
            
            const itemType = selectedSample.value.itemType;
            
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
                case 'info': return !!selectedSample.value.infoContent;
                case 'code': return selectedSample.value.codeFiles?.length > 0;
                case 'analysis': return !!selectedSample.value.analysisContent;
                case 'steps': return !!selectedSample.value.stepsContent;
                case 'config': return !!selectedSample.value.configContent;
                default: return false;
            }
        };

        const isTabDisabled = (tabId) => {
            if (!selectedSample.value) return true;
            
            const itemType = selectedSample.value.itemType;
            
            if (itemType === 'Malware') {
                return (tabId === 'steps' || tabId === 'config');
            }
            
            if (itemType === 'Infrastructure') {
                return (tabId === 'code' || tabId === 'analysis');
            }
            
            return false;
        };

        const getTabUnavailabilityReason = (tabId) => {
            if (!selectedSample.value) return '';
            
            const itemType = selectedSample.value.itemType;
            
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
                // Create custom renderer to handle GitHub images
                const renderer = new marked.Renderer();
                
                // Custom image renderer to handle GitHub image paths
                renderer.image = (href, title, text) => {
                    // Safety check - ensure href is a string
                    if (href && typeof href === 'object' && href.href) {
                        console.log('Converting href object to string:', href);
                        href = href.href;
                    }
                    
                    // Now check if href is a valid string
                    if (!href || typeof href !== 'string') {
                        console.error('Invalid image href:', href);
                        return `<span class="image-error">Image Error</span>`;
                    }
                    
                    // Check if it's a relative path (not starting with http or https)
                    if (!href.startsWith('http') && !href.startsWith('data:')) {
                        // For GitHub Pages, we need to adjust the path
                        // Remove leading slashes that may cause issues
                        href = href.replace(/^\/+/, '');
                        
                        // If we have the current sample context, we can make the path more precise
                        if (selectedSample.value) {
                            let basePath = '';
                            
                            // Determine the base path based on item type
                            if (selectedSample.value.itemType === 'Malware') {
                                basePath = `Malware/${selectedSample.value.name}/`;
                            } else {
                                basePath = `Infrastructure/${selectedSample.value.name}/`;
                            }
                            
                            // Check which tab is active to determine the subdirectory
                            if (activeTab.value === 'info') {
                                // Images referenced from info.md are at the sample root
                                href = basePath + href;
                            } else if (activeTab.value === 'analysis') {
                                href = basePath + 'analysis/' + href;
                            } else if (activeTab.value === 'steps') {
                                href = basePath + 'steps/' + href;
                            } else if (activeTab.value === 'config') {
                                href = basePath + 'configuration-files/' + href;
                            } else {
                                // Default case - just append to the sample base path
                                href = basePath + href;
                            }
                        }
                        
                        // For GitHub Pages deployment, we need to use the base path
                        const baseUrl = window.location.pathname.includes('ThreatPlayground') ? 
                            '/ThreatPlayground/' : '/';
                        href = baseUrl + href;
                    }
                    
                    // Safely handle title which might be null or undefined
                    const safeTitle = title ? title.toString() : '';
                    const safeAlt = text ? text.toString() : 'Image';
                    
                    // Return the HTML for the image with error handling
                    return `<img src="${href}" alt="${safeAlt}" title="${safeTitle}" 
                            onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\'%3E%3Cpath fill=\\'%23ccc\\' d=\\'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z\\'/%3E%3C/svg%3E'; this.style.padding='2px'; this.style.border='1px solid #ddd';" class="markdown-image" />`;
                };
                
                // Set custom renderer in options
                marked.setOptions({
                    headerIds: false,
                    mangle: false,
                    gfm: true,
                    breaks: true,
                    sanitize: false,
                    smartLists: true,
                    smartypants: true,
                    xhtml: false,
                    renderer: renderer
                });
                
                return marked(markdown);
            } catch (error) {
                console.error('Error rendering markdown:', error);
                return `<p>Error rendering content: ${error.message}</p>`;
            }
        };

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

        const loadSample = async () => {
            try {
                const cachedData = localStorage.getItem('cachedSampleData');
                const cachedTimestamp = localStorage.getItem('cachedSampleTimestamp');
                const CACHE_VALIDITY = 24 * 60 * 60 * 1000;

                if (cachedData && cachedTimestamp) {
                    const currentTime = new Date().getTime();
                    const cacheAge = currentTime - parseInt(cachedTimestamp);

                    if (cacheAge < CACHE_VALIDITY) {
                        allSample.value = JSON.parse(cachedData);
                        sample.value = allSample.value;
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
                allSample.value = allEntries
                    .filter(item => item !== null)
                    .sort((a, b) => a.name.localeCompare(b.name));
                    
                sample.value = allSample.value;
                
                // Cache the data
                localStorage.setItem('cachedSampleData', JSON.stringify(allSample.value));
                localStorage.setItem('cachedSampleTimestamp', new Date().getTime().toString());
                
            } catch (error) {
                console.error('Error fetching sample:', error);
                
                if (error.response && error.response.status === 403) {
                    const rateLimitRemaining = error.response.headers['x-ratelimit-remaining'];
                    const rateLimitReset = error.response.headers['x-ratelimit-reset'];
                    
                    if (rateLimitRemaining === '0') {
                        const resetDate = new Date(rateLimitReset * 1000);
                        const resetTimeString = resetDate.toLocaleTimeString();
                        
                        errorMessage.value = `GitHub API rate limit exceeded. Limit will reset at ${resetTimeString}. Using cached data if available.`;
                        
                        const cachedData = localStorage.getItem('cachedSampleData');
                        if (cachedData) {
                            allSample.value = JSON.parse(cachedData);
                            sample.value = allSample.value;
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

        const searchSample = () => {
            const query = searchQuery.value.toLowerCase();
            sample.value = allSample.value.filter(item =>
                // Search in name and description
                (item.name.toLowerCase().includes(query) ||
                 item.description.toLowerCase().includes(query)) &&
                // Filter by selected category if needed
                (selectedCategory.value === '' || item.category === selectedCategory.value)
            );
        };

        const truncatedSample = computed(() => {
            return sample.value.map(sample => ({
                ...sample,
                truncatedDescription: sample.description && sample.description.length > 70
                    ? sample.description.substring(0, 70) + '...'
                    : sample.description || 'No description available'
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

        const setupImageHandlers = () => {
            nextTick(() => {
                document.querySelectorAll('.markdown-content img').forEach((img) => {
                    img.style.cursor = 'pointer';
                    img.addEventListener('click', (e) => {
                        window.open(e.target.src, '_blank');
                    });
                    // Add title indicating users can click to enlarge
                    if (!img.title) {
                        img.title = 'Click to enlarge';
                    }
                });
            });
        };

        const openModal = (sample) => {
            selectedSample.value = sample;
            
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
                setupImageHandlers();
            });
        };

        const closeModal = () => {
            selectedSample.value = null;
            document.body.classList.remove('modal-open');
        };

        const getLanguage = (fileName) => {
            if (!fileName) return 'language-plaintext';
            const extension = fileName.split('.').pop().toLowerCase();
            const languageMap = {
                // General-purpose programming languages
                'c': 'language-c',
                'h': 'language-c',
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
                if (e.key === 'Escape' && selectedSample.value) {
                    closeModal();
                }
            });
        };

        onMounted(() => {
            loadSample();
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
            sample,
            searchSample,
            selectedSample,
            truncatedSample,
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
                searchSample();
            }
        };

        watch(activeTab, () => {
            nextTick(() => {
                highlightAll();
                setupImageHandlers();
            });
        });
    },
    updated() {
        this.$nextTick(() => {
            this.highlightAll();
        });
    }
}
</script>