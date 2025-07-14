#!/bin/bash

# Set backup directory and current date
BACKUP_DIR="/backups"
LOGS_DIR="/backups/logs"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_backup_$DATE"
DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)

# Default retention values if not set in environment
DAILY_RETENTION=${DAILY_RETENTION:-7}
WEEKLY_RETENTION=${WEEKLY_RETENTION:-4}
MONTHLY_RETENTION=${MONTHLY_RETENTION:-12}

# Create directories if they don't exist
mkdir -p $BACKUP_DIR/daily
mkdir -p $BACKUP_DIR/weekly
mkdir -p $BACKUP_DIR/monthly
mkdir -p $LOGS_DIR

# Log file
LOG_FILE="$LOGS_DIR/backup_$DATE.log"
touch $LOG_FILE

# Log the start of the backup
echo "=== Backup started at $(date) ===" >> $LOG_FILE
echo "Rotation settings:" >> $LOG_FILE
echo "- Daily retention: $DAILY_RETENTION days" >> $LOG_FILE
echo "- Weekly retention: $WEEKLY_RETENTION weeks" >> $LOG_FILE
echo "- Monthly retention: $MONTHLY_RETENTION months" >> $LOG_FILE

# Create the backup
echo "Starting MongoDB backup..." >> $LOG_FILE
if mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR/temp_$BACKUP_NAME"; then
    echo "MongoDB dump completed successfully" >> $LOG_FILE
    
    # Create a compressed archive
    cd $BACKUP_DIR
    if tar -czf "daily/$BACKUP_NAME.tar.gz" "temp_$BACKUP_NAME"; then
        echo "Compression completed successfully" >> $LOG_FILE
        
        # Create symbolic links for weekly and monthly backups if needed
        # Weekly backup on Sunday (day of week = 7)
        if [ "$DAY_OF_WEEK" = "7" ]; then
            ln -sf "$BACKUP_DIR/daily/$BACKUP_NAME.tar.gz" "$BACKUP_DIR/weekly/week_$(date +%U)_$BACKUP_NAME.tar.gz"
            echo "Created weekly backup link" >> $LOG_FILE
        fi
        
        # Monthly backup on the 1st of the month
        if [ "$DAY_OF_MONTH" = "01" ]; then
            ln -sf "$BACKUP_DIR/daily/$BACKUP_NAME.tar.gz" "$BACKUP_DIR/monthly/month_$(date +%m)_$BACKUP_NAME.tar.gz"
            echo "Created monthly backup link" >> $LOG_FILE
        fi
        
        # Remove the temporary dump directory
        rm -rf "temp_$BACKUP_NAME"
        
        # Apply rotation strategy
        echo "Applying rotation strategy..." >> $LOG_FILE
        
        # Delete daily backups older than DAILY_RETENTION days
        find $BACKUP_DIR/daily -name "*.tar.gz" -type f -mtime +$DAILY_RETENTION -delete
        
        # Delete weekly backups older than WEEKLY_RETENTION weeks
        # Multiplying by 7 to convert weeks to days
        find $BACKUP_DIR/weekly -name "*.tar.gz" -type f -mtime +$((WEEKLY_RETENTION * 7)) -delete
        
        # Delete monthly backups older than MONTHLY_RETENTION months
        # Approximating months as 30 days
        find $BACKUP_DIR/monthly -name "*.tar.gz" -type f -mtime +$((MONTHLY_RETENTION * 30)) -delete
        
        # Get backup size and available space info
        BACKUP_SIZE=$(du -h "$BACKUP_DIR/daily/$BACKUP_NAME.tar.gz" | cut -f1)
        
        # Create a notification file
        NOTIFICATION_FILE="$BACKUP_DIR/logs/latest_backup.txt"
        cat > $NOTIFICATION_FILE << EOL
Backup completed at $(date)

Backup details:
- File: $BACKUP_NAME.tar.gz
- Size: $BACKUP_SIZE
- Available space: $(df -h $BACKUP_DIR | awk 'NR==2 {print $4}')

To download via SSH:
scp user@your_server:/var/lib/docker/volumes/mongo_backups/_data/daily/$BACKUP_NAME.tar.gz /local/path/

Backup rotation policy:
- Daily backups kept for $DAILY_RETENTION days
- Weekly backups kept for $WEEKLY_RETENTION weeks
- Monthly backups kept for $MONTHLY_RETENTION months
EOL
        
        echo "Backup completed successfully: $BACKUP_NAME.tar.gz (Size: $BACKUP_SIZE)" >> $LOG_FILE
    else
        echo "ERROR: Failed to compress the backup." >> $LOG_FILE
        exit 1
    fi
else
    echo "ERROR: Failed to create MongoDB dump." >> $LOG_FILE
    exit 1
fi

# Count the number of backups in each category
DAILY_COUNT=$(find $BACKUP_DIR/daily -name "*.tar.gz" | wc -l)
WEEKLY_COUNT=$(find $BACKUP_DIR/weekly -name "*.tar.gz" | wc -l)
MONTHLY_COUNT=$(find $BACKUP_DIR/monthly -name "*.tar.gz" | wc -l)

echo "Current backup counts:" >> $LOG_FILE
echo "- Daily backups: $DAILY_COUNT" >> $LOG_FILE
echo "- Weekly backups: $WEEKLY_COUNT" >> $LOG_FILE
echo "- Monthly backups: $MONTHLY_COUNT" >> $LOG_FILE
echo "=== Backup completed at $(date) ===" >> $LOG_FILE

# Create a simple status file that can be checked
echo "Last successful backup: $(date)" > $BACKUP_DIR/backup_status.txt
echo "Backup file: $BACKUP_NAME.tar.gz" >> $BACKUP_DIR/backup_status.txt
echo "Backup size: $BACKUP_SIZE" >> $BACKUP_DIR/backup_status.txt