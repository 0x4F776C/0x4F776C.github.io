# ThreatPlayground

[![pages-build-deployment](https://github.com/0x4F776C/0x4F776C.github.io/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/0x4F776C/0x4F776C.github.io/actions/workflows/pages/pages-build-deployment)

ThreatPlayground is a web application designed to provide information about various types of malware and cybersecurity threats. It serves as an educational platform for cybersecurity enthusiasts, researchers, and professionals to explore and learn about different malware categories and their characteristics.

## Features

1. **Malware Database**: The application displays a comprehensive list of malware, including their names, categories, and descriptions.

2. **Search Functionality**: Users can search for specific malware using keywords that match either the name or description of the malware.

3. **Category Filtering**: The app allows filtering malware by categories, making it easy to explore threats within specific domains.

4. **Detailed Malware Information**: Clicking on a malware item opens a modal with more detailed information, including:
   - Full description
   - Malware analysis steps
   - Sample code (when available)
   - References and external links

5. **GitHub Repository Integration**: The app fetches and displays the owner's GitHub repositories, allowing users to explore related projects.

6. **Repository File Tree**: Users can view the file structure of each GitHub repository, providing insight into the project organization.

7. **Responsive Design**: The interface is designed to be responsive and work well on various device sizes, from desktop to mobile.

## Technical Stack

- **Frontend Framework**: Vue.js 3 with Composition API
- **Styling**: Custom CSS with a cybersecurity-themed design
- **HTTP Requests**: Axios for fetching data from APIs and JSON files
- **Version Control**: Git (assumed, given GitHub integration)

## Work in Progress (WIPs)

Based on the current implementation, here are some potential areas for future development:

1. **Real-time Threat Intelligence**: Integrate with threat intelligence APIs to provide up-to-date information on emerging threats.

2. **Visualization Enhancements**: Add more interactive visualizations, such as malware family trees or infection vector diagrams.

3. **Advanced Search Options**: Enhance the search functionality with filters for date ranges, severity levels, or affected platforms.

## Non-technical WIPs

1. **Split CSS file**: Separate CSS files into different category to reduce clutter.

## Contributing

Fork the repo or dm me to include your work! Credits will be given :)

## License

Released under MIT license

## Tools
https://jsoneditoronline.org/

## References
https://exploit-notes.hdks.org/
https://attack.mitre.org/
