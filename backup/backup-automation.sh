#!/bin/bash

# YesLocker Automated Backup and Disaster Recovery System
# Comprehensive backup solution with monitoring, encryption, and cloud storage

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$SCRIPT_DIR/backup-config.yml"
LOG_FILE="$SCRIPT_DIR/logs/backup-$(date +%Y%m%d).log"
LOCK_FILE="/tmp/yeslocker-backup.lock"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Metrics for monitoring
BACKUP_START_TIME=$(date +%s)
BACKUP_SUCCESS=0
BACKUP_ERRORS=0

# Create necessary directories
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$SCRIPT_DIR/temp"
mkdir -p "$SCRIPT_DIR/recovery"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.production" ]; then
    source "$PROJECT_ROOT/.env.production"
elif [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "SUCCESS" "$@"; }

# Print colored output
print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_header() { echo -e "${BLUE}▶ $1${NC}"; }

# Lock mechanism to prevent concurrent backups
acquire_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local pid=$(cat "$LOCK_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_error "Another backup process is running (PID: $pid)"
            exit 1
        else
            rm -f "$LOCK_FILE"
        fi
    fi
    echo $$ > "$LOCK_FILE"
    log_info "Acquired backup lock"
}

release_lock() {
    rm -f "$LOCK_FILE"
    log_info "Released backup lock"
}

# Cleanup function
cleanup() {
    local exit_code=$?
    log_info "Cleaning up backup process"
    
    # Remove temporary files
    rm -rf "$SCRIPT_DIR/temp/*" 2>/dev/null || true
    
    # Release lock
    release_lock
    
    # Send metrics to monitoring
    send_backup_metrics "$exit_code"
    
    # Send completion notification
    if [ $exit_code -eq 0 ]; then
        send_notification "success" "Backup completed successfully"
    else
        send_notification "failure" "Backup failed with exit code $exit_code"
    fi
    
    log_info "Backup process finished with exit code: $exit_code"
    exit $exit_code
}

trap cleanup EXIT

# Database backup functions
backup_database() {
    local backup_type="${1:-full}"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="yeslocker_db_${backup_type}_${timestamp}"
    local backup_file="$SCRIPT_DIR/temp/${backup_name}.sql"
    
    print_header "Starting database backup ($backup_type)"
    log_info "Starting database backup: $backup_name"
    
    # Check if required environment variables are set
    if [ -z "${SUPABASE_DB_URL:-}" ]; then
        log_error "SUPABASE_DB_URL not set"
        return 1
    fi
    
    local start_time=$(date +%s)
    
    case "$backup_type" in
        "full")
            backup_database_full "$backup_file"
            ;;
        "incremental")
            backup_database_incremental "$backup_file"
            ;;
        "schema")
            backup_database_schema "$backup_file"
            ;;
        *)
            log_error "Unknown backup type: $backup_type"
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local file_size=$(du -h "$backup_file" | cut -f1)
        
        log_success "Database backup completed in ${duration}s (Size: $file_size)"
        
        # Compress and encrypt backup
        compress_and_encrypt_backup "$backup_file"
        
        # Upload to cloud storage
        upload_backup_to_cloud "${backup_file}.gz.enc" "database"
        
        # Verify backup integrity
        verify_backup_integrity "${backup_file}.gz.enc"
        
        BACKUP_SUCCESS=$((BACKUP_SUCCESS + 1))
        return 0
    else
        log_error "Database backup failed"
        BACKUP_ERRORS=$((BACKUP_ERRORS + 1))
        return 1
    fi
}

backup_database_full() {
    local backup_file="$1"
    
    log_info "Performing full database backup"
    
    # Use pg_dump with Supabase connection
    PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
        -h "${SUPABASE_DB_HOST}" \
        -p "${SUPABASE_DB_PORT}" \
        -U "${SUPABASE_DB_USER}" \
        -d "${SUPABASE_DB_NAME}" \
        --verbose \
        --format=custom \
        --compress=6 \
        --no-owner \
        --no-privileges \
        --file="$backup_file" 2>&1 | tee -a "$LOG_FILE"
    
    return ${PIPESTATUS[0]}
}

backup_database_incremental() {
    local backup_file="$1"
    
    log_info "Performing incremental database backup"
    
    # Get last backup timestamp
    local last_backup_time=$(get_last_backup_timestamp "database")
    
    # Export only changed data since last backup
    PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
        -h "${SUPABASE_DB_HOST}" \
        -p "${SUPABASE_DB_PORT}" \
        -U "${SUPABASE_DB_USER}" \
        -d "${SUPABASE_DB_NAME}" \
        --verbose \
        --format=custom \
        --compress=6 \
        --no-owner \
        --no-privileges \
        --where="updated_at > '$last_backup_time'" \
        --file="$backup_file" 2>&1 | tee -a "$LOG_FILE"
    
    return ${PIPESTATUS[0]}
}

backup_database_schema() {
    local backup_file="$1"
    
    log_info "Performing schema-only database backup"
    
    PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
        -h "${SUPABASE_DB_HOST}" \
        -p "${SUPABASE_DB_PORT}" \
        -U "${SUPABASE_DB_USER}" \
        -d "${SUPABASE_DB_NAME}" \
        --schema-only \
        --verbose \
        --format=custom \
        --compress=6 \
        --no-owner \
        --no-privileges \
        --file="$backup_file" 2>&1 | tee -a "$LOG_FILE"
    
    return ${PIPESTATUS[0]}
}

# Application data backup
backup_application_data() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="yeslocker_app_data_${timestamp}"
    local backup_file="$SCRIPT_DIR/temp/${backup_name}.tar.gz"
    
    print_header "Starting application data backup"
    log_info "Starting application data backup: $backup_name"
    
    local start_time=$(date +%s)
    
    # Create tar archive of application data
    tar -czf "$backup_file" \
        -C "$PROJECT_ROOT" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='temp' \
        --exclude='cache' \
        src/ \
        admin/ \
        supabase/ \
        package.json \
        package-lock.json \
        *.md \
        .env.example \
        2>&1 | tee -a "$LOG_FILE"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local file_size=$(du -h "$backup_file" | cut -f1)
        
        log_success "Application data backup completed in ${duration}s (Size: $file_size)"
        
        # Encrypt backup
        encrypt_backup "$backup_file"
        
        # Upload to cloud storage
        upload_backup_to_cloud "${backup_file}.enc" "application_data"
        
        BACKUP_SUCCESS=$((BACKUP_SUCCESS + 1))
        return 0
    else
        log_error "Application data backup failed"
        BACKUP_ERRORS=$((BACKUP_ERRORS + 1))
        return 1
    fi
}

# System configuration backup
backup_system_config() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="yeslocker_system_config_${timestamp}"
    local backup_file="$SCRIPT_DIR/temp/${backup_name}.tar.gz"
    
    print_header "Starting system configuration backup"
    log_info "Starting system configuration backup: $backup_name"
    
    local start_time=$(date +%s)
    
    # Create configuration backup
    tar -czf "$backup_file" \
        -C "$PROJECT_ROOT" \
        monitoring/ \
        backup/ \
        deploy.sh \
        vercel.json \
        docker-compose.yml \
        nginx.conf \
        2>&1 | tee -a "$LOG_FILE"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local file_size=$(du -h "$backup_file" | cut -f1)
        
        log_success "System configuration backup completed in ${duration}s (Size: $file_size)"
        
        # Encrypt backup
        encrypt_backup "$backup_file"
        
        # Upload to cloud storage
        upload_backup_to_cloud "${backup_file}.enc" "system_config"
        
        BACKUP_SUCCESS=$((BACKUP_SUCCESS + 1))
        return 0
    else
        log_error "System configuration backup failed"
        BACKUP_ERRORS=$((BACKUP_ERRORS + 1))
        return 1
    fi
}

# Encryption functions
compress_and_encrypt_backup() {
    local input_file="$1"
    local compressed_file="${input_file}.gz"
    local encrypted_file="${compressed_file}.enc"
    
    log_info "Compressing backup file"
    gzip "$input_file"
    
    if [ $? -eq 0 ]; then
        log_info "Encrypting backup file"
        encrypt_backup "$compressed_file"
        return $?
    else
        log_error "Failed to compress backup file"
        return 1
    fi
}

encrypt_backup() {
    local input_file="$1"
    local output_file="${input_file}.enc"
    
    # Use AES-256-GCM encryption
    local encryption_key="${BACKUP_ENCRYPTION_KEY:-$(generate_encryption_key)}"
    
    openssl enc -aes-256-gcm \
        -in "$input_file" \
        -out "$output_file" \
        -k "$encryption_key" \
        -pbkdf2 \
        -iter 100000
    
    if [ $? -eq 0 ]; then
        log_info "Backup file encrypted successfully"
        rm "$input_file"  # Remove unencrypted file
        return 0
    else
        log_error "Failed to encrypt backup file"
        return 1
    fi
}

decrypt_backup() {
    local input_file="$1"
    local output_file="${input_file%.enc}"
    
    local encryption_key="${BACKUP_ENCRYPTION_KEY:-}"
    if [ -z "$encryption_key" ]; then
        log_error "Encryption key not provided for decryption"
        return 1
    fi
    
    openssl enc -aes-256-gcm -d \
        -in "$input_file" \
        -out "$output_file" \
        -k "$encryption_key" \
        -pbkdf2 \
        -iter 100000
    
    if [ $? -eq 0 ]; then
        log_info "Backup file decrypted successfully"
        return 0
    else
        log_error "Failed to decrypt backup file"
        return 1
    fi
}

generate_encryption_key() {
    openssl rand -hex 32
}

# Cloud storage functions
upload_backup_to_cloud() {
    local backup_file="$1"
    local backup_type="$2"
    local timestamp=$(date +%Y/%m/%d)
    
    log_info "Uploading backup to cloud storage: $(basename "$backup_file")"
    
    # Upload to AWS S3 (primary)
    if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
        upload_to_s3 "$backup_file" "$backup_type" "$timestamp"
    fi
    
    # Upload to Alibaba Cloud OSS (secondary)
    if [ -n "${ALIYUN_ACCESS_KEY_ID:-}" ] && [ -n "${ALIYUN_ACCESS_KEY_SECRET:-}" ]; then
        upload_to_oss "$backup_file" "$backup_type" "$timestamp"
    fi
    
    # Copy to local backup directory
    copy_to_local_storage "$backup_file" "$backup_type"
}

upload_to_s3() {
    local backup_file="$1"
    local backup_type="$2" 
    local timestamp="$3"
    local bucket="${AWS_BACKUP_BUCKET:-yeslocker-backups-primary}"
    local key="$backup_type/$timestamp/$(basename "$backup_file")"
    
    aws s3 cp "$backup_file" "s3://$bucket/$key" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        2>&1 | tee -a "$LOG_FILE"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log_success "Backup uploaded to S3: s3://$bucket/$key"
        return 0
    else
        log_error "Failed to upload backup to S3"
        return 1
    fi
}

upload_to_oss() {
    local backup_file="$1"
    local backup_type="$2"
    local timestamp="$3"
    local bucket="${ALIYUN_BACKUP_BUCKET:-yeslocker-backups-secondary}"
    local key="$backup_type/$timestamp/$(basename "$backup_file")"
    
    # Use Alibaba Cloud CLI (assuming installed)
    aliyun oss cp "$backup_file" "oss://$bucket/$key" \
        --region "${ALIYUN_REGION:-cn-beijing}" \
        2>&1 | tee -a "$LOG_FILE"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log_success "Backup uploaded to OSS: oss://$bucket/$key"
        return 0
    else
        log_error "Failed to upload backup to OSS"
        return 1
    fi
}

copy_to_local_storage() {
    local backup_file="$1"
    local backup_type="$2"
    local local_backup_dir="/var/backups/yeslocker/$backup_type"
    
    mkdir -p "$local_backup_dir"
    cp "$backup_file" "$local_backup_dir/"
    
    if [ $? -eq 0 ]; then
        log_info "Backup copied to local storage: $local_backup_dir"
        
        # Clean up old local backups (keep only 7 days)
        find "$local_backup_dir" -type f -mtime +7 -delete
        return 0
    else
        log_error "Failed to copy backup to local storage"
        return 1
    fi
}

# Backup verification
verify_backup_integrity() {
    local backup_file="$1"
    
    log_info "Verifying backup integrity: $(basename "$backup_file")"
    
    # Check file exists and is not empty
    if [ ! -f "$backup_file" ] || [ ! -s "$backup_file" ]; then
        log_error "Backup file does not exist or is empty"
        return 1
    fi
    
    # Test decryption (without actually decrypting)
    if [[ "$backup_file" == *.enc ]]; then
        local test_output="/tmp/backup_test_$$"
        if decrypt_backup "$backup_file" && [ -f "${backup_file%.enc}" ]; then
            log_success "Backup file encryption/decryption test passed"
            rm -f "${backup_file%.enc}"
        else
            log_error "Backup file encryption/decryption test failed"
            return 1
        fi
    fi
    
    # Calculate and store checksum
    local checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
    echo "$checksum $(basename "$backup_file")" >> "$SCRIPT_DIR/backup-checksums.txt"
    log_info "Backup checksum: $checksum"
    
    return 0
}

# Disaster recovery functions
test_backup_restoration() {
    local backup_type="${1:-database}"
    local test_environment="${2:-test}"
    
    print_header "Testing backup restoration ($backup_type)"
    log_info "Starting backup restoration test for $backup_type"
    
    case "$backup_type" in
        "database")
            test_database_restoration "$test_environment"
            ;;
        "application")
            test_application_restoration "$test_environment"
            ;;
        "full_system")
            test_full_system_restoration "$test_environment"
            ;;
        *)
            log_error "Unknown backup restoration test type: $backup_type"
            return 1
            ;;
    esac
}

test_database_restoration() {
    local test_environment="$1"
    local test_db_name="yeslocker_backup_test_$(date +%s)"
    
    log_info "Testing database restoration to $test_db_name"
    
    # Get latest database backup
    local latest_backup=$(get_latest_backup "database")
    if [ -z "$latest_backup" ]; then
        log_error "No database backup found for testing"
        return 1
    fi
    
    # Download and decrypt backup
    local local_backup="$SCRIPT_DIR/temp/test_backup_$(date +%s).sql"
    if ! download_and_decrypt_backup "$latest_backup" "$local_backup"; then
        log_error "Failed to download and decrypt backup for testing"
        return 1
    fi
    
    # Create test database
    PGPASSWORD="${SUPABASE_DB_PASSWORD}" createdb \
        -h "${SUPABASE_DB_HOST}" \
        -p "${SUPABASE_DB_PORT}" \
        -U "${SUPABASE_DB_USER}" \
        "$test_db_name"
    
    # Restore backup to test database
    PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_restore \
        -h "${SUPABASE_DB_HOST}" \
        -p "${SUPABASE_DB_PORT}" \
        -U "${SUPABASE_DB_USER}" \
        -d "$test_db_name" \
        --verbose \
        "$local_backup" 2>&1 | tee -a "$LOG_FILE"
    
    local restore_result=${PIPESTATUS[0]}
    
    if [ $restore_result -eq 0 ]; then
        # Run verification queries
        if verify_restored_database "$test_db_name"; then
            log_success "Database restoration test completed successfully"
            
            # Cleanup test database
            PGPASSWORD="${SUPABASE_DB_PASSWORD}" dropdb \
                -h "${SUPABASE_DB_HOST}" \
                -p "${SUPABASE_DB_PORT}" \
                -U "${SUPABASE_DB_USER}" \
                "$test_db_name"
            
            rm -f "$local_backup"
            return 0
        else
            log_error "Database verification failed after restoration"
            return 1
        fi
    else
        log_error "Database restoration test failed"
        return 1
    fi
}

verify_restored_database() {
    local test_db_name="$1"
    
    log_info "Verifying restored database integrity"
    
    # Run verification queries
    local queries=(
        "SELECT COUNT(*) FROM users"
        "SELECT COUNT(*) FROM applications"
        "SELECT COUNT(*) FROM lockers"
        "SELECT COUNT(*) FROM stores"
    )
    
    for query in "${queries[@]}"; do
        local result=$(PGPASSWORD="${SUPABASE_DB_PASSWORD}" psql \
            -h "${SUPABASE_DB_HOST}" \
            -p "${SUPABASE_DB_PORT}" \
            -U "${SUPABASE_DB_USER}" \
            -d "$test_db_name" \
            -t -c "$query" 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$result" ]; then
            log_info "Query '$query' returned: $(echo $result | xargs)"
        else
            log_error "Query '$query' failed or returned empty result"
            return 1
        fi
    done
    
    log_success "Database verification completed successfully"
    return 0
}

# Utility functions
get_last_backup_timestamp() {
    local backup_type="$1"
    local timestamp_file="$SCRIPT_DIR/last_backup_${backup_type}.timestamp"
    
    if [ -f "$timestamp_file" ]; then
        cat "$timestamp_file"
    else
        echo "1970-01-01 00:00:00"
    fi
}

update_last_backup_timestamp() {
    local backup_type="$1"
    local timestamp_file="$SCRIPT_DIR/last_backup_${backup_type}.timestamp"
    
    date '+%Y-%m-%d %H:%M:%S' > "$timestamp_file"
}

get_latest_backup() {
    local backup_type="$1"
    # Implementation depends on cloud storage provider
    # This is a placeholder that should be implemented based on your storage solution
    echo "latest_${backup_type}_backup.sql.gz.enc"
}

download_and_decrypt_backup() {
    local backup_path="$1"
    local output_file="$2"
    
    # Download from cloud storage
    # Implementation depends on cloud storage provider
    # This is a placeholder
    
    # Decrypt if needed
    if [[ "$backup_path" == *.enc ]]; then
        decrypt_backup "$backup_path"
    fi
    
    return 0
}

# Monitoring and alerting
send_backup_metrics() {
    local exit_code="$1"
    local backup_end_time=$(date +%s)
    local backup_duration=$((backup_end_time - BACKUP_START_TIME))
    
    # Send metrics to Prometheus pushgateway if available
    if command -v curl >/dev/null && [ -n "${PROMETHEUS_PUSHGATEWAY_URL:-}" ]; then
        curl -X POST "${PROMETHEUS_PUSHGATEWAY_URL}/metrics/job/backup/instance/$(hostname)" \
            --data-binary @- <<EOF
# TYPE backup_success_total counter
backup_success_total $BACKUP_SUCCESS
# TYPE backup_errors_total counter  
backup_errors_total $BACKUP_ERRORS
# TYPE backup_duration_seconds gauge
backup_duration_seconds $backup_duration
# TYPE backup_last_success_timestamp gauge
backup_last_success_timestamp $backup_end_time
EOF
    fi
    
    log_info "Backup metrics: Success=$BACKUP_SUCCESS, Errors=$BACKUP_ERRORS, Duration=${backup_duration}s"
}

send_notification() {
    local status="$1"
    local message="$2"
    
    # Send Slack notification
    if [ -n "${SLACK_BACKUP_WEBHOOK:-}" ]; then
        local color="good"
        local emoji="✅"
        
        if [ "$status" != "success" ]; then
            color="danger"
            emoji="❌"
        fi
        
        curl -X POST "$SLACK_BACKUP_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji YesLocker Backup $status\",
                    \"text\": \"$message\",
                    \"fields\": [
                        {\"title\": \"Success\", \"value\": \"$BACKUP_SUCCESS\", \"short\": true},
                        {\"title\": \"Errors\", \"value\": \"$BACKUP_ERRORS\", \"short\": true},
                        {\"title\": \"Duration\", \"value\": \"$(($(date +%s) - BACKUP_START_TIME))s\", \"short\": true}
                    ],
                    \"footer\": \"YesLocker Backup System\",
                    \"ts\": $(date +%s)
                }]
            }" 2>/dev/null || log_warn "Failed to send Slack notification"
    fi
    
    # Send email notification for critical issues
    if [ "$status" != "success" ] && [ -n "${BACKUP_EMAIL_RECIPIENTS:-}" ]; then
        echo "$message" | mail -s "YesLocker Backup $status" "$BACKUP_EMAIL_RECIPIENTS" 2>/dev/null || \
            log_warn "Failed to send email notification"
    fi
}

# Help function
show_help() {
    echo -e "${BLUE}YesLocker Automated Backup System${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  full-backup        Perform full system backup (database + application + config)"
    echo "  database-backup    Backup database only"
    echo "  app-backup         Backup application data only"
    echo "  config-backup      Backup system configuration only"
    echo "  test-restore       Test backup restoration"
    echo "  disaster-recovery  Execute disaster recovery procedures"
    echo "  cleanup           Clean up old backups"
    echo "  status            Show backup system status"
    echo "  help              Show this help message"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  --type TYPE       Backup type: full|incremental|schema (for database)"
    echo "  --environment ENV Target environment: production|staging|development"
    echo "  --verify         Verify backup integrity after creation"
    echo "  --no-upload      Skip cloud upload (local backup only)"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 full-backup --verify"
    echo "  $0 database-backup --type incremental"
    echo "  $0 test-restore --type database"
    echo "  $0 disaster-recovery --environment production"
}

# Main execution function
main() {
    local command="${1:-help}"
    shift || true
    
    # Parse options
    local backup_type="full"
    local environment="production"
    local verify_backup=false
    local skip_upload=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                backup_type="$2"
                shift 2
                ;;
            --environment)
                environment="$2"
                shift 2
                ;;
            --verify)
                verify_backup=true
                shift
                ;;
            --no-upload)
                skip_upload=true
                shift
                ;;
            *)
                log_warn "Unknown option: $1"
                shift
                ;;
        esac
    done
    
    # Acquire lock
    acquire_lock
    
    log_info "Starting YesLocker backup system - Command: $command"
    
    case "$command" in
        "full-backup")
            print_header "YesLocker Full System Backup"
            backup_database "$backup_type"
            backup_application_data
            backup_system_config
            update_last_backup_timestamp "full"
            ;;
        "database-backup")
            backup_database "$backup_type"
            update_last_backup_timestamp "database"
            ;;
        "app-backup")
            backup_application_data
            update_last_backup_timestamp "application"
            ;;
        "config-backup")
            backup_system_config
            update_last_backup_timestamp "config"
            ;;
        "test-restore")
            test_backup_restoration "$backup_type" "$environment"
            ;;
        "disaster-recovery")
            print_header "YesLocker Disaster Recovery"
            log_warn "Disaster recovery mode activated for environment: $environment"
            # Implementation for disaster recovery procedures would go here
            ;;
        "cleanup")
            print_header "Backup Cleanup"
            # Implementation for cleanup procedures would go here
            ;;
        "status")
            print_header "Backup System Status"
            # Implementation for status reporting would go here
            ;;
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"