#!/bin/bash

# EduOpps Docker Backup Script
# Automated backup solution for database and uploads

set -e

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="eduopps-db"
DB_NAME="eduopps"
DB_USER="eduopps"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

backup_database() {
    log_info "Creating database backup..."
    
    if ! docker-compose ps | grep -q "$CONTAINER_NAME.*Up"; then
        log_error "Database container is not running"
        exit 1
    fi
    
    # Create database dump
    docker-compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --no-password > "$BACKUP_DIR/database_$DATE.sql"
    
    # Compress the backup
    gzip "$BACKUP_DIR/database_$DATE.sql"
    
    log_success "Database backup created: $BACKUP_DIR/database_$DATE.sql.gz"
}

backup_uploads() {
    log_info "Creating uploads backup..."
    
    # Get the uploads volume mount point
    UPLOADS_PATH=$(docker volume inspect eduopps_uploads_data --format '{{ .Mountpoint }}' 2>/dev/null)
    
    if [ -n "$UPLOADS_PATH" ] && [ -d "$UPLOADS_PATH" ]; then
        # Create tar archive of uploads
        sudo tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$UPLOADS_PATH" .
        log_success "Uploads backup created: $BACKUP_DIR/uploads_$DATE.tar.gz"
    else
        log_info "No uploads volume found or volume is empty"
    fi
}

backup_env() {
    log_info "Backing up environment configuration..."
    
    if [ -f ".env" ]; then
        # Copy env file (remove sensitive data)
        grep -v -E "(PASSWORD|SECRET|KEY)" .env > "$BACKUP_DIR/env_template_$DATE.txt" || true
        log_success "Environment template backed up: $BACKUP_DIR/env_template_$DATE.txt"
    fi
}

cleanup_old_backups() {
    log_info "Cleaning up old backups (keeping last 30 days)..."
    
    # Remove database backups older than 30 days
    find "$BACKUP_DIR" -name "database_*.sql.gz" -mtime +30 -delete 2>/dev/null || true
    
    # Remove upload backups older than 30 days
    find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +30 -delete 2>/dev/null || true
    
    # Remove env templates older than 30 days
    find "$BACKUP_DIR" -name "env_template_*.txt" -mtime +30 -delete 2>/dev/null || true
    
    log_success "Old backups cleaned up"
}

restore_database() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "Please specify backup file to restore"
        echo "Usage: $0 restore-db <backup_file.sql.gz>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_info "Restoring database from: $backup_file"
    
    # Stop the application to prevent conflicts
    docker-compose stop app
    
    # Restore database
    gunzip -c "$backup_file" | docker-compose exec -T db psql -U "$DB_USER" -d "$DB_NAME"
    
    # Restart application
    docker-compose start app
    
    log_success "Database restored successfully"
}

restore_uploads() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        log_error "Please specify backup file to restore"
        echo "Usage: $0 restore-uploads <backup_file.tar.gz>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_info "Restoring uploads from: $backup_file"
    
    UPLOADS_PATH=$(docker volume inspect eduopps_uploads_data --format '{{ .Mountpoint }}')
    
    # Stop application
    docker-compose stop app
    
    # Clear existing uploads and restore
    sudo rm -rf "$UPLOADS_PATH"/*
    sudo tar -xzf "$backup_file" -C "$UPLOADS_PATH"
    
    # Fix permissions
    sudo chown -R 1001:1001 "$UPLOADS_PATH"
    
    # Restart application
    docker-compose start app
    
    log_success "Uploads restored successfully"
}

list_backups() {
    log_info "Available backups:"
    echo
    
    if ls "$BACKUP_DIR"/database_*.sql.gz 1> /dev/null 2>&1; then
        echo "Database backups:"
        ls -lh "$BACKUP_DIR"/database_*.sql.gz
        echo
    fi
    
    if ls "$BACKUP_DIR"/uploads_*.tar.gz 1> /dev/null 2>&1; then
        echo "Upload backups:"
        ls -lh "$BACKUP_DIR"/uploads_*.tar.gz
        echo
    fi
}

show_help() {
    echo "EduOpps Backup Script"
    echo
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  backup           Create full backup (database + uploads)"
    echo "  backup-db        Backup database only"
    echo "  backup-uploads   Backup uploads only"
    echo "  restore-db <file>    Restore database from backup"
    echo "  restore-uploads <file> Restore uploads from backup"
    echo "  list             List available backups"
    echo "  cleanup          Remove old backups"
    echo "  help             Show this help"
    echo
    echo "Examples:"
    echo "  $0 backup"
    echo "  $0 restore-db backups/database_20240115_120000.sql.gz"
    echo "  $0 restore-uploads backups/uploads_20240115_120000.tar.gz"
}

# Main logic
case "${1:-backup}" in
    backup)
        log_info "Starting full backup..."
        backup_database
        backup_uploads
        backup_env
        cleanup_old_backups
        log_success "Full backup completed"
        ;;
    backup-db)
        backup_database
        ;;
    backup-uploads)
        backup_uploads
        ;;
    restore-db)
        restore_database "$2"
        ;;
    restore-uploads)
        restore_uploads "$2"
        ;;
    list)
        list_backups
        ;;
    cleanup)
        cleanup_old_backups
        ;;
    help)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac