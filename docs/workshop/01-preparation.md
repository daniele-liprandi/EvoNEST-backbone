# Module 1: Preparation

::: tip Learning Objectives
By the end of this module, you will have:
- ✅ Verified your system meets the requirements
- ✅ Installed Docker Desktop
- ✅ Installed Git
- ✅ Prepared your workspace
:::

**Estimated Time:** 15-20 minutes

---

## Before You Begin

This module prepares your computer for EvoNEST installation. We'll install the necessary software and verify that your system is ready.

::: warning Important
You'll need **administrator privileges** on your computer to install software. Make sure you have these before proceeding.
:::

---

## Step 1: Check System Requirements

### Minimum Requirements

Before installing EvoNEST, verify your system meets these requirements:

- [ ] **Operating System:**
  - Windows 10/11 (64-bit) **or**
  - macOS 10.15 (Catalina) or newer **or**
  - Linux (Ubuntu 20.04+, Fedora, Debian)

- [ ] **Hardware:**
  - 8GB RAM minimum (16GB recommended)
  - 20GB free disk space
  - Dual-core processor (quad-core recommended)

- [ ] **Permissions:**
  - Administrator/sudo privileges
  - Ability to install software

- [ ] **Internet Connection:**
  - Required for downloading Docker and the repository

::: details How to Check Your System Specs

**Windows:**
1. Press `Windows Key + Pause/Break` or search for "About Your PC"
2. Check "Installed RAM" and "System type"

**macOS:**
1. Click Apple menu → "About This Mac"
2. Check Memory and Storage tabs

**Linux:**
```bash
# Check RAM
free -h

# Check disk space
df -h

# Check OS version
lsb_release -a
```
:::

---

## Step 2: Install Docker Desktop

Docker is the platform that runs EvoNEST. We'll install Docker Desktop, which includes everything you need.

### For Windows

1. **Download Docker Desktop**
   - Visit: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
   - Click "Download for Windows"

2. **Run the Installer**
   - Double-click `Docker Desktop Installer.exe`
   - Follow the installation wizard
   - **Important:** When prompted, enable "Use WSL 2 instead of Hyper-V" (recommended)

3. **Restart Your Computer**
   - Docker will prompt you to restart
   - Restart is required to complete installation

4. **Start Docker Desktop**
   - After restart, launch Docker Desktop from the Start menu
   - Accept the service agreement
   - Skip the tutorial (we'll guide you through everything)

::: details Troubleshooting Windows Installation

**"WSL 2 installation is incomplete" error:**
1. Open PowerShell as Administrator
2. Run: `wsl --install`
3. Restart your computer
4. Launch Docker Desktop again

**"Hyper-V feature is not enabled" error:**
1. Search for "Turn Windows features on or off"
2. Enable "Hyper-V" and "Windows Subsystem for Linux"
3. Restart your computer
:::

### For macOS

1. **Check Your Mac's Processor**
   - Click Apple menu → "About This Mac"
   - Note whether you have "Intel" or "Apple Silicon" (M1/M2/M3)

2. **Download Docker Desktop**
   - Visit: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
   - Click "Download for Mac"
   - Choose the correct version:
     - **Mac with Intel chip** → Intel Chip version
     - **Mac with Apple Silicon** → Apple Silicon version

3. **Install Docker Desktop**
   - Open the downloaded `.dmg` file
   - Drag Docker icon to Applications folder
   - Open Docker from Applications

4. **Grant Permissions**
   - Docker will ask for permissions
   - Enter your password when prompted
   - Accept the service agreement

::: details Troubleshooting macOS Installation

**"Docker Desktop requires macOS 10.15 or later":**
- You need to update macOS first
- Go to System Preferences → Software Update

**"System Extension Blocked":**
- Go to System Preferences → Security & Privacy
- Click "Allow" for Docker system extension
- Restart Docker Desktop
:::

### For Linux

::: code-group
```bash [Ubuntu/Debian]
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group (avoid needing sudo)
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
```

```bash [Fedora]
# Install DNF plugins
sudo dnf -y install dnf-plugins-core

# Add Docker repository
sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo

# Install Docker Engine
sudo dnf install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group
sudo usermod -aG docker $USER
```
:::

After installation, log out and log back in for group changes to take effect.

---

## Step 3: Verify Docker Installation

Let's make sure Docker is working correctly.

1. **Open a Terminal/Command Prompt**
   - **Windows:** Search for "Command Prompt" or "PowerShell"
   - **macOS:** Open "Terminal" from Applications → Utilities
   - **Linux:** Open your terminal application

2. **Check Docker Version**

   Run this command:
   ```bash
   docker --version
   ```

   **Expected output:**
   ```
   Docker version 24.0.0, build abc1234
   ```

   ✅ If you see a version number, Docker is installed correctly!

3. **Test Docker is Running**

   Run this command:
   ```bash
   docker run hello-world
   ```

   **Expected output:**
   ```
   Hello from Docker!
   This message shows that your installation appears to be working correctly.
   [... more text ...]
   ```

   ✅ If you see this message, Docker is working!

::: danger Docker Not Running?

**If you see "Cannot connect to Docker daemon":**

1. **Make sure Docker Desktop is running**
   - Look for the Docker icon in your system tray/menu bar
   - If it's not there, launch Docker Desktop

2. **Wait for Docker to fully start**
   - Docker can take 1-2 minutes to start on first launch
   - Watch for the icon to stop animating

3. **Try the test command again**
:::

---

## Step 4: Install Git

Git is used to download (clone) the EvoNEST code repository.

### Check if Git is Already Installed

Open your terminal and run:
```bash
git --version
```

✅ If you see a version number (e.g., `git version 2.40.0`), Git is already installed! Skip to [Step 5](#step-5-create-a-workspace-folder).

### Installing Git

::: code-group
```bash [Windows]
# Download Git for Windows from:
# https://git-scm.com/download/win

# Run the installer with default settings
# After installation, restart your terminal and verify:
git --version
```

```bash [macOS]
# Option 1: Install via Homebrew (if you have it)
brew install git

# Option 2: Install Xcode Command Line Tools
xcode-select --install

# Verify installation
git --version
```

```bash [Linux]
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install git

# Fedora
sudo dnf install git

# Verify installation
git --version
```
:::

---

## Step 5: Create a Workspace Folder

Let's create a dedicated folder for your EvoNEST installation.

1. **Choose a location** for your EvoNEST files
   - We recommend: `Documents/EvoNEST` or `Desktop/EvoNEST`

2. **Create the folder:**

::: code-group
```bash [Windows (Command Prompt)]
# Navigate to your Documents folder
cd %USERPROFILE%\Documents

# Create EvoNEST folder
mkdir EvoNEST

# Enter the folder
cd EvoNEST
```

```bash [Windows (PowerShell)]
# Navigate to your Documents folder
cd ~/Documents

# Create EvoNEST folder
mkdir EvoNEST

# Enter the folder
cd EvoNEST
```

```bash [macOS/Linux]
# Navigate to your Documents folder
cd ~/Documents

# Create EvoNEST folder
mkdir EvoNEST

# Enter the folder
cd EvoNEST
```
:::

3. **Verify you're in the right place:**
   ```bash
   pwd
   ```

   You should see something like:
   - Windows: `C:\Users\YourName\Documents\EvoNEST`
   - macOS: `/Users/YourName/Documents/EvoNEST`
   - Linux: `/home/YourName/Documents/EvoNEST`

::: tip Keep This Terminal Open
Keep your terminal window open - you'll use it in the next module for installation!
:::

---

## Checkpoint: Are You Ready?

Before moving to the next module, verify you have:

- [ ] ✅ Docker Desktop installed and running
- [ ] ✅ Docker tested successfully (`docker run hello-world` worked)
- [ ] ✅ Git installed (`git --version` shows a version number)
- [ ] ✅ Created a workspace folder (e.g., `Documents/EvoNEST`)
- [ ] ✅ Terminal/command prompt open in your workspace folder

::: tip All Set?
If you've checked all the boxes above, you're ready to proceed!
:::

::: warning Need Help?
If something didn't work, check the [Troubleshooting](/workshop/06-troubleshooting) guide or ask your workshop instructor.
:::

---

## Next Steps

**Congratulations!** Your system is now prepared for EvoNEST installation.

In the next module, you'll:
- Clone the EvoNEST repository
- Configure your environment
- Start EvoNEST for the first time

<div style="display: flex; justify-content: space-between; margin-top: 2rem;">
  <a href="/workshop/" style="padding: 0.5rem 1rem; background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); text-decoration: none; border-radius: 6px;">← Back to Overview</a>
  <a href="/workshop/02-installation" style="padding: 0.5rem 1rem; background: var(--vp-c-brand-1); color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">Module 2: Installation →</a>
</div>
