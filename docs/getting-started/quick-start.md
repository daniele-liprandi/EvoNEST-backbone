# Quick Start Guide

Get EvoNEST running in just a few minutes with this quick start guide.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git (for cloning the repository)
- A modern web browser (Chrome, Firefox, Safari, or Edge)

You also need basic familiarity with the command line interface.

## Installation guide

### Setting up the development environment

Before deploying EvoNEST to production, it's recommended to test the application in a development environment. This allows you to verify that everything works correctly and to make any necessary adjustments. If you do not want to do this, you can skip to the [Production setup](#production-setup) section.


#### 1. Clone the repository

```bash
git clone https://git.uni-greifswald.de/liprandid/EvoNext.git
cd EvoNext
```

#### 2. Set up environment files

In this repository, you will find already configured environment files for production and development. You should start by editing them to match your environment. The mandatory step is to set up your NEXTAUTH secret. You can generate it by running the following command:

```bash
openssl rand -base64 32
```

Create a new file called `.env.local` in your project directory with the following content and your key:

```env
NEXTAUTH_SECRET=your-secret-key
```


Go to the file `docker-compose.dev.yml` and set up the `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` variables to secure your MongoDB instance. 

```bash
# Make sure to also set your MongoDB connection string in the .env file
MONGO_URL=mongodb://your_username:your_secure_password@mongo:27017
```

Finally, create a new file called `.env.development` containing

```env
NEXTAUTH_URL=http://localhost:3005
MONGODB_URI=mongodb://your_username:your_secure_password@mongo:27019
STORAGE_PATH='/usr/evonest/file_storage_dev'
```


#### 3. Start the development environment

Make sure that your docker instance is running and execute

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will start:

- **EvoNEST Application**: Available at `http://localhost:3005`
- **MongoDB Database**: Running on port `27019` with authentication
- **Admin Tools**: Mongo Express tool for managing the database, available at `http://localhost:8081`

#### 4. Access EvoNEST

Open your browser and navigate to `http://localhost:3005`

### Setting up the production environment

If you haven't already, make sure to complete [Step 1](#1-clone-the-repository) and [Step 2](#2-set-up-environment-files) before proceeding.


Finally, create the production environment file `.env.production`

```env
NEXTAUTH_URL=http://localhost:3000
MONGODB_URI=mongodb://your_username:your_secure_password@mongo:27017
STORAGE_PATH='/usr/evonest/file_storage'
```

To start the production setup, make sure that your docker instance is running and execute

```bash
docker-compose -f docker-compose.yml up -d
```


This will start:

- **Production Server**: Available at `http://localhost:3000`
- **MongoDB Database**: Running on port `27017` with authentication
- **Admin Tools**: Mongo Express tool for managing the database, available at `http://localhost:8081`
- **Backup Service**: Scheduled backups of the database, making copies of your data every 24 hours for a week, every week for a month, and month for a year.


## First login

1. Navigate to the EvoNEST application in your browser
2. Login using the default credentials:
   - **Username**: `admin`
    - **Password**: `pass`

> **Note**: We strongly advise to set up Nextauth with a secure provider of your choice, compatible with the rules of your institution. EvoNEST leverages NextJS, meaning that you can use any NextAuth provider, such as Google, GitHub, or custom OAuth providers. For more information, refer to the [NextAuth documentation](https://next-auth.js.org/getting-started/introduction).

## Verify installation

To ensure everything is working correctly:

1. **Check the dashboard**: You should see the main EvoNEST interface
2. **Test navigation**: Click through the main menu items
3. **Create a test sample**: Try uploading a sample to verify the database connection
   - Go to the "Samples" section
   - Click "Create Sample"
   - Fill in the required fields and submit
4. **Upload a document in Experiments**: Test the data upload functionality
5. **Create a test trait**: Try creating a trait to ensure the trait management system is functioning
   - Go to the "Traits" section
   - Click "Create Trait"
   - Fill in the required fields and submit

## Next steps

Now that you have EvoNEST running:

1. **[Complete your first steps](/getting-started/)** - Set up your profile and create your first experiment
2. **[Explore the user guide](/user-guide/)** - Learn about all the features including:
   - [Sample Management](/user-guide/sample-management)
   - [Trait Management](/user-guide/traits-management)
   - [Data Analysis](/user-guide/data-analysis)
   - [Visualization](/user-guide/visualization)
   - [Data Export](/user-guide/data-export)
3. **[Join the community](https://github.com/yourusername/EvoNext)** - Connect with other researchers

## Getting help

If you encounter issues:

- **Check the logs**: `docker-compose logs -f`
- **View container status**: `docker-compose ps`
- **Visit our [GitHub Issues](https://github.com/yourusername/EvoNext/issues)** for bug reports and feature requests
- **Read the detailed [User Guide](/user-guide/)** for comprehensive documentation
- **Check the [FAQ section](/user-guide/faq)** for common questions
- **Review [Troubleshooting Guide](/user-guide/troubleshooting)** for common issues

### Development resources

For developers:

- **Contributing Guide**: See [CONTRIBUTING.md](../../CONTRIBUTING.md)
- **Developer Documentation**: [/docs/developer-guide/](/docs/developer-guide/)
- **Project Structure**: Explore the codebase structure and conventions
- **Testing**: Run tests with `npm run test` or `npm run nxtest`
