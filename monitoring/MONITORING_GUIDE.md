# YesLocker Comprehensive Monitoring Guide

## Overview

This guide provides comprehensive documentation for the YesLocker monitoring, alerting, and observability system. The monitoring stack includes:

- **Prometheus** - Metrics collection and storage
- **Grafana** - Visualization and dashboards  
- **Alertmanager** - Alert routing and notifications
- **Loki** - Log aggregation
- **Jaeger** - Distributed tracing
- **Various Exporters** - System, database, and application metrics

## Quick Start

### 1. Installation

```bash
# Clone the repository and navigate to monitoring directory
cd /path/to/yeslocker/monitoring

# Make setup script executable
chmod +x setup-monitoring.sh

# Install and start the complete monitoring stack
./setup-monitoring.sh install
```

### 2. Access Monitoring Interfaces

After installation, access the following interfaces:

- **Grafana Dashboard**: http://localhost:3000 (admin/yeslocker_admin_2024)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **Jaeger Tracing**: http://localhost:16686

### 3. Integrate with Your Application

Add monitoring middleware to your Express application:

```javascript
const { 
  metricsMiddleware, 
  addMonitoringRoutes,
  trackUserRegistration,
  trackApplication 
} = require('./monitoring/health-check-middleware');

const app = express();

// Add metrics middleware
app.use(metricsMiddleware);

// Add monitoring endpoints
addMonitoringRoutes(app);

// Track business events
app.post('/auth-register', (req, res) => {
  // Your registration logic
  trackUserRegistration();
  res.json({ success: true });
});
```

## Architecture

### Monitoring Stack Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Prometheus    │    │    Grafana      │
│  (Node.js API)  │───▶│   (Metrics)     │───▶│  (Dashboards)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      Loki       │    │  Alertmanager   │    │     Jaeger      │
│    (Logs)       │    │   (Alerts)      │    │   (Tracing)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **Application Metrics** → Prometheus via `/metrics` endpoint
2. **System Metrics** → Prometheus via Node Exporter
3. **Database Metrics** → Prometheus via Postgres Exporter
4. **Application Logs** → Loki via Promtail
5. **Traces** → Jaeger via OpenTelemetry
6. **Alerts** → Alertmanager → Slack/Email/PagerDuty

## Key Metrics

### Application Performance Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `http_requests_total` | Total HTTP requests | Counter |
| `http_request_duration_seconds` | Request duration histogram | Histogram |
| `active_connections_total` | Active connections | Gauge |
| `auth_attempts_total` | Authentication attempts | Counter |
| `auth_failures_total` | Authentication failures | Counter |

### Business Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `user_registrations_total` | Total user registrations | Counter |
| `applications_total` | Total locker applications | Counter |
| `locker_operations_total` | Total locker operations | Counter |
| `occupied_lockers_total` | Number of occupied lockers | Gauge |
| `revenue_total` | Total revenue | Counter |

### System Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `node_cpu_seconds_total` | CPU usage by core | Counter |
| `node_memory_MemAvailable_bytes` | Available memory | Gauge |
| `node_filesystem_free_bytes` | Free disk space | Gauge |
| `up` | Service availability | Gauge |

## Alert Configuration

### Alert Severity Levels

- **Critical**: Service down, high error rates (>5%), database connection failures
- **High**: High response times (>500ms), authentication failures, SSL expiring
- **Medium**: Resource usage (>80%), disk space low, business metrics anomalies
- **Low**: Performance degradation, low utilization rates

### Alert Routing

Alerts are routed to different teams based on labels:

```yaml
# Critical alerts go to all teams
- match:
    severity: critical
  receiver: 'critical-alerts'

# Security alerts go to security team
- match:
    team: security
  receiver: 'security-team'

# Backend alerts go to backend team
- match:
    team: backend
  receiver: 'backend-team'
```

### Notification Channels

1. **Slack** - Real-time notifications to team channels
2. **Email** - Detailed alert information to team lists
3. **PagerDuty** - Critical alerts with escalation policies
4. **Webhooks** - Custom integrations

## Dashboards

### YesLocker Overview Dashboard

Key panels include:

1. **Service Status** - Up/down status of all services
2. **Request Rate** - Requests per second by endpoint
3. **Response Time** - 95th percentile and median response times
4. **Error Rate** - 4xx and 5xx error percentages
5. **Business Metrics** - Daily registrations, applications, approvals
6. **System Resources** - CPU, memory, disk usage
7. **Database Metrics** - Connection count, query performance

### Creating Custom Dashboards

1. Access Grafana at http://localhost:3000
2. Click "+" → "Dashboard"
3. Add panels with Prometheus queries
4. Save and share with team

Example Prometheus queries:

```promql
# Request rate by endpoint
rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate percentage
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100

# Active users (last 24h)
active_users_24h

# Locker utilization percentage
occupied_lockers_total / total_lockers_available * 100
```

## Logging

### Log Aggregation with Loki

Logs are collected from:

- Application containers
- System logs (`/var/log`)
- Docker container logs

### Log Queries in Grafana

Access logs in Grafana using Loki data source:

```logql
# All application logs
{job="containerlogs", container_name="yeslocker-api"}

# Error logs only
{job="containerlogs"} |= "ERROR"

# Authentication failures
{job="containerlogs"} |= "auth" |= "failed"

# Rate of log entries
rate({job="containerlogs"}[5m])
```

### Structured Logging Best Practices

Use structured logging in your application:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// Good: Structured log entry
logger.info('User registration completed', {
  user_id: '123',
  phone: '13800000001',
  store_id: '1',
  response_time: 150
});

// Avoid: Unstructured log entry
logger.info('User 123 registered at store 1');
```

## Distributed Tracing

### Jaeger Integration

Jaeger provides distributed tracing to track requests across services:

1. **Trace Collection** - Automatic instrumentation via OpenTelemetry
2. **Service Map** - Visualize service dependencies
3. **Performance Analysis** - Identify bottlenecks across services
4. **Error Tracking** - Trace error propagation

### Instrumenting Your Code

```javascript
const opentelemetry = require('@opentelemetry/api');
const tracer = opentelemetry.trace.getTracer('yeslocker-api');

app.post('/api/admin-approval', async (req, res) => {
  const span = tracer.startSpan('admin_approval_process');
  
  try {
    span.setAttributes({
      'user.id': req.user.id,
      'application.id': req.body.application_id,
      'action': req.body.action
    });
    
    // Your business logic here
    const result = await processApproval(req.body);
    
    span.setStatus({ code: opentelemetry.SpanStatusCode.OK });
    res.json(result);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: opentelemetry.SpanStatusCode.ERROR });
    res.status(500).json({ error: 'Processing failed' });
  } finally {
    span.end();
  }
});
```

## Health Checks

### Built-in Health Endpoints

The monitoring middleware provides several health check endpoints:

- **`/health`** - Comprehensive health check (database, memory, CPU)
- **`/ready`** - Readiness probe for Kubernetes
- **`/live`** - Liveness probe for Kubernetes
- **`/metrics`** - Prometheus metrics endpoint

### Health Check Response Format

```json
{
  "status": "healthy",
  "timestamp": "2025-01-04T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "response_time": 25,
  "checks": {
    "database": {
      "status": "healthy",
      "response_time": 15,
      "details": "Database connection successful"
    },
    "memory": {
      "status": "healthy",
      "system_memory_usage_percent": 45.2,
      "details": "Memory usage: 45.20%"
    },
    "cpu": {
      "status": "healthy",
      "load_percent": 25.5,
      "details": "CPU load: 25.50%"
    }
  }
}
```

## Performance Optimization

### Monitoring Performance Impact

The monitoring system is designed to have minimal performance impact:

- **Metrics Collection**: <1ms overhead per request
- **Memory Usage**: ~50MB additional memory usage
- **CPU Impact**: <2% additional CPU usage
- **Network**: ~1KB metrics data per minute

### Optimization Recommendations

1. **Sampling**: Use sampling for high-volume traces
2. **Retention**: Configure appropriate retention periods
3. **Cardinality**: Avoid high-cardinality labels
4. **Aggregation**: Use recording rules for expensive queries

### Recording Rules

Create recording rules for frequently used queries:

```yaml
groups:
  - name: yeslocker_rules
    rules:
      - record: yeslocker:request_rate
        expr: rate(http_requests_total[5m])
        
      - record: yeslocker:error_rate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
        
      - record: yeslocker:response_time_p95
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

## Production Deployment

### Security Considerations

1. **Authentication**: Enable authentication for all monitoring services
2. **HTTPS**: Use TLS certificates for all external access
3. **Network Isolation**: Deploy monitoring services in secure network segments
4. **Access Control**: Implement role-based access control
5. **Secret Management**: Use secure secret storage (Vault, K8s secrets)

### Scalability Planning

For production deployment:

- **Prometheus**: Plan for ~1GB storage per 1M samples/day
- **Grafana**: Scale horizontally with external database
- **Alertmanager**: Configure high availability with clustering
- **Log Retention**: Balance retention period with storage costs

### Backup and Recovery

1. **Prometheus Data**: Regular snapshots of TSDB
2. **Grafana Dashboards**: Export as JSON and version control
3. **Alert Rules**: Store in version control
4. **Configuration**: Backup all configuration files

## Troubleshooting

### Common Issues

#### 1. High Memory Usage

```bash
# Check memory usage by service
docker stats

# Reduce retention period
# In prometheus.yml:
# --storage.tsdb.retention.time=15d
```

#### 2. Missing Metrics

```bash
# Check if application metrics endpoint is working
curl http://localhost:3001/metrics

# Check Prometheus targets
# Visit http://localhost:9090/targets
```

#### 3. Alerts Not Firing

```bash
# Check alert rules syntax
./setup-monitoring.sh logs prometheus

# Verify Alertmanager configuration
curl http://localhost:9093/api/v1/status
```

#### 4. Dashboard Data Not Loading

```bash
# Check Grafana data source connection
# Visit http://localhost:3000/datasources

# Verify Prometheus is reachable
curl http://localhost:9090/api/v1/query?query=up
```

### Monitoring Commands

```bash
# View all service logs
./setup-monitoring.sh logs

# Check service status
./setup-monitoring.sh status

# Restart specific service
docker-compose restart prometheus

# View metrics from command line
curl -s http://localhost:3001/metrics | grep http_requests_total
```

## Best Practices

### 1. Metric Naming

Follow Prometheus naming conventions:

```javascript
// Good
http_requests_total
http_request_duration_seconds
database_connections_active

// Avoid
httpRequestsTotal
request_time_ms
db_conn
```

### 2. Alert Design

- **Actionable**: Every alert should have a clear action
- **Proportional**: Alert severity should match business impact
- **Specific**: Include enough context for quick resolution
- **Documented**: Link to runbooks for resolution steps

### 3. Dashboard Organization

- **Overview**: High-level metrics on main dashboard
- **Service-Specific**: Detailed metrics per service
- **Business**: KPIs and business metrics
- **Infrastructure**: System and resource metrics

### 4. Log Management

- **Structured**: Use JSON formatting for logs
- **Contextual**: Include request IDs and user context
- **Leveled**: Use appropriate log levels
- **Retention**: Balance retention with storage costs

## Integration Examples

### Slack Notifications

Configure Slack webhooks in `alertmanager.yml`:

```yaml
slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
    channel: '#alerts'
    title: 'YesLocker Alert'
    text: |
      {{ range .Alerts }}
      *Alert:* {{ .Annotations.summary }}
      *Severity:* {{ .Labels.severity }}
      {{ end }}
```

### PagerDuty Integration

Add PagerDuty configuration:

```yaml
pagerduty_configs:
  - routing_key: 'your-pagerduty-integration-key'
    description: 'YesLocker Critical Alert'
    severity: '{{ .GroupLabels.severity }}'
```

### Custom Webhooks

Create custom webhook integrations:

```yaml
webhook_configs:
  - url: 'http://your-webhook-endpoint.com/alerts'
    http_config:
      basic_auth:
        username: 'webhook_user'
        password: 'webhook_password'
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review alert noise and tune thresholds
2. **Monthly**: Analyze performance trends and capacity planning
3. **Quarterly**: Update monitoring stack components
4. **Annually**: Review and update monitoring strategy

### Updates and Upgrades

```bash
# Update Docker images
docker-compose pull

# Restart with new images
./setup-monitoring.sh restart

# Backup before major upgrades
docker-compose exec prometheus \
  curl -XPOST http://localhost:9090/api/v1/admin/tsdb/snapshot
```

## Support and Resources

### Documentation Links

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Loki Documentation](https://grafana.com/docs/loki/)

### Community Resources

- [Prometheus Community](https://prometheus.io/community/)
- [Grafana Community](https://community.grafana.com/)
- [Monitoring Best Practices](https://sre.google/books/)

---

**This monitoring guide provides comprehensive coverage of the YesLocker monitoring system. For questions or issues, refer to the troubleshooting section or consult the community resources.**