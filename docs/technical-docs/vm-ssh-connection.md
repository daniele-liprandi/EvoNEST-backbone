# Connecting to Virtual Machines via SSH

::: info Not an EvoNEST guide
This page provides general guidance for connecting to institutional virtual machines where EvoNEST may be hosted. The specific connection details will vary depending on your institution.
:::

Many universities and research institutions provide virtual machines (VMs) for hosting applications like EvoNEST. This guide covers the typical process for connecting to these VMs using SSH.

## Connection methods

SSH (Secure Shell) is the standard method for connecting to remote servers. Your institution's authentication method may vary:

- **Password-based authentication:** Some institutions use username/password
- **SSH key-based authentication:** Many institutions (e.g., University of Greifswald) require SSH keys for enhanced security

Contact your system administrator or IT department to determine which method your institution uses.

## Generating SSH keys

If your institution requires SSH keys, you'll need to generate a key pair and send the public key to your VM administrator.

### Linux/macOS

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Press Enter to accept the default file location (`~/.ssh/id_ed25519`). You can optionally set a passphrase for additional security.

Your public key will be saved at: `~/.ssh/id_ed25519.pub`

### Windows

For Windows users, we recommend following [Microsoft's official SSH key generation guide](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement).

Quick method using PowerShell:

```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Your public key will be saved at: `C:\Users\YourUsername\.ssh\id_ed25519.pub`

### Sending your public key

Once generated, send your **public key** (the `.pub` file) to your VM administrator or anyone with root access. Never share your private key.

To display your public key:

**Linux/macOS:**
```bash
cat ~/.ssh/id_ed25519.pub
```

**Windows:**
```powershell
type C:\Users\YourUsername\.ssh\id_ed25519.pub
```

## Connecting with VS Code

VS Code's Remote - SSH extension provides a convenient way to work with remote servers.

### 1. Install the Remote - SSH extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "Remote - SSH"
4. Install the extension by Microsoft

### 2. Configure SSH connection

1. Press **F1** (or Ctrl+Shift+P / Cmd+Shift+P) to open the command palette
2. Type "Remote-SSH: Open SSH Configuration File" and select it
3. Choose your SSH config file (usually the first option: `~/.ssh/config` or `C:\Users\YourUsername\.ssh\config`)
4. Add your VM connection details:

```ssh-config
Host myvm
  HostName vm.example.university.edu
  User root
  IdentityFile ~/.ssh/id_ed25519
```

Replace:
- `myvm`: A friendly name for your connection
- `vm.example.university.edu`: Your VM's hostname or IP address (provided by your institution)
- `root`: Your username (change if different)
- `~/.ssh/id_ed25519`: Path to your private key (if using key-based auth; omit this line for password auth)

### 3. Connect to the VM

::: info Institutional networks
If you are not on campus, you may need to connect via VPN before accessing the VM. Check with your institution for VPN setup instructions.
:::

**Option 1: Using the Remote icon**

Click the blue/green icon in the bottom-left corner of the VS Code window (looks like "><"), then select "Connect to Host" and choose your configured host.

**Option 2: Using the command palette**

1. Press **F1** to open the command palette
2. Type "Remote-SSH: Connect to Host" and select it
3. Choose your configured host (e.g., `myvm`)
4. A new VS Code window will open connected to your VM

You can now browse files, edit code, and use the integrated terminal on your remote server. From now on, you can simply open the ssh from the "Open Recent" menu.
