<div align="center">
  <img src="public/EvoNESTlogo.svg" alt="EvoNEST Logo" width="200" height="200">
  
  # EvoNEST Backbone
  
  **Evolutionary, Ecological and Biological Nexus of Experiments, Samples and Traits**
  
  
  <p align="center">
    <a href="https://daniele-liprandi.github.io/EvoNEST-backbone/">
      <img src="https://img.shields.io/badge/View_Full_Documentation-4285F4?style=for-the-badge&logoColor=white" alt="Documentation" height="40">
    </a>
  </p>
  
  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white" alt="Next.js">
    <img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white" alt="MongoDB">
    <img src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
  </p>
  
  <p align="center">
    <a href="https://doi.org/10.7717/peerj-cs.3186">
      <img src="https://img.shields.io/badge/PeerJ-10.7717%2Fpeerj--cs.3186-1e88e5?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiIGZpbGw9IndoaXRlIi8+PC9zdmc+&logoColor=white" alt="Cite as" height="28">
    </a>
  </p>
</div>

---

## About *EvoNEST* 

*EvoNEST* is a modular data management application designed to minimize data handling and conversions by integrating all aspects of biodiversity research—from specimen sourcing to publication—into a unified platform.

Here you can find *EvoNEST Backbone*, the core of the app. It is a fully functional version of the application, ready to be customised further for the specific needs of different labs.

<p align="center">
  <a href="https://doi.org/10.7717/peerj-cs.3186">
    <img src="https://img.shields.io/badge/PeerJ-10.7717%2Fpeerj--cs.3186-1e88e5?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiIGZpbGw9IndoaXRlIi8+PC9zdmc+&logoColor=white" alt="Cite on PeerJ">
  </a>
</p>

## Features

- **Data Collection**: Streamline the process of gathering detailed biomechanical data from a wide range of animal species, including in-field data entry and automated data imports from various sensors and instruments.

- **Data Analysis**: Provide tools for statistical analysis, data visualization, and computational modeling directly within the platform, leveraging advanced algorithms and machine learning to derive insights from complex datasets.

- **Data Sharing**: Facilitate secure and efficient sharing of data and findings among researchers worldwide, ensuring data integrity and compliance with the FAIR data principles.

- **Visualization Tools**: Integrated plotting and graphing tools that allow users to visualize data trends and patterns, customize views, and generate publication-ready figures.

- **API Integration**: Support for API integrations to connect with external databases, analytical tools, and other research platforms, enhancing the capability to automate data flows and expand analytical functionalities.

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Deployment**: Docker

## Documentation

<div align="center">
  <a href="https://daniele-liprandi.github.io/EvoNEST-backbone/">
    <img src="https://img.shields.io/badge/View_Full_Documentation-4285F4?style=for-the-badge&logoColor=white" alt="Documentation" height="100">
  </a>
</div>

Comprehensive user guides, API documentation, and developer resources are available in our documentation site.

### Quick Links

- **[Getting Started Guide](https://daniele-liprandi.github.io/EvoNEST-backbone/getting-started/)** - Quick setup and first steps
- **[User Guide](https://daniele-liprandi.github.io/EvoNEST-backbone/user-guide/)** - Complete feature documentation
- **[Developer Guide](https://daniele-liprandi.github.io/EvoNEST-backbone/developer-guide/)** - Contributing and development setup

### Local Documentation Development

To work on documentation locally with Docker:

```bash
cd docs
docker-compose up
```

The documentation is built with [VitePress](https://vitepress.dev/) and automatically deployed to GitHub Pages.

---

### Maintenance

#### Useful Commands
```bash
# Stop containers
docker compose down

# Restart containers
docker compose restart

# View logs
docker compose logs -f

# Remove all data
docker compose down -v
```

---


### Troubleshooting

1. **Node Modules Issues**
   - If you encounter module-related errors, try removing the node_modules volume:
   ```bash
   docker compose -f docker-compose.dev.yml down -v
   docker compose -f docker-compose.dev.yml up --build
   ```

2. **Port Conflicts**
   - The development setup uses ports 3005 and 27019
   - If these ports are in use, modify the port mappings in docker-compose.dev.yml

3. **File Permission Issues**
   - If you encounter permission issues with the mounted volumes, check the file ownership and permissions in your project directory


---

## Support and Contact

For additional support:
- Check the project documentation
- Submit issues on the project repository

⚠️ Security Note: Never share your `.env` files or sensitive credentials.