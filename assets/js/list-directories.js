document.addEventListener('DOMContentLoaded', function() {
    const resultsContainer = document.getElementById('results');
    const repoOwner = '0x4F776C';
    const repoNames = [
        'ThreatPlayground',
        'Windows-Malware-Dropper',
        'PowerSnail',
        'Honeyd-Configs',
        'DynamoRIO-x-Ghidra'
    ];
    const depth = 2;

    // Access the GitHub token from the environment variable
    const githubToken = window.GITHUB_TOKEN;

    if (!githubToken) {
        resultsContainer.innerHTML = '<div class="error">GitHub token not available.</div>';
        console.error('GitHub token not available.');
        return;
    }

    listRepositories(depth);

    async function listRepositories(depth) {
        try {
            resultsContainer.innerHTML = '<div class="loading">Loading directories...</div>';
            const allDirectories = {};
            const displaySubdirectories = {};

            async function traverseDirectory(path, currentDepth, repoName) {
                if (currentDepth > depth) {
                    return;
                }

                const cacheKey = `directories-${repoOwner}-${repoName}-${path}`;
                const cachedData = getCachedData(cacheKey);

                if (cachedData) {
                    const directories = cachedData.data.filter(item => item.type === 'dir');

                    for (const dir of directories) {
                        if (path !== '') {
                            allDirectories[`${repoName}/${dir.path}`] = dir.html_url;
                        }
                        await traverseDirectory(dir.path, currentDepth + 1, repoName);
                    }
                    return; // Return early if cached
                }

                const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`, {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                cacheData(cacheKey, data); // Cache data
                const directories = data.filter(item => item.type === 'dir');

                for (const dir of directories) {
                    if (path !== '') {
                        allDirectories[`${repoName}/${dir.path}`] = dir.html_url;
                    }
                    await traverseDirectory(dir.path, currentDepth + 1, repoName);
                }
            }

            for (const repoName of repoNames) {
                const readmeCacheKey = `readme-${repoOwner}-${repoName}`;
                const cachedDisplaySubdirectories = getCachedData(readmeCacheKey);

                if (cachedDisplaySubdirectories) {
                    displaySubdirectories[repoName] = cachedDisplaySubdirectories.data;
                } else {
                    displaySubdirectories[repoName] = await checkDisplaySubdirectories(repoOwner, repoName, githubToken);
                    cacheData(readmeCacheKey, displaySubdirectories[repoName]); // Cache data
                }

                await traverseDirectory('', 1, repoName);
            }

            if (Object.keys(allDirectories).length === 0) {
                resultsContainer.innerHTML = `<p>No directories found within the specified depth.</p>`;
                return;
            }

            // Organize directories by parent
            const organizedDirectories = {};
            for (const path in allDirectories) {
                const parts = path.split('/');
                const repoName = parts.shift();
                const parent = parts.slice(0, -1).join('/');
                const name = parts.pop();

                if (!organizedDirectories[`${repoName}/${parent}`]) {
                    organizedDirectories[`${repoName}/${parent}`] = [];
                }
                organizedDirectories[`${repoName}/${parent}`].push({ name, url: allDirectories[path] });
            }

            // Generate HTML
            let html = '<h3>Repositories and Subdirectories:</h3>';
            const processedRepos = new Set();

            // First, handle repositories with subdirectories
            for (const parent in organizedDirectories) {
                const pathParts = parent.split('/');
                const repoName = pathParts[0];
                processedRepos.add(repoName);
                
                if (displaySubdirectories[repoName]) {
                    if (pathParts.length > 1 && pathParts[1] !== '') {
                        // Subdirectories of repository
                        const subdirectoryName = pathParts.slice(1).join('/'); // Remove repo name
                        html += `<h4>[${subdirectoryName} in ${repoName}]:</h4><ul>`; // Updated format
                        organizedDirectories[parent].forEach(dir => {
                            html += `<li><a href="${dir.url}" target="_blank">${dir.name}</a></li>`;
                        });
                        html += '</ul>';
                    } else {
                        // Root level directories
                        html += `<h4>[Root in ${repoName}]:</h4><ul>`; // Updated format
                        organizedDirectories[parent].forEach(dir => {
                            html += `<li><a href="${dir.url}" target="_blank">${dir.name}</a></li>`;
                        });
                        html += '</ul>';
                    }
                } else {
                    // If display-subdirectories is false, show repo name with link to the repo
                    if (!processedRepos.has(`link-${repoName}`)) {
                        processedRepos.add(`link-${repoName}`);
                        const repoUrl = `https://github.com/${repoOwner}/${repoName}`;
                        html += `<h4>[Repository] <a href="${repoUrl}" target="_blank">${repoName}</a></h4>`;
                    }
                }
            }

            // Handle repositories with no subdirectories or where display-subdirectories is false
            for (const repoName of repoNames) {
                if (!processedRepos.has(repoName) && !processedRepos.has(`link-${repoName}`)) {
                    const repoUrl = `https://github.com/${repoOwner}/${repoName}`;
                    html += `<h4>[Repository] <a href="${repoUrl}" target="_blank">${repoName}</a></h4>`;
                }
            }

            resultsContainer.innerHTML = html;

        } catch (error) {
            resultsContainer.innerHTML = `<div class="error">${error.message}</div>`;
            console.error('Error listing directories:', error);
        }
    }

    async function checkDisplaySubdirectories(owner, repo, token) {
        try {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                return false;
            }

            const readmeData = await response.json();
            const readmeContent = atob(readmeData.content);

            // Regex to match HTML comments containing the display-subdirectories setting
            const regex = /<!--\s*display-subdirectories:\s*(true|false)\s*-->/i;
            const match = readmeContent.match(regex);

            if (match && match[1]) {
                return match[1].toLowerCase() === 'true';
            }

            return false; // Default to false if key not found or no valid match
        } catch (error) {
            console.error('Error checking display subdirectories:', error);
            return false;
        }
    }
    
    // Cache helper functions
    function cacheData(key, data) {
        const cache = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cache));
    }

    function getCachedData(key) {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const cache = JSON.parse(cached);
        const now = Date.now();
        const cacheDuration = 10 * 60 * 1000; // 10 minutes cache duration

        if (now - cache.timestamp > cacheDuration) {
            localStorage.removeItem(key); // Invalidate cache if expired
            return null;
        }

        return cache;
    }
});