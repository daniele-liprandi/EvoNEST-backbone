# Troubleshooting

::: tip Purpose
This reference guide covers common issues you might encounter while using EvoNEST and how to solve them.
:::

**How to use this guide:** Find your issue in the table of contents and jump to the solution.

---

## Table of Contents

- [Docker and Container Issues](#docker-and-container-issues)
- [Application Won't Start](#application-wont-start)
- [Database Connection Problems](#database-connection-problems)
- [Login and Authentication Issues](#login-and-authentication-issues)
- [File Upload Errors](#file-upload-errors)
- [Performance and Slow Loading](#performance-and-slow-loading)
- [Browser Compatibility](#browser-compatibility)
- [Data Entry Problems](#data-entry-problems)
- [Getting Help](#getting-help)

---

## Docker and Container Issues

### Problem: Docker Desktop won't start

**Symptoms:**
- Docker icon shows error
- "Docker is not running" message

**Solutions:**

1. **Restart Docker Desktop**
   - Completely quit Docker Desktop (right-click icon → Quit)
   - Wait 10 seconds
   - Restart it

2. **Check system resources**
   - Ensure you have enough RAM (8GB+ recommended)
   - Close other memory-intensive applications
   - Restart your computer

3. **On Windows: WSL 2 issues**
   ```powershell
   # Update WSL
   wsl --update

   # Restart WSL
   wsl --shutdown
   ```

4. **On Mac: Permissions issue**
   - Go to System Preferences → Security & Privacy
   - Allow Docker in Privacy tab

5. **Reinstall Docker Desktop**
   - Uninstall Docker Desktop
   - Download fresh installer from [docker.com](https://www.docker.com/products/docker-desktop/)
   - Reinstall

---

### Problem: Containers won't start

**Symptoms:**
- `docker compose up` fails
- Containers show "Exited" status

**Check container status:**
```bash
docker compose -f docker-compose.dev.yml ps
```

**View logs:**
```bash
docker compose -f docker-compose.dev.yml logs
```

**Solutions:**

1. **Port already in use**

   **Error message:**
   ```
   Error: bind: address already in use
   ```

   **Find what's using the port:**
   ::: code-group
   ```bash [Mac/Linux]
   lsof -i :3005
   lsof -i :27019
   ```

   ```bash [Windows (PowerShell)]
   netstat -ano | findstr :3005
   netstat -ano | findstr :27019
   ```
   :::

   **Solutions:**
   - Stop the conflicting application
   - OR change ports in `docker-compose.dev.yml`

2. **Out of disk space**

   **Check disk space:**
   ```bash
   df -h  # Mac/Linux
   ```

   **Clean Docker:**
   ```bash
   docker system prune -a --volumes
   ```

   ::: warning This Deletes Data!
   The `prune` command removes all stopped containers and volumes. Make sure to backup your data first!
   :::

3. **Corrupted volumes**

   **Reset everything:**
   ```bash
   docker compose -f docker-compose.dev.yml down -v
   docker compose -f docker-compose.dev.yml up --build -d
   ```

---

### Problem: Changes to code not reflected

**Symptom:**
- You edit code but don't see changes
- Old version still running

**Solutions:**

1. **Restart containers:**
   ```bash
   docker compose -f docker-compose.dev.yml restart
   ```

2. **Rebuild containers:**
   ```bash
   docker compose -f docker-compose.dev.yml up --build -d
   ```

3. **Clear node_modules volume:**
   ```bash
   docker compose -f docker-compose.dev.yml down -v
   docker compose -f docker-compose.dev.yml up --build -d
   ```

---

## Application Won't Start

### Problem: "Ready in X.Xs" never appears

**Symptoms:**
- Containers are running
- But application won't load
- Logs show errors or hang

**Check logs:**
```bash
docker compose -f docker-compose.dev.yml logs evonest_backbone_dev
```

**Common causes:**

1. **Node modules not installed**

   **Error in logs:**
   ```
   Error: Cannot find module 'next'
   ```

   **Fix:**
   ```bash
   docker compose -f docker-compose.dev.yml down
   docker compose -f docker-compose.dev.yml up --build -d
   ```

2. **MongoDB not ready**

   **Symptom:** Errors about database connection

   **Fix:** Wait longer (MongoDB takes 30-60 seconds on first start)
   ```bash
   # Watch logs
   docker compose -f docker-compose.dev.yml logs -f
   ```

3. **Environment variables missing**

   **Check you have:**
   - `.env.local` with `NEXTAUTH_SECRET`
   - `.env.development` with `MONGODB_URI`

   **Verify:**
   ```bash
   # Mac/Linux
   cat .env.local
   cat .env.development

   # Windows
   type .env.local
   type .env.development
   ```

4. **Port forwarding issue**

   **Try accessing different address:**
   - [http://127.0.0.1:3005](http://127.0.0.1:3005)
   - [http://0.0.0.0:3005](http://0.0.0.0:3005)

---

## Database Connection Problems

### Problem: "Cannot connect to MongoDB"

**Symptoms:**
- Error messages about database
- Blank pages or infinite loading

**Solutions:**

1. **Check MongoDB is running:**
   ```bash
   docker compose -f docker-compose.dev.yml ps mongo_dev
   ```

   Should show "Up" status.

2. **Verify credentials match:**

   **In `.env.development`:**
   ```txt
   MONGODB_URI=mongodb://evonest_user:MyPassword123@mongo_dev:27017
   ```

   **In `docker-compose.dev.yml`:**
   ```yaml
   MONGO_INITDB_ROOT_USERNAME: evonest_user
   MONGO_INITDB_ROOT_PASSWORD: MyPassword123
   ```

   **Must match exactly!**

3. **Restart MongoDB:**
   ```bash
   docker compose -f docker-compose.dev.yml restart mongo_dev
   ```

4. **Reset MongoDB:**
   ```bash
   docker compose -f docker-compose.dev.yml down
   docker volume rm evonest-backbone_evonestdev_node_modules
   docker compose -f docker-compose.dev.yml up -d
   ```

---

### Problem: Data disappeared

**Symptom:**
- Had data, now it's gone
- Empty samples/traits tables

**Possible causes:**

1. **Switched databases**
   - Check which database is active (User Profile menu)
   - Switch back to correct database

2. **Ran `docker compose down -v`**
   - The `-v` flag deletes volumes (data storage)
   - Data is permanently lost if no backup

3. **MongoDB was reset**
   - Check if someone ran a migration script

**Prevention:**

**Regular backups:**
```bash
# Export your data regularly
# Use the "Export" feature in EvoNEST
# Or backup MongoDB:
docker exec evonest_mongodb_dev mongodump --out /backup
```

---

## Login and Authentication Issues

### Problem: Can't log in with admin/pass

**Solutions:**

1. **Check credentials:**
   - Username: `admin` (lowercase)
   - Password: `pass` (lowercase)
   - No spaces

2. **Verify NEXTAUTH_SECRET is set:**
   ```bash
   # Mac/Linux
   cat .env.local | grep NEXTAUTH_SECRET

   # Windows
   type .env.local | findstr NEXTAUTH_SECRET
   ```

   Should show a long random string.

3. **Clear browser cache:**
   - Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
   - Clear cookies and cache
   - Try again

4. **Try incognito/private mode:**
   - Open private browsing window
   - Try logging in

5. **Restart application:**
   ```bash
   docker compose -f docker-compose.dev.yml restart
   ```

---

### Problem: Logged out automatically

**Symptoms:**
- Keep getting logged out
- Session expires quickly

**Solutions:**

1. **Check NEXTAUTH_SECRET is set correctly**

2. **Browser cookies disabled:**
   - Enable cookies in browser settings
   - Allow cookies for localhost

3. **System clock wrong:**
   - Check your computer's date/time
   - JWT tokens use timestamps

---

## File Upload Errors

### Problem: "Failed to upload file"

**Solutions:**

1. **Check file size:**
   - Max size typically 10-50MB
   - Compress large images
   - Split large files

2. **Check file format:**
   - Supported: JPEG, PNG, PDF, XLSX, CSV
   - Unsupported: EXE, DMG, certain proprietary formats

3. **Check disk space:**
   ```bash
   # Check Docker has space
   docker system df
   ```

4. **Check permissions:**
   ```bash
   # Linux/Mac: Check file_storage folder
   ls -la file_storage_dev
   ```

5. **Restart application:**
   ```bash
   docker compose -f docker-compose.dev.yml restart
   ```

---

### Problem: Images show broken/not loading

**Solutions:**

1. **Clear browser cache**

2. **Check file was actually uploaded:**
   - Go to Mongo Express: [http://localhost:8081](http://localhost:8081)
   - Check `files` collection
   - Verify entry exists

3. **Check file_storage directory:**
   ```bash
   ls file_storage_dev/
   ```

   Files should be there.

4. **Try re-uploading** the file

---

## Performance and Slow Loading

### Problem: EvoNEST is very slow

**Solutions:**

1. **Give Docker more resources:**

   **Docker Desktop → Settings → Resources:**
   - Increase Memory to 4GB+
   - Increase CPUs to 2-4
   - Restart Docker

2. **Too much data loaded:**
   - Use filters to reduce displayed data
   - Paginate large tables
   - Export old data and archive

3. **Check system resources:**
   - Close unnecessary applications
   - Restart your computer

4. **Database indexes:**
   - Run the index migration:
   ```bash
   node src/migrations/011_setup_indexes/migration.js
   ```

---

### Problem: First page load is slow

**Normal behavior:**
- First load: 5-10 seconds (Docker startup)
- Subsequent loads: 1-2 seconds

**If consistently slow:**

1. **Development mode is slower:**
   - Development mode rebuilds on changes
   - Normal in development

2. **Use production mode:**
   ```bash
   docker compose -f docker-compose.yml up -d
   ```

---

## Browser Compatibility

### Problem: Features not working in my browser

**Recommended browsers:**
- ✅ Chrome/Chromium 90+ (best support)
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+

**Solutions:**

1. **Update your browser** to latest version

2. **Enable JavaScript**

3. **Disable browser extensions:**
   - Try in incognito/private mode
   - Ad blockers can interfere

4. **Clear cache and cookies**

---

### Problem: Interface looks broken

**Symptoms:**
- Buttons misaligned
- Text overlapping
- Missing styles

**Solutions:**

1. **Hard refresh:**
   - Windows/Linux: `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`

2. **Clear cache:**
   - `Ctrl+Shift+Delete` → Clear cache

3. **Check browser console:**
   - Press `F12`
   - Look for CSS/JavaScript errors

---

## Data Entry Problems

### Problem: Can't create sample - "Type not found"

**Cause:** Types not configured

**Solution:**
1. Go to Settings → Configuration
2. Add sample types, trait types
3. Save configuration
4. Try creating sample again

---

### Problem: Sample ID not auto-generating

**Check:**
1. Settings → Main Settings
2. Verify ID generation rules are set
3. Try leaving Name field blank
4. Save

**Manual workaround:**
- Enter custom ID manually in Name field

---

### Problem: Units not showing for traits

**Cause:** Trait type doesn't have unit configured

**Solution:**
1. Settings → Types → Trait Types
2. Find the trait type
3. Edit it
4. Add Unit field (e.g., `μm`, `MPa`)
5. Save

---

### Problem: Can't link sample to experiment

**Possible causes:**

1. **Wrong database:**
   - Sample and experiment must be in same database
   - Check active database in User Profile

2. **Search not finding sample:**
   - Type exact sample name
   - Try filtering by type/family first

3. **Sample doesn't exist:**
   - Verify sample was actually created
   - Check Samples page

---

## Getting Help

### Before Asking for Help

Gather this information:

1. **What you were trying to do**
2. **What happened instead**
3. **Error messages** (exact text)
4. **Browser and version**
5. **Operating system**
6. **Docker logs:**
   ```bash
   docker compose -f docker-compose.dev.yml logs > logs.txt
   ```

### Browser Console Errors

1. Press `F12` (or `Cmd+Option+I` on Mac)
2. Go to **Console** tab
3. Screenshot any red errors
4. Include with help request

### Where to Get Help

1. **Documentation:**
   - [User documentation](/user-docs/)
   - [Developer Docs](/developer-docs/)
   - [FAQ](/user-docs/faq)

2. **GitHub Issues:**
   - [github.com/daniele-liprandi/EvoNEST-backbone/issues](https://github.com/daniele-liprandi/EvoNEST-backbone/issues)
   - Search existing issues first
   - Create new issue with template

3. **Contact:**
   - See README for contact information
   - Include logs and error messages

---

## Complete Reset (Last Resort)

If nothing works, start fresh:

::: danger Warning: Deletes All Data!
This will delete all your samples, traits, experiments, and files. **Backup first!**
:::

### Step 1: Export Your Data

1. Go to each section (Samples, Traits, Experiments)
2. Use Export function
3. Download CSV/Excel files
4. Save files somewhere safe

### Step 2: Complete Reset

```bash
# Stop and remove everything
docker compose -f docker-compose.dev.yml down -v

# Remove Docker images
docker rmi evonest-backbone-node

# Remove any orphaned volumes
docker volume prune

# Start fresh
docker compose -f docker-compose.dev.yml up --build -d
```

### Step 3: Reconfigure

1. Log in with admin/pass
2. Go through Module 4 (Configuration) again
3. Import your saved data (if import feature available)

---

## Quick Command Reference

| Problem | Command |
|---------|---------|
| Restart everything | `docker compose -f docker-compose.dev.yml restart` |
| View logs | `docker compose -f docker-compose.dev.yml logs -f` |
| Check status | `docker compose -f docker-compose.dev.yml ps` |
| Rebuild | `docker compose -f docker-compose.dev.yml up --build -d` |
| Complete reset | `docker compose -f docker-compose.dev.yml down -v` |
| Clean Docker | `docker system prune` |

---

## Still Having Issues?

If you've tried everything in this guide and still have problems:

1. **Document the issue:**
   - What you tried
   - What happened
   - Error messages
   - Logs

2. **Search GitHub issues:**
   - Someone might have had the same problem

3. **Create an issue:**
   - Use the issue template
   - Provide complete information
   - Attach logs if possible

4. **Ask in the workshop:**
   - If attending a workshop, ask the instructor

---

## Preventive Measures

Avoid future problems:

- ✅ **Regular backups** - Export data weekly
- ✅ **Keep Docker updated** - Update Docker Desktop
- ✅ **Monitor disk space** - Keep 10GB+ free
- ✅ **Document your setup** - Note any custom configurations
- ✅ **Use version control** - Keep config files in git
- ✅ **Test before deploying** - Try changes in development first

