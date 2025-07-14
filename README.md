# EvoNEST

EvoNEST is a web-based application designed to facilitate the collection, analysis, and sharing of biomechanical data across diverse animal species. This platform is intended for global collaborative research, enabling scientists from various disciplines to access, contribute, and interpret biomechanical datasets in a centralized repository.

## Features

- **Data Collection**: Streamline the process of gathering detailed biomechanical data from a wide range of animal species, including in-field data entry and automated data imports from various sensors and instruments.

- **Data Analysis**: Provide tools for statistical analysis, data visualization, and computational modeling directly within the platform, leveraging advanced algorithms and machine learning to derive insights from complex datasets.

- **Data Sharing**: Facilitate secure and efficient sharing of data and findings among researchers worldwide, ensuring data integrity and compliance with global data protection standards.

- **User Management**: Implement robust user authentication and authorization to manage access rights and data privacy, accommodating various levels of user interaction from viewing through to administrative controls.

- **Visualization Tools**: Integrated plotting and graphing tools that allow users to visualize data trends and patterns, customize views, and generate publication-ready figures.

- **Collaboration Tools**: Features to support collaboration, such as shared projects, commenting, and annotation systems, real-time updates, and version control.

- **API Integration**: Support for API integrations to connect with external databases, analytical tools, and other research platforms, enhancing the capability to automate data flows and expand analytical functionalities.

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Deployment**: Docker

## Documentation

📚 **[View Full Documentation](https://yourusername.github.io/EvoNext/)** 

Comprehensive user guides, API documentation, and developer resources are available in our documentation site. The documentation includes:

- **Getting Started Guide** - Quick setup and first steps
- **User Guide** - Complete feature documentation
- **Developer Guide** - Contributing and development setup
- **API Reference** - Technical API documentation

### Local Documentation Development

To work on documentation locally with Docker:

```bash
cd docs
docker-compose up
```

The documentation is built with [VitePress](https://vitepress.dev/) and automatically deployed to GitHub Pages.

---

## Production Environment Setup

This guide will help you set up EvoNEST in production mode on a new machine using Docker Desktop.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running on your machine
- Basic familiarity with command line interface
- Access to the EvoNEST Docker repository

### Installation Steps

#### 1. Create Project Directory

Create the project directory,

```bash
mkdir evonest
cd evonest
```

#### 2. Prepare Docker

Load the docker image provided in the repository

```bash
docker load path/to/docker_image.tar
```

#### 3. Set Up Configuration Files

##### a. Create docker-compose.yml with the following contents
```yaml
services: 
  node: 
    # image: loaded_image_name 
    container_name: evonest_backbone_prod
    restart: unless-stopped
    environment:
      NODE_ENV: production
      MONGODB_URI: "mongodb://root:pass@mongo:27017"
    env_file:
      - .env.production
    volumes:
      - file_storage:/usr/evonest/file_storage
    ports:
      - "3000:3000"
    depends_on:
      - mongo

  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    container_name: evonest_mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: pass
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
  file_storage:
```

##### b. Security Setup

1. Generate your own secret key for NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

2. Create .env.production:
Create a new file called `.env.production` in your project directory with the following content and your secret key:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
MONGODB_URI=mongodb://root:pass@mongo:27017
STORAGE_PATH='/usr/evonest/file_storage'
```

##### c. Update your MongoDB Credentials Configuration

1. In docker-compose.yml change:
```yaml
mongo:
  environment:
    MONGO_INITDB_ROOT_USERNAME: your_custom_username
    MONGO_INITDB_ROOT_PASSWORD: your_custom_password
```

2. Update MongoDB URI:
```yaml
# In docker-compose.yml
environment:
  MONGODB_URI: "mongodb://your_custom_username:your_custom_password@mongo:27017"

# In .env.production
MONGODB_URI=mongodb://your_custom_username:your_custom_password@mongo:27017
```

#### 3. Deployment

Open a terminal in your project directory and run:

```bash
# Pull images
docker compose pull

# Start services
docker compose up -d
```

#### 4. Verification

```bash
# Check containers
docker compose ps

# Check logs
docker compose logs


# Visit http://localhost:3000 to work with your application
```
### Common Issues

1. **Port Conflicts**
   - If port 3000 or 27017 is already in use, modify the port mappings in docker-compose.yml
   - Example: Change `"3000:3000"` to `"3001:3000"`

2. **MongoDB Connection Issues**
   - Verify MongoDB container is running: `docker compose ps`
   - Check MongoDB logs: `docker compose logs mongo`
   - Ensure MONGODB_URI in .env.production matches the configuration

3. **Container Start Failures**
   - Check logs: `docker compose logs`
   - Verify all environment variables are set correctly
   - Ensure Docker Desktop has enough resources allocated


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

#### Backup Procedure
```bash
# Stop containers
docker compose down

# Backup data
docker run --rm -v evonest_mongo_data:/data -v $(pwd):/backup alpine tar cvf /backup/mongo-backup.tar /data
```

---

## Development Environment Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Git](https://git-scm.com/) installed
- Access to the EvoNEST repository
- Basic familiarity with command line interface

### Installation Steps

#### 1. Repository Setup

##### a. Clone the repository
```bash
git clone https://anonymised_for_revision/evonest-backbone.git
cd evonest
```

##### b. Go to the right branch
```bash
git checkout backbone_final_tobescraped  
```

#### 2. Security Setup

##### 1. Generate your own secret key for NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

##### 2. Create a new file called `.env.local` in your project directory with the following content:

```env
NEXTAUTH_SECRET=your-secret-key
```

#### 3. Development Environment Launch
```bash
docker compose -f docker-compose.dev.yml up --build
```


#### 4. Verify Development Setup

1. Check if containers are running:
```bash
docker compose -f docker-compose.dev.yml ps
```

You should see both containers (`evonest_dev` and `evonest_mongodb_dev`) running.

2. Visit `http://localhost:3005` in your web browser to verify the application is running.

3. Make a change to any source file and verify that the application hot-reloads.


### Development info

#### MongoDB Access
The development MongoDB instance is accessible at:
- Host: localhost
- Port: 27019
- Username: root
- Password: pass




#### Development Commands
```bash
# Start the development environment
docker compose -f docker-compose.dev.yml up

# Start in detached mode
docker compose -f docker-compose.dev.yml up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop all containers
docker compose -f docker-compose.dev.yml down

# Rebuild and restart containers
docker compose -f docker-compose.dev.yml up --build

# Remove all development volumes (WARNING: Deletes all development data)
docker compose -f docker-compose.dev.yml down -v
```

### Changing Definitions inside the NEST

To modify the types used in the NEST, you need to edit the `types.ts` file located in the `src/utils` directory. This file contains the definitions for various types used throughout the application.

#### Steps to Edit `types.ts`

1. **Locate the File**:
   Navigate to the `src/utils` directory in your project and open the `types.ts` file.

2. **Modify Type Definitions**:
   You can add, remove, or update the type definitions as needed. For example, to add a new sample type, you can modify the `sampletypes` array.

   ```typescript
   // filepath: /mnt/sda2/node/evonestDev/src/utils/types.ts
   // ...existing code...
   export const sampletypes: LabelType[] = [
       // ...existing code...
       { label: "New Sample", value: "new_sample", description: "Description of new sample", shortened: "ns" },
       // ...existing code...
   ];
   // ...existing code...
   ```

3. **Save Changes**:
   After making the necessary changes, save the file.

4. **Rebuild the Project**:
   If you are running the project in a development environment, the changes should be picked up automatically. If not, you may need to rebuild the project.

   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

5. **Verify Changes**:
   Ensure that the changes are reflected in the application by checking the Types menu in the navbar on top

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