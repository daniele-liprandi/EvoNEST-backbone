# Module 6: Backup & Maintenance

::: tip Learning Objectives
By the end of this module, you will have:
- ✅ Understood the automated backup system
- ✅ Checked backup status and logs
- ✅ Downloaded backups to your local computer
- ✅ Learned how to restore from backups
- ✅ Created manual backups when needed
:::

**Estimated Time:** 30-45 minutes

---

## Prerequisites

Before starting this module, make sure you have:
- ✅ EvoNEST running in **production mode** (using `docker-compose.yml`)
- ✅ Basic understanding of Docker commands
- ✅ Terminal/command prompt access

::: warning Development vs Production
The **development environment** (`docker-compose.dev.yml`) does **NOT** include automated backups. This module applies to **production deployments** only.
:::

---

## Overview

EvoNEST includes a comprehensive automated backup system that:
- Creates daily database backups automatically
- Organizes backups into daily, weekly, and monthly archives
- Applies retention policies to manage disk space
- Compresses backups for efficient storage

**In this module**, you'll learn how to monitor, download, and restore your data.

---

## Understanding the Backup System

### Automated Backup Schedule

When running in production mode, EvoNEST automatically backs up your database:

| Frequency | Schedule | Retention |
|-----------|----------|-----------|
| **Daily** | Every night at 00:00 (midnight) | 7 days |
| **Weekly** | Every Sunday | 4 weeks |
| **Monthly** | 1st of each month | 12 months |

### Backup Storage Structure

Backups are stored in Docker volumes with this organization:

```
/backups/
├── daily/              # Last 7 days of backups
│   ├── mongodb_backup_20241024_000000.tar.gz
│   ├── mongodb_backup_20241025_000000.tar.gz
│   └── ...
├── weekly/             # Last 4 weeks (Sundays only)
│   ├── week_42_mongodb_backup_20241020_000000.tar.gz
│   └── ...
├── monthly/            # Last 12 months (1st of month)
│   ├── month_10_mongodb_backup_20241001_000000.tar.gz
│   └── ...
└── logs/               # Backup operation logs
    ├── backup_20241024_000000.log
    ├── latest_backup.txt
    └── backup_status.txt
```

### What Gets Backed Up?

✅ **Included in backups:**
- All database collections (samples, traits, experiments, users, etc.)
- Database indexes
- User accounts and permissions
- Configuration settings

❌ **NOT included in backups:**
- Uploaded files (images, documents) stored in `/file_storage`
- Docker container configurations
- Environment variables

::: tip File Storage Backups
Uploaded files are stored separately in the `file_storage` Docker volume. To back up files, you'll need to copy this volume separately (covered later in this module).
:::

---

## Step 1: Check Backup Status

### 1.1 Verify Backup Container is Running

Open your terminal and check that the backup container is active:

```bash
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE              COMMAND                  STATUS
abc123def456   evonest_backup     "crond -f -l 8"         Up 2 days
...
```

Look for a container with `evonest_backup` or `mongo_backup` in the name.

::: details Backup container not running?
If you don't see the backup container:

1. Check if you're using the production docker-compose file:
   ```bash
   docker-compose -f docker-compose.yml ps
   ```

2. If the container is stopped, start it:
   ```bash
   docker-compose -f docker-compose.yml up -d backup
   ```

3. Check logs for errors:
   ```bash
   docker logs mongo_backup
   ```
:::

### 1.2 Check Last Backup Status

View the status file to see when the last backup completed:

```bash
docker exec mongo_backup cat /backups/backup_status.txt
```

**Expected output:**
```
Last successful backup: Thu Oct 24 00:00:15 UTC 2024
Backup file: mongodb_backup_20241024_000015.tar.gz
Backup size: 15M
```

### 1.3 View Detailed Backup Information

Check the latest backup details:

```bash
docker exec mongo_backup cat /backups/logs/latest_backup.txt
```

**Expected output:**
```
Backup completed at Thu Oct 24 00:00:15 UTC 2024

Backup details:
- File: mongodb_backup_20241024_000015.tar.gz
- Size: 15M
- Available space: 450G

To download via SSH:
scp user@your_server:/var/lib/docker/volumes/mongo_backups/_data/daily/mongodb_backup_20241024_000015.tar.gz /local/path/

Backup rotation policy:
- Daily backups kept for 7 days
- Weekly backups kept for 4 weeks
- Monthly backups kept for 12 months
```

### 1.4 List All Available Backups

**Daily backups:**
```bash
docker exec mongo_backup ls -lh /backups/daily/
```

**Weekly backups:**
```bash
docker exec mongo_backup ls -lh /backups/weekly/
```

**Monthly backups:**
```bash
docker exec mongo_backup ls -lh /backups/monthly/
```

**Expected output example:**
```
total 75M
-rw-r--r--  1 root  15M Oct 24 00:00 mongodb_backup_20241024_000015.tar.gz
-rw-r--r--  1 root  14M Oct 23 00:00 mongodb_backup_20241023_000012.tar.gz
-rw-r--r--  1 root  14M Oct 22 00:00 mongodb_backup_20241022_000008.tar.gz
...
```

---

## Step 2: Download Backups Locally

It's **strongly recommended** to keep local copies of your backups on a separate computer or external drive.

### Method 1: Copy from Docker Volume (Local Server)

If EvoNEST is running on your local computer:

**1. Find the latest backup filename:**
```bash
docker exec mongo_backup ls /backups/daily/ | tail -1
```

**2. Copy the backup to your current directory:**
```bash
docker cp mongo_backup:/backups/daily/mongodb_backup_20241024_000015.tar.gz ./
```

Replace `mongodb_backup_20241024_000015.tar.gz` with the actual filename from step 1.

**3. Verify the download:**
```bash
# Windows (PowerShell)
dir mongodb_backup_*.tar.gz

# macOS/Linux
ls -lh mongodb_backup_*.tar.gz
```

### Method 2: Download from Remote Server (SSH)

If EvoNEST is running on a remote server:

**1. Get the backup filename from the server:**
```bash
ssh user@your-server "docker exec mongo_backup ls /backups/daily/ | tail -1"
```

**2. Find the Docker volume path on the server:**
```bash
ssh user@your-server "docker volume inspect mongo_backups --format '{{.Mountpoint}}'"
```

**Expected output:**
```
/var/lib/docker/volumes/mongo_backups/_data
```

**3. Download using `scp`:**
```bash
scp user@your-server:/var/lib/docker/volumes/mongo_backups/_data/daily/mongodb_backup_20241024_000015.tar.gz ~/EvoNEST/backups/
```

::: warning Permissions
You may need `sudo` privileges on the server to access Docker volumes directly. If you get permission errors, ask your server administrator for help.
:::

### Method 3: Schedule Automated Downloads

For production servers, consider setting up automated backup downloads using:
- **rsync** with cron (Linux/macOS)
- **Task Scheduler** with PowerShell scripts (Windows)
- **Cloud backup services** (AWS S3, Google Drive, Dropbox)

::: tip Best Practice
Download backups to **at least two locations**:
1. Your local computer
2. An external drive or cloud storage

This protects against both server failures and local computer failures.
:::

---

## Step 3: Restore from Backup

### When to Restore

You might need to restore from backup if:
- Data was accidentally deleted
- Database corruption occurred
- You need to revert to an earlier state
- Migrating to a new server

::: danger Warning
Restoring from backup will **overwrite all current data**. Make sure you have a current backup before restoring!
:::

### 3.1 Prepare for Restoration

**1. Stop the EvoNEST application (but keep database running):**
```bash
docker stop evonest_backbone_prod
```

**2. Verify you have the backup file:**
```bash
# If restoring from a backup inside Docker:
docker exec mongo_backup ls /backups/daily/mongodb_backup_20241024_000015.tar.gz

# If restoring from a local file, copy it into the container:
docker cp mongodb_backup_20241024_000015.tar.gz mongo_backup:/backups/
```

### 3.2 Extract the Backup

**1. Enter the backup container:**
```bash
docker exec -it mongo_backup sh
```

**2. Extract the backup archive:**
```sh
cd /backups
tar -xzf daily/mongodb_backup_20241024_000015.tar.gz
```

This creates a directory named `temp_mongodb_backup_20241024_000015` with the database dump.

### 3.3 Restore to MongoDB

**Still inside the backup container**, run the restore command:

```sh
mongorestore --uri="mongodb://root:pass@mongo:27017" --drop /backups/temp_mongodb_backup_20241024_000015
```

**Command explanation:**
- `--uri`: Connection string to MongoDB (uses container network)
- `--drop`: Drops existing collections before restoring (ensures clean restore)
- Last argument: Path to the extracted dump directory

**Expected output:**
```
preparing collections to restore from
reading metadata for evonest.samples from /backups/temp_mongodb_backup_20241024_000015/evonest/samples.metadata.json
reading metadata for evonest.traits from /backups/temp_mongodb_backup_20241024_000015/evonest/traits.metadata.json
...
finished restoring evonest.samples (120 documents, 0 failures)
finished restoring evonest.traits (450 documents, 0 failures)
...
120 document(s) restored successfully. 0 document(s) failed to restore.
```

### 3.4 Clean Up and Restart

**1. Exit the container:**
```sh
exit
```

**2. Remove the temporary extracted files:**
```bash
docker exec mongo_backup rm -rf /backups/temp_mongodb_backup_20241024_000015
```

**3. Restart the EvoNEST application:**
```bash
docker start evonest_backbone_prod
```

**4. Verify the restoration:**
- Open EvoNEST in your browser: `http://localhost:3000`
- Log in and check that your data has been restored
- Verify sample counts, recent entries, etc.

::: tip Verify Before and After
Before restoring, note down:
- Number of samples, traits, experiments
- Recent entries

After restoring, verify these match the backup date.
:::

---

## Step 4: Create Manual Backups

Sometimes you may want to create a backup immediately (not waiting for the scheduled backup):

### Manual Backup via Backup Container

**1. Trigger a manual backup:**
```bash
docker exec mongo_backup /backup_scripts/backup.sh
```

**2. Check the new backup was created:**
```bash
docker exec mongo_backup ls -lt /backups/daily/ | head -5
```

**3. View the backup log:**
```bash
docker exec mongo_backup cat /backups/logs/latest_backup.txt
```

### Quick Manual Backup (Alternative Method)

If you need a quick backup without the container:

**1. Create a backup using mongodump directly:**
```bash
docker exec evonest_mongodb mongodump --uri="mongodb://root:pass@localhost:27017" --out=/tmp/manual_backup
```

**2. Copy the backup out of the container:**
```bash
docker cp evonest_mongodb:/tmp/manual_backup ./manual_backup_$(date +%Y%m%d_%H%M%S)
```

**3. Compress the backup:**
```bash
# macOS/Linux
tar -czf manual_backup_$(date +%Y%m%d_%H%M%S).tar.gz manual_backup_*

# Windows (PowerShell)
Compress-Archive -Path manual_backup_* -DestinationPath "manual_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
```

---

## Step 5: Backup File Storage

Remember that database backups do **NOT** include uploaded files (images, documents). Back these up separately:

### Check File Storage Size

**1. Check the file storage volume:**
```bash
docker exec evonest_backbone_prod du -sh /usr/evonest/file_storage
```

**Expected output:**
```
2.3G    /usr/evonest/file_storage
```

### Backup File Storage

**1. Copy the entire file storage directory:**
```bash
docker cp evonest_backbone_prod:/usr/evonest/file_storage ./file_storage_backup_$(date +%Y%m%d)
```

**2. Compress the backup:**
```bash
# macOS/Linux
tar -czf file_storage_backup_$(date +%Y%m%d).tar.gz file_storage_backup_*

# Windows (PowerShell)
Compress-Archive -Path file_storage_backup_* -DestinationPath "file_storage_backup_$(Get-Date -Format 'yyyyMMdd').zip"
```

**3. Store the backup safely:**
- Move to external drive
- Upload to cloud storage
- Keep alongside database backups

### Restore File Storage

If you need to restore files:

**1. Extract the backup:**
```bash
tar -xzf file_storage_backup_20241024.tar.gz
```

**2. Copy files back to the container:**
```bash
docker cp file_storage_backup_20241024/. evonest_backbone_prod:/usr/evonest/file_storage/
```

**3. Fix permissions (if needed):**
```bash
docker exec evonest_backbone_prod chown -R node:node /usr/evonest/file_storage
```

---

## Checkpoint: Verify Backup System

Before finishing this module, make sure you can:

- [ ] ✅ View backup status and logs
- [ ] ✅ List available daily, weekly, and monthly backups
- [ ] ✅ Download a backup to your local computer
- [ ] ✅ Understand how to restore from backup
- [ ] ✅ Create a manual backup when needed
- [ ] ✅ Back up file storage separately

::: tip All good?
If you can check all boxes above, your backup system is working correctly!
:::

---

## Best Practices

### 1. Regular Backup Verification

**Monthly checklist:**
- [ ] Verify backups are being created automatically
- [ ] Check backup logs for errors
- [ ] Download latest backup to local storage
- [ ] Test restoration process (on test environment)

### 2. Backup Storage Strategy

Implement the **3-2-1 backup rule**:
- **3** copies of your data
- **2** different storage media
- **1** copy off-site

**Example setup:**
1. Automated backups on server (Docker volume)
2. Weekly downloads to office computer
3. Monthly uploads to cloud storage

### 3. Monitor Disk Space

If your database grows large, backups can fill up disk space:

**1. Check available space:**
```bash
docker exec mongo_backup df -h /backups
```

**2. Adjust retention if needed:**

Edit `docker-compose.yml`:
```yaml
backup:
  environment:
    DAILY_RETENTION: "5"      # Reduce from 7 to 5 days
    WEEKLY_RETENTION: "3"     # Reduce from 4 to 3 weeks
    MONTHLY_RETENTION: "6"    # Reduce from 12 to 6 months
```

**3. Restart the backup container:**
```bash
docker-compose up -d backup
```

### 4. Test Your Backups

**Regularly test restoration** on a separate test environment:

```bash
# Create a test docker-compose for restoration testing
# Use different ports to avoid conflicts
# Restore backup and verify data integrity
```

::: warning Don't Wait for a Disaster
Many people never test their backups until they need them. Don't be one of them! Test restoration at least once per quarter.
:::

---

## Troubleshooting

### Backup Container Not Starting

**Problem:** `docker ps` doesn't show mongo_backup container

**Solutions:**
1. Check if you're using production docker-compose:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

2. Check Docker logs:
   ```bash
   docker logs mongo_backup
   ```

3. Verify backup service is defined in `docker-compose.yml`

### No Backups Being Created

**Problem:** `/backups/daily/` is empty

**Solutions:**
1. Check cron is running:
   ```bash
   docker exec mongo_backup ps aux | grep crond
   ```

2. Manually trigger backup to see error:
   ```bash
   docker exec mongo_backup /backup_scripts/backup.sh
   ```

3. Check MongoDB connection:
   ```bash
   docker exec mongo_backup mongodump --uri="mongodb://root:pass@mongo:27017" --out=/tmp/test
   ```

### "Permission Denied" When Downloading Backups

**Problem:** Can't access Docker volumes on remote server

**Solutions:**
1. Use `docker cp` instead of direct file access:
   ```bash
   docker cp mongo_backup:/backups/daily/latest_backup.tar.gz ./
   ```

2. Ask administrator for sudo access

3. Set up a backup export script on the server

### Restore Failed or Incomplete

**Problem:** `mongorestore` shows errors

**Solutions:**
1. Verify backup file is not corrupted:
   ```bash
   tar -tzf backup_file.tar.gz | head
   ```

2. Check MongoDB is running:
   ```bash
   docker ps | grep mongo
   ```

3. Use `--drop` flag to clear existing data:
   ```bash
   mongorestore --uri="..." --drop /path/to/dump
   ```

4. Check MongoDB logs:
   ```bash
   docker logs evonest_mongodb
   ```


## Summary

In this module, you learned:

- **Automated backup system**: Daily, weekly, and monthly backups with retention policies
- **Monitoring backups**: Check status, view logs, and list available backups
- **Downloading backups**: Copy backups locally using Docker commands or SSH
- **Restoring data**: Extract and restore from backup archives
- **Manual backups**: Create on-demand backups when needed
- **File storage**: Separately back up uploaded files and images
- **Best practices**: 3-2-1 rule, regular testing, monitoring disk space

**Remember:** Your backup system is only as good as your last successful test restore!

## Congratulations!

You have completed the EvoNEST tutorial! You have learned how to install EvoNEST, how to configure it, how to insert new samples, experiments and traits, and how to make sure your data is safe. 

### Next Steps

If you want to keep exploring, you can:

- **Learn how to fix common problems:** [Troubleshooting](/tutorial/troubleshooting) 
- **Explore advanced features:** [User documentation](/user-docs/)
- **Import existing data:** [Data Import Guide](/user-docs/data-import)
- **Analyze your data:** [Data Analysis Guide](/user-docs/data-analysis)
- **Deploy to production:** [Technical docs - Production setup](/developer-docs/installation#setting-up-the-production-environment)

::: tip Production Deployment
If you're deploying EvoNEST in production, also consider:
- Setting up SSL/HTTPS certificates
- Configuring firewall rules
- Implementing monitoring and alerts
- Creating disaster recovery procedures
:::

