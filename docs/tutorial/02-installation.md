# Module 2: Installation

::: tip Learning objectives
By the end of this module, you will have:

- ✅ Cloned the EvoNEST repository
- ✅ Configured environment files
- ✅ Started EvoNEST with Docker
- ✅ Verified the application is running
  :::

**Estimated time:** 30-40 minutes

---

## Prerequisites

Before starting this module, make sure you've completed [Module 1: Preparation](/tutorial/01-preparation) and have:

- ✅ Docker Desktop installed and running
- ✅ Git installed
- ✅ Terminal open in your workspace folder (e.g., `Documents/EvoNEST`)

---

## Overview

In this module, you'll:

1. Download the EvoNEST code from the repository
2. Set up configuration files with secure credentials
3. Launch EvoNEST using Docker
4. Verify the application is accessible in your browser

---

## Step 1: Clone the EvoNEST repository

Let's download the EvoNEST code to your computer.

1. **Make sure you're in your workspace folder**

   Check your current location:

   ```bash
   pwd
   ```

   You should see your EvoNEST folder path (e.g., `/Users/YourName/Documents/EvoNEST`)

2. **Clone the repository**

   ::: code-group

   ```bash [HTTPS (recommended)]
   git clone https://github.com/daniele-liprandi/EvoNEST-backbone.git
   ```

   ```bash [SSH (If you have SSH keys set up)]
   git clone git@github.com:daniele-liprandi/EvoNEST-backbone.git
   ```

   :::

   **Expected output:**

   ```
   Cloning into 'EvoNEST-backbone'...
   remote: Enumerating objects: 1234, done.
   remote: Counting objects: 100% (1234/1234), done.
   remote: Compressing objects: 100% (567/567), done.
   Receiving objects: 100% (1234/1234), 5.67 MiB | 2.34 MiB/s, done.
   ```

   ::: details Troubleshooting: Clone failed

   **"Permission denied" or "repository not found":**

   - Make sure you have internet connectivity
   - Try the HTTPS method if SSH didn't work
   - Verify the repository URL is correct

   **"Git is not recognized":**

   - Git might not be in your PATH
   - Try restarting your terminal
   - Reinstall Git from [git-scm.com](https://git-scm.com)
     :::

3. **Enter the project directory**

   ```bash
   cd EvoNEST-backbone
   ```

4. **Verify the files are there**

   List the contents:

   ::: code-group

   ```bash [Windows (Command Prompt)]
   dir
   ```

   ```bash [Windows (PowerShell) / macOS / Linux]
   ls
   ```

   :::

   You should see files and folders including:

   - `src/` - Source code
   - `docker-compose.dev.yml` - Docker configuration
   - `package.json` - Dependencies
   - `.env.example` - Example environment file

✅ **Checkpoint:** You should now be inside the `EvoNEST-backbone` folder with all the project files.

---

## Step 2: Generate a secret key

EvoNEST uses NextAuth for authentication, which requires a secure secret key. Let's generate one.

### Generate the secret

::: code-group

```bash [macOS / Linux]
openssl rand -base64 32
```

```powershell [Windows (PowerShell)]
# Generate a random secret
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

```bash [Windows (Git Bash)]
openssl rand -base64 32
```

:::

**Expected output:**

```txt
Xk7pQm2nR9sT3vY8wE5zL1aB4cD6fH9j
```

::: tip Save this!
Copy this secret key somewhere safe - you'll need it in the next step. This key ensures your authentication system is secure.
:::

::: details What if openssl is not found?

**Windows users:** If `openssl` doesn't work:

1. Use the PowerShell method shown above, OR
2. Generate a random 32-character string manually, OR
3. Use an online generator like [randomkeygen.com](https://randomkeygen.com/) (choose "Fort Knox Passwords")
   :::

---

## Step 3: Create environment files

Now we'll create configuration files with your secret key and database credentials.

### 3.1 Create `.env.local` file

This file stores your secret key.

1. **Create the file:**

   ::: code-group

   ```bash [Windows (Command Prompt)]
   echo NEXTAUTH_SECRET=PASTE_YOUR_SECRET_HERE > .env.local
   ```

   ```bash [macOS / Linux / Windows (Git Bash)]
   echo "NEXTAUTH_SECRET=PASTE_YOUR_SECRET_HERE" > .env.local
   ```

   :::

2. **Edit the file with your secret key:**

   Open `.env.local` in a text editor and replace `PASTE_YOUR_SECRET_HERE` with the secret you generated:

   ```txt
   NEXTAUTH_SECRET=Xk7pQm2nR9sT3vY8wE5zL1aB4cD6fH9j
   ```

::: tip Opening files in a text editor

**Windows:** Use Notepad, VS Code, or right-click → "Edit"
**macOS:** Use TextEdit, VS Code, or run `open -a TextEdit .env.local`
**Linux:** Use nano, vim, gedit, or VS Code
:::

### 3.2 Create `.env.development` file

This file configures the development environment.

1. **Create and edit `.env.development`:**

   Add this content:

   ```txt
   NEXTAUTH_URL=http://localhost:3005
   MONGODB_URI=mongodb://evonest_user:secure_password_123@mongo_dev:27017
   STORAGE_PATH='/usr/evonest/file_storage_dev'
   ```

   ::: warning Change the password!
   Replace `secure_password_123` with your own secure password. Use something unique!

   **Example:**

   ```txt
   MONGODB_URI=mongodb://evonest_user:MyLabPassword2024!@mongo_dev:27017
   ```

   :::

2. **Save and close** the file.

### 3.3 Update Docker Compose configuration

Now we need to match the MongoDB credentials in the Docker configuration.

1. **Open `docker-compose.dev.yml`** in a text editor

2. **Find the MongoDB section** (around line 27-35)

3. **Update the username and password** to match what you set in `.env.development`:

   ```yaml{5,6,9}
   mongo_dev:
     image: mongo:5.0
     ports:
       - "27019:27017"
     container_name: evonest_mongodb_dev
     restart: unless-stopped
     environment:
       MONGO_INITDB_ROOT_USERNAME: evonest_user
       MONGO_INITDB_ROOT_PASSWORD: MyLabPassword2024!
   ```

   Also update the mongo-express section:

   ```yaml{4,5,6}
   mongo-express:
     # ... other config ...
     environment:
       ME_CONFIG_MONGODB_ADMINUSERNAME: evonest_user
       ME_CONFIG_MONGODB_ADMINPASSWORD: MyLabPassword2024!
       ME_CONFIG_MONGODB_URL: mongodb://evonest_user:MyLabPassword2024!@mongo_dev:27017/
       ME_CONFIG_BASICAUTH_USERNAME: admin
       ME_CONFIG_BASICAUTH_PASSWORD: pass
   ```

4. **Save and close** the file.

✅ **Checkpoint:** You should now have three files configured:

- `.env.local` - Contains your NEXTAUTH_SECRET
- `.env.development` - Contains database connection string
- `docker-compose.dev.yml` - Updated with matching MongoDB credentials

---

## Step 4: Start EvoNEST with Docker

Now for the exciting part - let's start EvoNEST!

### 4.1 Start Docker containers

Run this command in your terminal (make sure you're in the `EvoNEST-backbone` folder):

```bash
docker compose -f docker-compose.dev.yml up -d
```

::: details Understanding this command

- `docker compose` - Runs Docker Compose
- `-f docker-compose.dev.yml` - Uses the development configuration file
- `up` - Starts the containers
- `-d` - Runs in detached mode (background)
  :::

**Expected output:**

```txt
[+] Running 3/3
 ✔ Network evonest-backbone_default         Created
 ✔ Container evonest_mongodb_dev            Started
 ✔ Container mongo_express                  Started
 ✔ Container evonest_backbone_dev           Started
```

::: tip First run takes longer
The first time you run this, Docker needs to download images (MongoDB, Node.js). This can take 5-10 minutes depending on your internet speed. Subsequent starts will be much faster (under 30 seconds).
:::

### 4.2 Monitor the startup

Watch the logs to see EvoNEST starting up:

```bash
docker compose -f docker-compose.dev.yml logs -f
```

**What you'll see:**

```txt
evonest_backbone_dev  | > evonest@0.1.0 dev
evonest_backbone_dev  | > next dev -p 3005
evonest_backbone_dev  |
evonest_backbone_dev  |  ▲ Next.js 14.2.4
evonest_backbone_dev  |  - Local:        http://localhost:3005
evonest_backbone_dev  |
evonest_backbone_dev  |  ✓ Ready in 3.2s
```

::: tip Exit log view
Press `Ctrl+C` to stop viewing logs (this won't stop the containers)
:::

### 4.3 Wait for startup

The application needs a minute or two to fully start. You'll know it's ready when you see:

```txt
✓ Ready in 3.2s
```

::: details Troubleshooting: Container won't start

**Port already in use error:**

```txt
Error: bind: address already in use
```

Something else is using port 3005 or 27019. Options:

1. Stop the other application using those ports
2. Change the ports in `docker-compose.dev.yml`

**MongoDB connection errors:**

- Make sure your credentials match in both `.env.development` and `docker-compose.dev.yml`
- Wait a bit longer - MongoDB takes time to initialize on first run

**Node modules errors:**

```bash
# Reset and rebuild
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up --build -d
```

:::

---

## Step 5: Verify installation

Let's make sure everything is running correctly.

### 5.1 Check container status

```bash
docker compose -f docker-compose.dev.yml ps
```

**Expected output:**

```
NAME                    STATUS      PORTS
evonest_backbone_dev    Up          0.0.0.0:3005->3005/tcp
evonest_mongodb_dev     Up          0.0.0.0:27019->27017/tcp
mongo_express           Up          127.0.0.1:8081->8081/tcp
```

All containers should show `Up` status. ✅

### 5.2 Access the application

Open your web browser and go to:

**[http://localhost:3005](http://localhost:3005)**

You should see the EvoNEST login page! 🎉

::: tip What you should see
A clean login interface with:

- EvoNEST logo
- Username field
- Password field
- "Sign in" button

:::

### 5.3 Check MongoDB (optional)

Verify the database is running by accessing Mongo Express:

**[http://localhost:8081](http://localhost:8081)**

- **Username:** `admin`
- **Password:** `pass`

You should see the MongoDB admin interface with databases listed.

::: details Can't Access localhost:3005?

**Try these steps:**

1. **Make sure Docker containers are running:**

   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

2. **Check the logs for errors:**

   ```bash
   docker compose -f docker-compose.dev.yml logs evonest_backbone_dev
   ```

3. **Try 127.0.0.1 instead:**
   [http://127.0.0.1:3005](http://127.0.0.1:3005)

4. **Restart the containers:**

   ```bash
   docker compose -f docker-compose.dev.yml restart
   ```

5. **Check your firewall** - make sure it's not blocking port 3005
   :::

---

## Step 6: Stop and start EvoNEST

Learn how to control your EvoNEST installation.

### Stop EvoNEST

When you're done working:

```bash
docker compose -f docker-compose.dev.yml down
```

This stops all containers but **keeps your data**.

### Start EvoNEST again

Next time you want to use EvoNEST:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This is much faster than the first run (5-10 seconds).

### View logs anytime

```bash
docker compose -f docker-compose.dev.yml logs -f
```

### Restart if something goes wrong

```bash
docker compose -f docker-compose.dev.yml restart
```

### Complete reset (deletes data!)

::: danger Warning: This deletes all data!
Only use this if you want to start completely fresh.
:::

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

---

## Checkpoint: Is everything working?

Before moving to the next module, verify:

- [ ] All Docker containers show "Up" status
- [ ] EvoNEST login page loads at [http://localhost:3005](http://localhost:3005)
- [ ] Mongo Express loads at [http://localhost:8081](http://localhost:8081) (optional)
- [ ] No error messages in the logs
- [ ] You know how to stop and start EvoNEST

::: tip All working?
Great! You're ready to log in and start using EvoNEST!
:::

::: warning Issues?
If something's not working, check the [Troubleshooting guide](/tutorial/troubleshooting).
:::

---

## Useful commands reference

Here's a quick reference for managing your EvoNEST installation:

| Task           | Command                                            |
| -------------- | -------------------------------------------------- |
| Start EvoNEST  | `docker compose -f docker-compose.dev.yml up -d`   |
| Stop EvoNEST   | `docker compose -f docker-compose.dev.yml down`    |
| View logs      | `docker compose -f docker-compose.dev.yml logs -f` |
| Check status   | `docker compose -f docker-compose.dev.yml ps`      |
| Restart        | `docker compose -f docker-compose.dev.yml restart` |
| Complete reset | `docker compose -f docker-compose.dev.yml down -v` |

::: tip Bookmark this page
You might want to keep this page bookmarked for reference when managing your EvoNEST installation.
:::

---

## Next steps

**Excellent work!** EvoNEST is now installed and running on your computer.

In the next module, you'll:

- Log in to EvoNEST for the first time
- Explore the interface
- Verify all features are working
