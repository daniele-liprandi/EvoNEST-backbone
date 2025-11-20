#!/bin/bash

# Backup Download Script
# This script helps download MongoDB backups from the Docker container to your local machine
# Usage: ./download-backup.sh [OPTIONS]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="mongo_backup"
BACKUP_DIR="/backups"
LOCAL_DOWNLOAD_DIR="./downloaded_backups"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker ps &> /dev/null; then
        print_error "Docker is not running or you don't have permission to access it."
        exit 1
    fi
}

# Function to check if backup container exists
check_container() {
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_error "Backup container '${CONTAINER_NAME}' not found."
        print_info "Make sure the Docker Compose stack is running."
        exit 1
    fi
}

# Function to list available backups
list_backups() {
    local backup_type=$1
    
    print_info "Listing ${backup_type} backups..."
    echo ""
    
    if [ "$backup_type" = "all" ]; then
        echo -e "${GREEN}=== Daily Backups ===${NC}"
        docker exec $CONTAINER_NAME find /backups/daily -name "*.tar.gz" \( -type f -o -type l \) -exec ls -lh {} \; 2>/dev/null | awk '{print $9, "("$5")"}' || echo "No daily backups found"
        echo ""
        
        echo -e "${GREEN}=== Weekly Backups ===${NC}"
        docker exec $CONTAINER_NAME find /backups/weekly -name "*.tar.gz" \( -type f -o -type l \) -exec ls -lh {} \; 2>/dev/null | awk '{print $9, "("$5")"}' || echo "No weekly backups found"
        echo ""
        
        echo -e "${GREEN}=== Monthly Backups ===${NC}"
        docker exec $CONTAINER_NAME find /backups/monthly -name "*.tar.gz" \( -type f -o -type l \) -exec ls -lh {} \; 2>/dev/null | awk '{print $9, "("$5")"}' || echo "No monthly backups found"
        echo ""
    else
        docker exec $CONTAINER_NAME find /backups/$backup_type -name "*.tar.gz" \( -type f -o -type l \) -exec ls -lh {} \; 2>/dev/null | awk '{print $9, "("$5")"}' || echo "No $backup_type backups found"
    fi
}

# Function to show backup status
show_status() {
    print_info "Checking backup status..."
    echo ""
    
    if docker exec $CONTAINER_NAME test -f /backups/backup_status.txt; then
        echo -e "${GREEN}=== Latest Backup Status ===${NC}"
        docker exec $CONTAINER_NAME cat /backups/backup_status.txt
        echo ""
    else
        print_warning "No backup status file found."
    fi
    
    # Show backup counts
    DAILY_COUNT=$(docker exec $CONTAINER_NAME find /backups/daily -name "*.tar.gz" \( -type f -o -type l \) 2>/dev/null | wc -l)
    WEEKLY_COUNT=$(docker exec $CONTAINER_NAME find /backups/weekly -name "*.tar.gz" \( -type f -o -type l \) 2>/dev/null | wc -l)
    MONTHLY_COUNT=$(docker exec $CONTAINER_NAME find /backups/monthly -name "*.tar.gz" \( -type f -o -type l \) 2>/dev/null | wc -l)
    
    echo -e "${GREEN}=== Backup Counts ===${NC}"
    echo "Daily backups:   $DAILY_COUNT"
    echo "Weekly backups:  $WEEKLY_COUNT"
    echo "Monthly backups: $MONTHLY_COUNT"
    echo ""
}

# Function to download a specific backup
download_backup() {
    local backup_path=$1
    
    # Create local download directory if it doesn't exist
    mkdir -p "$LOCAL_DOWNLOAD_DIR"
    
    # Resolve symbolic link if needed
    local resolved_path=$(docker exec $CONTAINER_NAME readlink -f "$backup_path" 2>/dev/null || echo "$backup_path")
    
    # Extract filename from resolved path
    local filename=$(basename "$resolved_path")
    local local_path="$LOCAL_DOWNLOAD_DIR/$filename"
    
    print_info "Downloading: $filename"
    
    # Copy from container to local machine
    if docker cp "${CONTAINER_NAME}:${resolved_path}" "$local_path"; then
        local size=$(du -h "$local_path" | cut -f1)
        print_success "Downloaded to: $local_path (Size: $size)"
        return 0
    else
        print_error "Failed to download backup."
        return 1
    fi
}

# Function to download the latest backup
download_latest() {
    local backup_type=$1
    
    print_info "Finding latest $backup_type backup..."
    
    local latest_backup=$(docker exec $CONTAINER_NAME find /backups/$backup_type -name "*.tar.gz" \( -type f -o -type l \) -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [ -z "$latest_backup" ]; then
        print_error "No $backup_type backups found."
        return 1
    fi
    
    download_backup "$latest_backup"
}

# Function to show interactive menu
show_menu() {
    while true; do
        echo ""
        echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║    MongoDB Backup Download Tool       ║${NC}"
        echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
        echo ""
        echo "1) Show backup status"
        echo "2) List all backups"
        echo "3) List daily backups"
        echo "4) List weekly backups"
        echo "5) List monthly backups"
        echo "6) Download latest daily backup"
        echo "7) Download latest weekly backup"
        echo "8) Download latest monthly backup"
        echo "9) Download specific backup (enter path)"
        echo "0) Exit"
        echo ""
        read -p "Select an option: " choice
        
        case $choice in
            1)
                show_status
                ;;
            2)
                list_backups "all"
                ;;
            3)
                list_backups "daily"
                ;;
            4)
                list_backups "weekly"
                ;;
            5)
                list_backups "monthly"
                ;;
            6)
                download_latest "daily"
                ;;
            7)
                download_latest "weekly"
                ;;
            8)
                download_latest "monthly"
                ;;
            9)
                read -p "Enter full backup path (e.g., /backups/daily/mongodb_backup_20231119_120000.tar.gz): " backup_path
                if [ -n "$backup_path" ]; then
                    download_backup "$backup_path"
                else
                    print_error "No path provided."
                fi
                ;;
            0)
                print_info "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac
        
        read -p "Press Enter to continue..."
    done
}

# Function to show usage
show_usage() {
    cat << EOF
MongoDB Backup Download Script

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    -s, --status            Show backup status
    -l, --list [TYPE]       List backups (all/daily/weekly/monthly, default: all)
    -d, --download [TYPE]   Download latest backup (daily/weekly/monthly, default: daily)
    -p, --path PATH         Download specific backup by path
    -o, --output DIR        Set output directory (default: ./downloaded_backups)
    -i, --interactive       Show interactive menu (default if no options)

EXAMPLES:
    $0                                              # Interactive mode
    $0 -s                                           # Show status
    $0 -l daily                                     # List daily backups
    $0 -d daily                                     # Download latest daily backup
    $0 -p /backups/daily/mongodb_backup_*.tar.gz    # Download specific backup
    $0 -d weekly -o /tmp/backups                    # Download to custom directory

EOF
}

# Main script logic
main() {
    # Check prerequisites
    check_docker
    check_container
    
    # Parse command line arguments
    if [ $# -eq 0 ]; then
        # No arguments, show interactive menu
        show_menu
    fi
    
    while [ $# -gt 0 ]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -s|--status)
                show_status
                shift
                ;;
            -l|--list)
                BACKUP_TYPE=${2:-all}
                list_backups "$BACKUP_TYPE"
                shift 2
                ;;
            -d|--download)
                BACKUP_TYPE=${2:-daily}
                download_latest "$BACKUP_TYPE"
                shift 2
                ;;
            -p|--path)
                if [ -z "$2" ]; then
                    print_error "Path required for --path option"
                    exit 1
                fi
                download_backup "$2"
                shift 2
                ;;
            -o|--output)
                if [ -z "$2" ]; then
                    print_error "Directory required for --output option"
                    exit 1
                fi
                LOCAL_DOWNLOAD_DIR="$2"
                shift 2
                ;;
            -i|--interactive)
                show_menu
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Run main function
main "$@"
