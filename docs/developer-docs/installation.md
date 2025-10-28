# Quick start guide

Get EvoNEST running in just a few minutes with this quick installation guide.

::: tip Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git installed
- Basic familiarity with command line
- A modern web browser (Chrome, Firefox, Safari, or Edge)
:::

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

```txt
NEXTAUTH_SECRET=your-secret-key
```


Go to the file `docker-compose.dev.yml` and set up the `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` variables to secure your MongoDB instance. 

```bash
# Make sure to also set your MongoDB connection string in the .env file
MONGO_URL=mongodb://your_username:your_secure_password@mongo:27017
```

Finally, create a new file called `.env.development` containing

```txt
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

```txt
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

To ensure everything is working:

1. **Check the dashboard**: You should see the main EvoNEST interface
2. **Test navigation**: Click through the main menu items (Samples, Traits, Experiments, Settings)

✅ Installation complete!

## Next steps

Now that you have EvoNEST running:

1. **Configure your NEST**: See the [NEST setup guide](/user-docs/nest-setup) to configure your laboratory's instance
2. **Add users**: Follow the [User management guide](/user-docs/user-management) to add team members
3. **Learn the features**: Explore the [User documentation](/user-docs/) for:
   - Sample management
   - Data collection
   - Experiments
   - Data analysis
   - Data export

## Getting help

If you encounter issues:

- **Check the logs**: `docker-compose logs -f`
- **View container status**: `docker-compose ps`
- **Troubleshooting**: See the [Workshop troubleshooting guide](/tutorial/troubleshooting)
- **Report issues**: Visit our [GitHub repository](https://github.com/daniele-liprandi/EvoNEST-backbone/issues)

## For developers

Need to customize EvoNEST?

- **[Developer documentation](/developer-docs/)** - Authentication setup, component development, parsers
- **[GitHub repository](https://github.com/daniele-liprandi/EvoNEST-backbone)** - Report issues and contribute
- **Testing**: Run tests with `npm run test` or `npm run nxtest`
