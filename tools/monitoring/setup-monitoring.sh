#!/bin/bash

# YesLocker Monitoring Stack Setup Script
# This script sets up a comprehensive monitoring, alerting, and observability system

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MONITORING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$MONITORING_DIR")"
DOCKER_COMPOSE_FILE="$MONITORING_DIR/docker-compose.monitoring.yml"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Function to check if Docker is installed and running
check_docker() {
    print_header "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_status "Docker and Docker Compose are available"
}

# Function to create necessary directories
create_directories() {
    print_header "Creating monitoring directories..."
    
    local dirs=(
        "$MONITORING_DIR/grafana/provisioning/datasources"
        "$MONITORING_DIR/grafana/provisioning/dashboards"
        "$MONITORING_DIR/grafana/dashboards"
        "$MONITORING_DIR/alert_rules"
        "$MONITORING_DIR/logs"
        "$MONITORING_DIR/data/prometheus"
        "$MONITORING_DIR/data/grafana"
        "$MONITORING_DIR/data/alertmanager"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        print_status "Created directory: $dir"
    done
}

# Function to generate configuration files
generate_configs() {
    print_header "Generating configuration files..."
    
    # Grafana datasource configuration
    cat > "$MONITORING_DIR/grafana/provisioning/datasources/prometheus.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
    
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true
    
  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: true
EOF

    # Grafana dashboard configuration
    cat > "$MONITORING_DIR/grafana/provisioning/dashboards/default.yml" << 'EOF'
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    # Blackbox exporter configuration
    cat > "$MONITORING_DIR/blackbox.yml" << 'EOF'
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: []
      method: GET
      headers:
        Host: yeslocker.com
        Accept-Language: en-US
      no_follow_redirects: false
      fail_if_ssl: false
      fail_if_not_ssl: false
      
  http_post_2xx:
    prober: http
    timeout: 5s
    http:
      method: POST
      headers:
        Content-Type: application/json
      body: '{}'
      
  tcp_connect:
    prober: tcp
    timeout: 5s
    
  icmp:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: "ip4"
EOF

    # Loki configuration
    cat > "$MONITORING_DIR/loki-config.yaml" << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 100

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://alertmanager:9093

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: false
  retention_period: 0s

compactor:
  working_directory: /loki/boltdb-shipper-compactor
  shared_store: filesystem
EOF

    # Promtail configuration
    cat > "$MONITORING_DIR/promtail-config.yaml" << 'EOF'
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*log
          
    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - json:
          expressions:
            tag:
          source: attrs
      - regex:
          expression: (?P<container_name>(?:[^|])*[^|])
          source: tag
      - timestamp:
          format: RFC3339Nano
          source: time
      - labels:
          stream:
          container_name:
      - output:
          source: output

  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*log
EOF

    # Traefik configuration
    cat > "$MONITORING_DIR/traefik.yml" << 'EOF'
api:
  dashboard: true
  insecure: true

entryPoints:
  web:
    address: ":80"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false

metrics:
  prometheus:
    addEntryPointsLabels: true
    addServicesLabels: true
EOF

    # Filebeat configuration
    cat > "$MONITORING_DIR/filebeat.yml" << 'EOF'
filebeat.inputs:
- type: container
  paths:
    - '/var/lib/docker/containers/*/*.log'

processors:
- add_docker_metadata:
    host: "unix:///var/run/docker.sock"

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "yeslocker-logs-%{+yyyy.MM.dd}"

setup.template.name: "yeslocker-logs"
setup.template.pattern: "yeslocker-logs-*"

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
EOF

    # PostgreSQL exporter queries
    cat > "$MONITORING_DIR/postgres-queries.yaml" << 'EOF'
pg_replication:
  query: "SELECT CASE WHEN NOT pg_is_in_recovery() THEN 0 ELSE GREATEST (0, EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))) END AS lag"
  master: true
  metrics:
    - lag:
        usage: "GAUGE"
        description: "Replication lag behind master in seconds"

pg_postmaster:
  query: "SELECT pg_postmaster_start_time as start_time_seconds from pg_postmaster_start_time()"
  master: true
  metrics:
    - start_time_seconds:
        usage: "GAUGE"
        description: "Time at which postmaster started"

pg_stat_user_tables:
  query: |
   SELECT
     current_database() datname,
     schemaname,
     relname,
     seq_scan,
     seq_tup_read,
     idx_scan,
     idx_tup_fetch,
     n_tup_ins,
     n_tup_upd,
     n_tup_del,
     n_tup_hot_upd,
     n_live_tup,
     n_dead_tup,
     n_mod_since_analyze,
     COALESCE(last_vacuum, '1970-01-01Z') as last_vacuum,
     COALESCE(last_autovacuum, '1970-01-01Z') as last_autovacuum,
     COALESCE(last_analyze, '1970-01-01Z') as last_analyze,
     COALESCE(last_autoanalyze, '1970-01-01Z') as last_autoanalyze,
     vacuum_count,
     autovacuum_count,
     analyze_count,
     autoanalyze_count
   FROM pg_stat_user_tables
  metrics:
    - datname:
        usage: "LABEL"
        description: "Name of current database"
    - schemaname:
        usage: "LABEL"
        description: "Name of the schema that this table is in"
    - relname:
        usage: "LABEL"
        description: "Name of this table"
    - seq_scan:
        usage: "COUNTER"
        description: "Number of sequential scans initiated on this table"
    - seq_tup_read:
        usage: "COUNTER"
        description: "Number of live rows fetched by sequential scans"
    - idx_scan:
        usage: "COUNTER"
        description: "Number of index scans initiated on this table"
    - idx_tup_fetch:
        usage: "COUNTER"
        description: "Number of live rows fetched by index scans"
    - n_tup_ins:
        usage: "COUNTER"
        description: "Number of rows inserted"
    - n_tup_upd:
        usage: "COUNTER"
        description: "Number of rows updated"
    - n_tup_del:
        usage: "COUNTER"
        description: "Number of rows deleted"
    - n_tup_hot_upd:
        usage: "COUNTER"
        description: "Number of rows HOT updated"
    - n_live_tup:
        usage: "GAUGE"
        description: "Estimated number of live rows"
    - n_dead_tup:
        usage: "GAUGE"
        description: "Estimated number of dead rows"
    - n_mod_since_analyze:
        usage: "GAUGE"
        description: "Estimated number of rows changed since last analyze"
    - last_vacuum:
        usage: "GAUGE"
        description: "Last time at which this table was manually vacuumed"
    - last_autovacuum:
        usage: "GAUGE"
        description: "Last time at which this table was vacuumed by the autovacuum daemon"
    - last_analyze:
        usage: "GAUGE"
        description: "Last time at which this table was manually analyzed"
    - last_autoanalyze:
        usage: "GAUGE"
        description: "Last time at which this table was analyzed by the autovacuum daemon"
    - vacuum_count:
        usage: "COUNTER"
        description: "Number of times this table has been manually vacuumed"
    - autovacuum_count:
        usage: "COUNTER"
        description: "Number of times this table has been vacuumed by the autovacuum daemon"
    - analyze_count:
        usage: "COUNTER"
        description: "Number of times this table has been manually analyzed"
    - autoanalyze_count:
        usage: "COUNTER"
        description: "Number of times this table has been analyzed by the autovacuum daemon"
EOF

    print_status "Configuration files generated successfully"
}

# Function to integrate monitoring middleware with application
integrate_monitoring() {
    print_header "Integrating monitoring middleware with application..."
    
    # Create a sample integration file
    cat > "$PROJECT_ROOT/server/monitoring-integration-example.js" << 'EOF'
// Example integration of monitoring middleware in your Express application
const express = require('express');
const { 
  metricsMiddleware, 
  addMonitoringRoutes,
  trackUserRegistration,
  trackApplication,
  trackLockerOperation,
  trackAdminAction
} = require('../monitoring/health-check-middleware');

const app = express();

// Add metrics middleware to all routes
app.use(metricsMiddleware);

// Add monitoring endpoints
addMonitoringRoutes(app);

// Example usage in your application routes:

// In user registration endpoint
app.post('/auth-register', async (req, res) => {
  // ... your existing logic ...
  
  // Track the registration
  trackUserRegistration();
  
  // ... continue with response ...
});

// In application approval endpoint
app.post('/api/admin-approval', async (req, res) => {
  // ... your existing logic ...
  
  // Track the application status change
  trackApplication(req.body.action === 'approve' ? 'approved' : 'rejected');
  
  // Track admin action
  trackAdminAction(req.user.admin_id, 'application_' + req.body.action);
  
  // ... continue with response ...
});

// In locker operations endpoint
app.post('/locker-operations', async (req, res) => {
  // ... your existing logic ...
  
  // Track locker operation
  trackLockerOperation(req.body.action_type);
  
  // ... continue with response ...
});

module.exports = app;
EOF

    print_status "Created monitoring integration example at $PROJECT_ROOT/server/monitoring-integration-example.js"
    print_warning "Please integrate the monitoring middleware into your actual server/index.js file"
}

# Function to start monitoring services
start_monitoring_services() {
    print_header "Starting monitoring services..."
    
    cd "$MONITORING_DIR"
    
    # Pull all required images
    print_status "Pulling Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Start services
    print_status "Starting monitoring stack..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to start
    print_status "Waiting for services to start..."
    sleep 30
    
    # Check service health
    check_service_health
}

# Function to check service health
check_service_health() {
    print_header "Checking service health..."
    
    local services=(
        "prometheus:9090/api/v1/status/config"
        "grafana:3000/api/health"
        "alertmanager:9093/api/v1/status"
        "node-exporter:9100/metrics"
    )
    
    for service in "${services[@]}"; do
        local name="${service%%:*}"
        local endpoint="${service#*:}"
        
        if curl -s -f "http://localhost:$endpoint" > /dev/null; then
            print_status "$name is healthy"
        else
            print_warning "$name may not be ready yet"
        fi
    done
}

# Function to display access information
display_access_info() {
    print_header "Monitoring Stack Access Information"
    
    echo -e "\n${GREEN}🚀 YesLocker Monitoring Stack is now running!${NC}\n"
    
    echo -e "${BLUE}Web Interfaces:${NC}"
    echo -e "  📊 Grafana Dashboard:    http://localhost:3000 (admin/yeslocker_admin_2024)"
    echo -e "  📈 Prometheus:           http://localhost:9090"
    echo -e "  🚨 Alertmanager:         http://localhost:9093"
    echo -e "  📊 Node Exporter:        http://localhost:9100/metrics"
    echo -e "  🐳 cAdvisor:             http://localhost:8081"
    echo -e "  ⏰ Uptime Kuma:          http://localhost:3001"
    echo -e "  🔍 Jaeger Tracing:       http://localhost:16686"
    echo -e "  🔧 Traefik Dashboard:    http://localhost:8080"
    
    echo -e "\n${BLUE}API Endpoints:${NC}"
    echo -e "  📊 Application Metrics:  http://localhost:3001/metrics"
    echo -e "  ❤️  Health Check:         http://localhost:3001/health"
    echo -e "  ✅ Readiness Probe:      http://localhost:3001/ready"
    echo -e "  💓 Liveness Probe:       http://localhost:3001/live"
    echo -e "  📈 Business Metrics:     http://localhost:3001/business-metrics"
    
    echo -e "\n${BLUE}Local Development:${NC}"
    echo -e "  Add these to your /etc/hosts for local development:"
    echo -e "  127.0.0.1 prometheus.yeslocker.local"
    echo -e "  127.0.0.1 grafana.yeslocker.local"
    echo -e "  127.0.0.1 alertmanager.yeslocker.local"
    echo -e "  127.0.0.1 jaeger.yeslocker.local"
    echo -e "  127.0.0.1 uptime.yeslocker.local"
    
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo -e "  1. Integrate monitoring middleware into your application (see monitoring-integration-example.js)"
    echo -e "  2. Configure alert notification channels in Alertmanager"
    echo -e "  3. Import dashboard templates in Grafana"
    echo -e "  4. Set up log shipping from your application to Loki"
    echo -e "  5. Configure SSL certificates for production deployment"
    
    echo -e "\n${GREEN}Monitoring stack setup completed successfully! 🎉${NC}\n"
}

# Function to stop monitoring services
stop_monitoring_services() {
    print_header "Stopping monitoring services..."
    
    cd "$MONITORING_DIR"
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    print_status "Monitoring services stopped"
}

# Function to restart monitoring services
restart_monitoring_services() {
    print_header "Restarting monitoring services..."
    
    stop_monitoring_services
    start_monitoring_services
}

# Function to show logs
show_logs() {
    local service="$1"
    
    cd "$MONITORING_DIR"
    
    if [ -n "$service" ]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f "$service"
    else
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs -f
    fi
}

# Function to show help
show_help() {
    echo -e "${BLUE}YesLocker Monitoring Stack Setup${NC}"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  start      Start the monitoring stack"
    echo "  stop       Stop the monitoring stack"
    echo "  restart    Restart the monitoring stack"
    echo "  status     Check status of monitoring services"
    echo "  logs       Show logs (optionally specify service name)"
    echo "  install    Full installation (setup + start)"
    echo "  help       Show this help message"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 install                    # Full setup and start"
    echo "  $0 start                      # Start services only"
    echo "  $0 logs prometheus            # Show Prometheus logs"
    echo "  $0 status                     # Check service status"
}

# Main script logic
main() {
    local command="${1:-install}"
    
    case "$command" in
        "install")
            print_header "Installing YesLocker Monitoring Stack"
            check_docker
            create_directories
            generate_configs
            integrate_monitoring
            start_monitoring_services
            display_access_info
            ;;
        "start")
            start_monitoring_services
            display_access_info
            ;;
        "stop")
            stop_monitoring_services
            ;;
        "restart")
            restart_monitoring_services
            display_access_info
            ;;
        "status")
            cd "$MONITORING_DIR"
            docker-compose -f "$DOCKER_COMPOSE_FILE" ps
            check_service_health
            ;;
        "logs")
            show_logs "$2"
            ;;
        "help"|"-h"|"--help")
            show_help
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