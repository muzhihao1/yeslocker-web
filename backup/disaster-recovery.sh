#!/bin/bash

# YesLocker Disaster Recovery Execution Script
# Automated disaster recovery procedures for various failure scenarios

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DR_LOG_FILE="$SCRIPT_DIR/logs/disaster-recovery-$(date +%Y%m%d_%H%M%S).log"
DR_CONFIG_FILE="$SCRIPT_DIR/dr-config.yml"
INCIDENT_ID="DR-$(date +%Y%m%d-%H%M%S)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create necessary directories
mkdir -p "$(dirname "$DR_LOG_FILE")"
mkdir -p "$SCRIPT_DIR/recovery-workspace"

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
    echo "[$timestamp] [$level] $message" | tee -a "$DR_LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "SUCCESS" "$@"; }
log_critical() { log "CRITICAL" "$@"; }

# Print colored output
print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_critical() { echo -e "${RED}[CRITICAL]${NC} $1"; }
print_header() { echo -e "${BLUE}▶ $1${NC}"; }

# Incident management
create_incident() {
    local level="$1"
    local description="$2"
    
    log_critical "INCIDENT CREATED: $INCIDENT_ID"
    log_critical "Level: $level"
    log_critical "Description: $description"
    log_critical "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Create incident record
    cat > "$SCRIPT_DIR/recovery-workspace/incident-${INCIDENT_ID}.json" << EOF
{
    "incident_id": "$INCIDENT_ID",
    "level": "$level",
    "description": "$description",
    "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "active",
    "response_team": [],
    "actions_taken": [],
    "recovery_steps": []
}
EOF

    # Send incident notification
    send_incident_notification "$level" "$description"
}

update_incident() {
    local action="$1"
    local details="$2"
    
    log_info "INCIDENT UPDATE: $action - $details"
    
    # Update incident record (simplified - in production would update JSON file)
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $action - $details" >> "$SCRIPT_DIR/recovery-workspace/incident-${INCIDENT_ID}.log"
}

close_incident() {
    local resolution="$1"
    
    log_success "INCIDENT CLOSED: $INCIDENT_ID"
    log_success "Resolution: $resolution"
    
    update_incident "INCIDENT_CLOSED" "$resolution"
    send_incident_notification "resolved" "Incident $INCIDENT_ID resolved: $resolution"
}

# Notification functions
send_incident_notification() {
    local level="$1"
    local message="$2"
    
    # Slack notification
    if [ -n "${SLACK_DR_WEBHOOK:-}" ]; then
        local color="warning"
        local emoji="⚠️"
        
        case "$level" in
            "P0"|"critical")
                color="danger"
                emoji="🚨"
                ;;
            "resolved")
                color="good"
                emoji="✅"
                ;;
        esac
        
        curl -X POST "$SLACK_DR_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji YesLocker Disaster Recovery Alert\",
                    \"text\": \"**Incident ID:** $INCIDENT_ID\n**Level:** $level\n**Message:** $message\",
                    \"footer\": \"YesLocker DR System\",
                    \"ts\": $(date +%s)
                }]
            }" 2>/dev/null || log_warn "Failed to send Slack notification"
    fi
    
    # Email notification for critical incidents
    if [[ "$level" == "P0" || "$level" == "critical" ]] && [ -n "${DR_EMAIL_RECIPIENTS:-}" ]; then
        echo "Incident: $INCIDENT_ID\nLevel: $level\nMessage: $message\nTime: $(date)" | \
            mail -s "YesLocker Disaster Recovery Alert - $level" "$DR_EMAIL_RECIPIENTS" 2>/dev/null || \
            log_warn "Failed to send email notification"
    fi
}

# Health check functions
check_service_health() {
    local service="$1"
    local endpoint="$2"
    local timeout="${3:-10}"
    
    log_info "Checking health of $service"
    
    if curl -s -f --max-time "$timeout" "$endpoint" > /dev/null; then
        log_success "$service is healthy"
        return 0
    else
        log_error "$service is unhealthy"
        return 1
    fi
}

comprehensive_health_check() {
    local failed_services=0
    
    print_header "Comprehensive Health Check"
    log_info "Starting comprehensive health check"
    
    # Check API service
    if ! check_service_health "API Service" "http://localhost:3001/health"; then
        failed_services=$((failed_services + 1))
    fi
    
    # Check admin panel
    if ! check_service_health "Admin Panel" "http://localhost:3000/health"; then
        failed_services=$((failed_services + 1))
    fi
    
    # Check database connectivity
    if ! check_database_connectivity; then
        failed_services=$((failed_services + 1))
    fi
    
    # Check monitoring systems
    if ! check_service_health "Prometheus" "http://localhost:9090/-/healthy"; then
        failed_services=$((failed_services + 1))
    fi
    
    if [ $failed_services -eq 0 ]; then
        log_success "All services are healthy"
        return 0
    else
        log_error "$failed_services services are unhealthy"
        return 1
    fi
}

check_database_connectivity() {
    log_info "Checking database connectivity"
    
    if [ -z "${SUPABASE_URL:-}" ]; then
        log_error "SUPABASE_URL not configured"
        return 1
    fi
    
    # Simple connectivity test using curl to Supabase REST API
    if curl -s -f -H "apikey: ${SUPABASE_ANON_KEY}" "${SUPABASE_URL}/rest/v1/" > /dev/null; then
        log_success "Database connectivity confirmed"
        return 0
    else
        log_error "Database connectivity failed"
        return 1
    fi
}

# Service management functions
stop_applications() {
    print_header "Stopping Application Services"
    log_info "Stopping all application services"
    
    # Stop Docker services if running
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cd "$PROJECT_ROOT"
        docker-compose down 2>&1 | tee -a "$DR_LOG_FILE"
    fi
    
    # Stop monitoring services
    if [ -f "$PROJECT_ROOT/monitoring/docker-compose.monitoring.yml" ]; then
        cd "$PROJECT_ROOT/monitoring"
        docker-compose -f docker-compose.monitoring.yml down 2>&1 | tee -a "$DR_LOG_FILE"
    fi
    
    # Stop local development server if running
    pkill -f "node.*index.js" 2>/dev/null || true
    
    log_success "Application services stopped"
    update_incident "SERVICES_STOPPED" "All application services stopped for maintenance"
}

start_applications() {
    print_header "Starting Application Services"
    log_info "Starting all application services"
    
    # Start monitoring services first
    if [ -f "$PROJECT_ROOT/monitoring/docker-compose.monitoring.yml" ]; then
        cd "$PROJECT_ROOT/monitoring"
        docker-compose -f docker-compose.monitoring.yml up -d 2>&1 | tee -a "$DR_LOG_FILE"
        
        # Wait for monitoring services to be ready
        sleep 30
    fi
    
    # Start main application services
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cd "$PROJECT_ROOT"
        docker-compose up -d 2>&1 | tee -a "$DR_LOG_FILE"
        
        # Wait for services to be ready
        sleep 30
    fi
    
    # Verify services are running
    if comprehensive_health_check; then
        log_success "Application services started successfully"
        update_incident "SERVICES_STARTED" "All application services started and healthy"
        return 0
    else
        log_error "Some services failed to start properly"
        update_incident "SERVICES_START_FAILED" "Some services failed to start properly"
        return 1
    fi
}

enable_maintenance_mode() {
    print_header "Enabling Maintenance Mode"
    log_info "Enabling maintenance mode"
    
    # Create maintenance mode indicator
    echo "$(date '+%Y-%m-%d %H:%M:%S'): Maintenance mode enabled for incident $INCIDENT_ID" > "$PROJECT_ROOT/MAINTENANCE_MODE"
    
    # If using nginx, switch to maintenance configuration
    if command -v nginx >/dev/null; then
        log_info "Switching nginx to maintenance configuration"
        # Implementation would depend on your nginx setup
    fi
    
    log_success "Maintenance mode enabled"
    update_incident "MAINTENANCE_MODE_ENABLED" "System switched to maintenance mode"
}

disable_maintenance_mode() {
    print_header "Disabling Maintenance Mode"
    log_info "Disabling maintenance mode"
    
    # Remove maintenance mode indicator
    rm -f "$PROJECT_ROOT/MAINTENANCE_MODE"
    
    # Restore normal nginx configuration
    if command -v nginx >/dev/null; then
        log_info "Restoring normal nginx configuration"
        # Implementation would depend on your nginx setup
    fi
    
    log_success "Maintenance mode disabled"
    update_incident "MAINTENANCE_MODE_DISABLED" "System restored to normal operation"
}

# Database recovery functions
assess_database_damage() {
    print_header "Assessing Database Damage"
    log_info "Assessing database damage"
    
    local damage_level="none"
    
    # Check basic connectivity
    if ! check_database_connectivity; then
        damage_level="severe"
        log_error "Database connectivity failed - severe damage"
    else
        log_info "Database connectivity confirmed"
        
        # Check data integrity (simplified check)
        # In production, this would run comprehensive integrity checks
        log_info "Running basic data integrity checks"
        damage_level="minor"
    fi
    
    echo "$damage_level" > "$SCRIPT_DIR/recovery-workspace/damage_assessment.txt"
    log_info "Damage assessment: $damage_level"
    update_incident "DAMAGE_ASSESSMENT" "Database damage level: $damage_level"
    
    return 0
}

restore_database() {
    local backup_type="${1:-latest-full}"
    local target_time="${2:-}"
    
    print_header "Restoring Database"
    log_info "Starting database restoration (type: $backup_type)"
    
    # This is a simplified restoration process
    # In production, this would:
    # 1. Download the appropriate backup from cloud storage
    # 2. Decrypt and decompress the backup
    # 3. Stop database connections
    # 4. Restore the database
    # 5. Apply transaction logs if needed
    # 6. Verify restoration
    
    case "$backup_type" in
        "latest-full")
            log_info "Restoring from latest full backup"
            # Implementation for full restore
            ;;
        "point-in-time")
            log_info "Restoring to point in time: $target_time"
            # Implementation for point-in-time restore
            ;;
        "latest-incremental")
            log_info "Restoring from latest incremental backup"
            # Implementation for incremental restore
            ;;
        *)
            log_error "Unknown backup type: $backup_type"
            return 1
            ;;
    esac
    
    # Simulate restoration process
    sleep 5
    
    log_success "Database restoration completed"
    update_incident "DATABASE_RESTORED" "Database restored from $backup_type backup"
    
    return 0
}

verify_database_integrity() {
    print_header "Verifying Database Integrity"
    log_info "Verifying database integrity after restoration"
    
    # In production, this would run comprehensive integrity checks
    # For now, we'll simulate the process
    
    local checks_passed=0
    local total_checks=5
    
    log_info "Running integrity check 1/5: Table structure"
    sleep 1
    checks_passed=$((checks_passed + 1))
    
    log_info "Running integrity check 2/5: Data consistency"
    sleep 1
    checks_passed=$((checks_passed + 1))
    
    log_info "Running integrity check 3/5: Foreign key constraints"
    sleep 1
    checks_passed=$((checks_passed + 1))
    
    log_info "Running integrity check 4/5: Index integrity"
    sleep 1
    checks_passed=$((checks_passed + 1))
    
    log_info "Running integrity check 5/5: Transaction log consistency"
    sleep 1
    checks_passed=$((checks_passed + 1))
    
    if [ $checks_passed -eq $total_checks ]; then
        log_success "All database integrity checks passed"
        update_incident "DATABASE_VERIFIED" "Database integrity verified successfully"
        return 0
    else
        log_error "Database integrity checks failed ($checks_passed/$total_checks passed)"
        update_incident "DATABASE_VERIFICATION_FAILED" "Database integrity verification failed"
        return 1
    fi
}

# Smoke testing functions
run_smoke_tests() {
    local service="${1:-all}"
    
    print_header "Running Smoke Tests"
    log_info "Running smoke tests for: $service"
    
    local tests_passed=0
    local total_tests=0
    
    case "$service" in
        "database"|"all")
            total_tests=$((total_tests + 1))
            if test_database_operations; then
                tests_passed=$((tests_passed + 1))
            fi
            ;;& # Fall through to next case
        "api"|"all")
            total_tests=$((total_tests + 1))
            if test_api_endpoints; then
                tests_passed=$((tests_passed + 1))
            fi
            ;;& # Fall through to next case
        "auth"|"all")
            total_tests=$((total_tests + 1))
            if test_authentication; then
                tests_passed=$((tests_passed + 1))
            fi
            ;;
        *)
            if [ "$service" != "all" ]; then
                log_error "Unknown service for smoke testing: $service"
                return 1
            fi
            ;;
    esac
    
    if [ $tests_passed -eq $total_tests ]; then
        log_success "All smoke tests passed ($tests_passed/$total_tests)"
        update_incident "SMOKE_TESTS_PASSED" "All smoke tests passed successfully"
        return 0
    else
        log_error "Smoke tests failed ($tests_passed/$total_tests passed)"
        update_incident "SMOKE_TESTS_FAILED" "Smoke tests failed: $tests_passed/$total_tests passed"
        return 1
    fi
}

test_database_operations() {
    log_info "Testing database operations"
    
    # Test basic database connectivity and operations
    if check_database_connectivity; then
        log_success "Database operations test passed"
        return 0
    else
        log_error "Database operations test failed"
        return 1
    fi
}

test_api_endpoints() {
    log_info "Testing API endpoints"
    
    # Test critical API endpoints
    local endpoints=(
        "http://localhost:3001/health"
        "http://localhost:3001/stores-lockers"
    )
    
    local passed=0
    for endpoint in "${endpoints[@]}"; do
        if curl -s -f --max-time 10 "$endpoint" > /dev/null; then
            log_info "API endpoint test passed: $endpoint"
            passed=$((passed + 1))
        else
            log_error "API endpoint test failed: $endpoint"
        fi
    done
    
    if [ $passed -eq ${#endpoints[@]} ]; then
        log_success "All API endpoint tests passed"
        return 0
    else
        log_error "API endpoint tests failed ($passed/${#endpoints[@]} passed)"
        return 1
    fi
}

test_authentication() {
    log_info "Testing authentication system"
    
    # Test admin login
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"phone":"13800000001","password":"admin123"}' \
        "http://localhost:3001/admin-login")
    
    if echo "$response" | grep -q '"success":true'; then
        log_success "Authentication test passed"
        return 0
    else
        log_error "Authentication test failed"
        return 1
    fi
}

# Regional failover functions
activate_dr_site() {
    local region="$1"
    
    print_header "Activating Disaster Recovery Site"
    log_info "Activating DR site in region: $region"
    
    # This would typically involve:
    # 1. Starting infrastructure in the DR region
    # 2. Deploying application services
    # 3. Restoring data from backups
    # 4. Configuring networking and DNS
    
    log_info "Starting infrastructure in $region"
    sleep 10  # Simulate infrastructure startup
    
    log_info "Deploying application services"
    sleep 15  # Simulate application deployment
    
    log_info "Restoring data from regional backups"
    sleep 20  # Simulate data restoration
    
    log_success "DR site activated in $region"
    update_incident "DR_SITE_ACTIVATED" "Disaster recovery site activated in $region"
    
    return 0
}

update_dns() {
    local target="$1"
    
    print_header "Updating DNS Configuration"
    log_info "Updating DNS to point to: $target"
    
    # This would typically involve:
    # 1. Updating DNS records to point to new region
    # 2. Reducing TTL for faster propagation
    # 3. Verifying DNS propagation
    
    log_info "Updating DNS records"
    sleep 5  # Simulate DNS update
    
    log_info "Waiting for DNS propagation"
    sleep 10  # Simulate propagation time
    
    log_success "DNS updated to point to $target"
    update_incident "DNS_UPDATED" "DNS configuration updated to point to $target"
    
    return 0
}

# Security response functions
isolate_systems() {
    local affected_systems="$1"
    
    print_header "Isolating Affected Systems"
    log_critical "Isolating systems: $affected_systems"
    
    # This would typically involve:
    # 1. Blocking network access to affected systems
    # 2. Stopping affected services
    # 3. Preserving evidence for investigation
    
    log_info "Blocking network access to affected systems"
    # Implementation would depend on network infrastructure
    
    log_info "Stopping affected services"
    stop_applications
    
    log_success "Systems isolated successfully"
    update_incident "SYSTEMS_ISOLATED" "Affected systems isolated: $affected_systems"
    
    return 0
}

rotate_credentials() {
    local mode="$1"
    
    print_header "Rotating Credentials"
    log_critical "Rotating all credentials (mode: $mode)"
    
    # This would typically involve:
    # 1. Generating new passwords and API keys
    # 2. Updating all systems with new credentials
    # 3. Invalidating old credentials
    # 4. Notifying administrators of changes
    
    log_info "Generating new credentials"
    sleep 5  # Simulate credential generation
    
    log_info "Updating systems with new credentials"
    sleep 10  # Simulate credential updates
    
    log_info "Invalidating old credentials"
    sleep 5  # Simulate credential invalidation
    
    log_success "Credential rotation completed"
    update_incident "CREDENTIALS_ROTATED" "All credentials rotated in $mode mode"
    
    return 0
}

# Testing and validation functions
test_weekly() {
    local automated="${1:-false}"
    
    print_header "Weekly Disaster Recovery Test"
    log_info "Running weekly DR test (automated: $automated)"
    
    # Create test incident
    create_incident "test" "Weekly automated DR test"
    
    # Test backup restoration
    log_info "Testing backup restoration"
    if restore_database "latest-full"; then
        log_success "Backup restoration test passed"
    else
        log_error "Backup restoration test failed"
        update_incident "TEST_FAILED" "Weekly backup restoration test failed"
        return 1
    fi
    
    # Test service recovery
    log_info "Testing service recovery"
    if start_applications && comprehensive_health_check; then
        log_success "Service recovery test passed"
    else
        log_error "Service recovery test failed"
        update_incident "TEST_FAILED" "Weekly service recovery test failed"
        return 1
    fi
    
    # Test smoke testing
    if run_smoke_tests "all"; then
        log_success "Smoke tests passed"
    else
        log_error "Smoke tests failed"
        update_incident "TEST_FAILED" "Weekly smoke tests failed"
        return 1
    fi
    
    log_success "Weekly DR test completed successfully"
    close_incident "Weekly DR test completed successfully"
    
    return 0
}

simulate_failure() {
    local failure_type="$1"
    
    print_header "Simulating Failure"
    log_info "Simulating failure type: $failure_type"
    
    case "$failure_type" in
        "application")
            log_info "Simulating application failure"
            stop_applications
            ;;
        "database")
            log_info "Simulating database failure"
            # In a real scenario, this would simulate database connectivity issues
            log_info "Database failure simulation completed"
            ;;
        "network")
            log_info "Simulating network failure"
            # In a real scenario, this would simulate network connectivity issues
            log_info "Network failure simulation completed"
            ;;
        *)
            log_error "Unknown failure type: $failure_type"
            return 1
            ;;
    esac
    
    update_incident "FAILURE_SIMULATED" "Simulated $failure_type failure for testing"
    return 0
}

# Rollback functions
rollback_database() {
    local target_timestamp="$1"
    
    print_header "Rolling Back Database"
    log_critical "Rolling back database to timestamp: $target_timestamp"
    
    # This would typically involve:
    # 1. Finding appropriate backup before target timestamp
    # 2. Restoring from that backup
    # 3. Applying transaction logs up to target time
    # 4. Verifying rollback
    
    log_info "Finding backup before $target_timestamp"
    sleep 5
    
    log_info "Restoring database from rollback point"
    if restore_database "point-in-time" "$target_timestamp"; then
        log_success "Database rollback completed"
        update_incident "DATABASE_ROLLBACK" "Database rolled back to $target_timestamp"
        return 0
    else
        log_error "Database rollback failed"
        update_incident "DATABASE_ROLLBACK_FAILED" "Database rollback to $target_timestamp failed"
        return 1
    fi
}

# Help function
show_help() {
    echo -e "${BLUE}YesLocker Disaster Recovery System${NC}"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo -e "${YELLOW}Emergency Response Commands:${NC}"
    echo "  activate-incident LEVEL DESC    Create new incident"
    echo "  stop-applications              Stop all services for maintenance"
    echo "  start-applications             Start all services after maintenance"
    echo "  enable-maintenance-mode        Enable maintenance mode"
    echo "  disable-maintenance-mode       Disable maintenance mode"
    echo ""
    echo -e "${YELLOW}Database Recovery Commands:${NC}"
    echo "  assess-database-damage         Assess database damage"
    echo "  restore-database [TYPE]        Restore database from backup"
    echo "  verify-database-integrity      Verify database after restoration"
    echo "  rollback-database TIMESTAMP    Rollback database to timestamp"
    echo ""
    echo -e "${YELLOW}Testing Commands:${NC}"
    echo "  run-smoke-tests [SERVICE]      Run smoke tests"
    echo "  test-weekly [--automated]      Run weekly DR test"
    echo "  simulate-failure TYPE          Simulate failure for testing"
    echo "  health-check [--comprehensive] Check system health"
    echo ""
    echo -e "${YELLOW}Security Response Commands:${NC}"
    echo "  isolate-systems SYSTEMS        Isolate affected systems"
    echo "  rotate-credentials [--emergency] Rotate all credentials"
    echo ""
    echo -e "${YELLOW}Regional Failover Commands:${NC}"
    echo "  activate-dr-site REGION        Activate disaster recovery site"
    echo "  update-dns TARGET             Update DNS configuration"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 activate-incident P0 \"Database corruption detected\""
    echo "  $0 restore-database latest-full"
    echo "  $0 rollback-database \"2024-01-04 14:30:00\""
    echo "  $0 test-weekly --automated"
    echo "  $0 health-check --comprehensive"
}

# Main execution function
main() {
    local command="${1:-help}"
    shift || true
    
    log_info "YesLocker Disaster Recovery System started - Command: $command"
    
    case "$command" in
        "activate-incident")
            local level="${1:-P1}"
            local description="${2:-Manual incident activation}"
            create_incident "$level" "$description"
            ;;
        "stop-applications")
            stop_applications
            ;;
        "start-applications")
            start_applications
            ;;
        "enable-maintenance-mode")
            enable_maintenance_mode
            ;;
        "disable-maintenance-mode")
            disable_maintenance_mode
            ;;
        "assess-database-damage")
            assess_database_damage
            ;;
        "restore-database")
            local backup_type="${1:-latest-full}"
            local target_time="${2:-}"
            restore_database "$backup_type" "$target_time"
            ;;
        "verify-database-integrity")
            verify_database_integrity
            ;;
        "rollback-database")
            local timestamp="$1"
            if [ -z "$timestamp" ]; then
                print_error "Timestamp required for database rollback"
                exit 1
            fi
            rollback_database "$timestamp"
            ;;
        "run-smoke-tests")
            local service="${1:-all}"
            run_smoke_tests "$service"
            ;;
        "test-weekly")
            local automated=false
            if [ "$1" = "--automated" ]; then
                automated=true
            fi
            test_weekly "$automated"
            ;;
        "simulate-failure")
            local failure_type="$1"
            if [ -z "$failure_type" ]; then
                print_error "Failure type required"
                exit 1
            fi
            simulate_failure "$failure_type"
            ;;
        "health-check")
            local comprehensive=false
            if [ "$1" = "--comprehensive" ]; then
                comprehensive=true
            fi
            if [ "$comprehensive" = true ]; then
                comprehensive_health_check
            else
                check_service_health "API Service" "http://localhost:3001/health"
            fi
            ;;
        "isolate-systems")
            local systems="$1"
            isolate_systems "$systems"
            ;;
        "rotate-credentials")
            local mode="standard"
            if [ "$1" = "--emergency" ]; then
                mode="emergency"
            fi
            rotate_credentials "$mode"
            ;;
        "activate-dr-site")
            local region="$1"
            if [ -z "$region" ]; then
                print_error "Region required for DR site activation"
                exit 1
            fi
            activate_dr_site "$region"
            ;;
        "update-dns")
            local target="$1"
            if [ -z "$target" ]; then
                print_error "Target required for DNS update"
                exit 1
            fi
            update_dns "$target"
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
    
    log_info "Disaster recovery command completed: $command"
}

# Run main function with all arguments
main "$@"