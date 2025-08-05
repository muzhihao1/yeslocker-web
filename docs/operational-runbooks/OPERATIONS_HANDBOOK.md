# YesLocker Operations Handbook

## Overview

This Operations Handbook provides comprehensive guidance for managing, maintaining, and operating the YesLocker billiard cue locker management system. It includes detailed procedures for system administration, deployment, monitoring, troubleshooting, and emergency response.

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Daily Operations](#daily-operations)
3. [Deployment Procedures](#deployment-procedures)
4. [Database Operations](#database-operations)
5. [Monitoring and Alerting](#monitoring-and-alerting)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Security Operations](#security-operations)
8. [Performance Management](#performance-management)
9. [User Management](#user-management)
10. [Maintenance Schedules](#maintenance-schedules)
11. [Emergency Procedures](#emergency-procedures)
12. [Documentation Standards](#documentation-standards)

## System Architecture Overview

### Component Stack
```
┌─────────────────────────────────────────────────────────────┐
│                    YesLocker System                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend Layer                                             │
│  ├─ User App (uni-app + Vue 3)                            │
│  └─ Admin Panel (uni-app + Vue 3)                         │
├─────────────────────────────────────────────────────────────┤
│  API Layer                                                  │
│  ├─ Express.js Server (Development)                       │
│  ├─ Supabase Edge Functions (Production)                  │
│  └─ Authentication & Authorization                        │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├─ PostgreSQL Database (Supabase)                       │
│  ├─ Redis Cache (Optional)                               │
│  └─ File Storage (Supabase Storage)                      │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                       │
│  ├─ Vercel (Hosting)                                     │
│  ├─ Supabase (Backend Services)                          │
│  └─ Monitoring Stack (Prometheus/Grafana)                │
└─────────────────────────────────────────────────────────────┘
```

### Key Services and Ports

| Service | Environment | Port/URL | Health Check |
|---------|-------------|----------|--------------|
| User App | Development | 3000 | `http://localhost:3000/` |
| Admin Panel | Development | 3001 | `http://localhost:3001/` |
| API Server | Development | 3001 | `http://localhost:3001/health` |
| Supabase | Production | 443 | `https://hsfthqchyupkbmazcuis.supabase.co/rest/v1/` |
| Prometheus | Monitoring | 9090 | `http://localhost:9090/-/healthy` |
| Grafana | Monitoring | 3000 | `http://localhost:3000/api/health` |

## Daily Operations

### Morning Checklist (9:00 AM)

#### System Health Verification
```bash
# Check all critical services
./scripts/health-check.sh --comprehensive

# Verify database connectivity
./scripts/check-database.sh

# Check monitoring systems
curl -f http://localhost:9090/-/healthy
curl -f http://localhost:3000/api/health
```

#### Performance Review
1. **Review Overnight Metrics**
   - Check Grafana dashboards for performance anomalies
   - Review error rates and response times
   - Verify backup completion status

2. **Database Performance**
   ```sql
   -- Check slow queries from last 24 hours
   SELECT query, mean_time, calls, total_time 
   FROM pg_stat_statements 
   WHERE mean_time > 1000 
   ORDER BY mean_time DESC 
   LIMIT 10;
   
   -- Check database size and growth
   SELECT schemaname, tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
   FROM pg_tables 
   WHERE schemaname = 'public' 
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

3. **User Experience Metrics**
   - Review user registration/login success rates
   - Check application approval times
   - Monitor locker utilization rates

#### Alert Review
```bash
# Check for any active alerts
curl -s http://localhost:9093/api/v1/alerts | jq '.data[] | select(.state=="firing")'

# Review alert history from last 24 hours
./scripts/alert-summary.sh --hours 24
```

### Evening Checklist (6:00 PM)

#### Backup Verification
```bash
# Verify today's backups completed successfully
./backup/verify-backups.sh

# Check backup storage utilization
aws s3 ls s3://yeslocker-backups-primary --recursive --human-readable --summarize
```

#### Performance Summary
```bash
# Generate daily performance report
./scripts/daily-performance-report.sh

# Check for any performance degradation
./scripts/performance-trend-analysis.sh --days 7
```

#### Security Review
```bash
# Review security events from today
./scripts/security-event-summary.sh --today

# Check for any suspicious activities  
./scripts/check-suspicious-activities.sh --hours 24
```

## Deployment Procedures

### Pre-Deployment Checklist

#### Development Environment Testing
```bash
# 1. Run all tests
npm test
npm run test:integration
npm run test:e2e

# 2. Type checking
npm run type-check

# 3. Linting
npm run lint

# 4. Build verification
npm run build
npm run build:admin

# 5. Security scan
npm audit
```

#### Database Migration Verification
```bash
# 1. Test migrations on staging
supabase db push --linked --dry-run

# 2. Backup current database
./backup/backup-automation.sh database-backup --type full --verify

# 3. Apply migrations
supabase db push --linked

# 4. Verify data integrity
./scripts/verify-data-integrity.sh
```

### Deployment Process

#### Frontend Deployment (Vercel)
```bash
# 1. Deploy user application
vercel deploy --prod

# 2. Deploy admin panel
vercel deploy --prod --name yeslocker-admin

# 3. Verify deployment
curl -f https://yeslocker.vercel.app/health
curl -f https://yeslocker-admin.vercel.app/health
```

#### Backend Deployment (Supabase Edge Functions)
```bash
# 1. Deploy all Edge Functions
npm run functions:deploy

# 2. Test critical endpoints
./scripts/test-edge-functions.sh

# 3. Update environment variables if needed
supabase secrets set --env-file .env.production
```

### Post-Deployment Verification

#### Smoke Testing
```bash
# Run comprehensive smoke tests
./scripts/smoke-tests.sh --environment production

# Test critical user flows
./scripts/test-user-flows.sh --production
```

#### Performance Validation
```bash
# Monitor performance for 30 minutes post-deployment
./scripts/monitor-deployment.sh --duration 30

# Check for any performance degradation
./scripts/compare-performance.sh --before-deployment
```

#### Rollback Procedures
```bash
# If issues detected, execute rollback
./scripts/rollback-deployment.sh --version previous

# Verify rollback successful
./scripts/verify-rollback.sh
```

## Database Operations

### Daily Database Maintenance

#### Performance Optimization
```sql
-- Update table statistics
ANALYZE;

-- Reindex if needed (schedule during low usage)
REINDEX DATABASE yeslocker;

-- Check for bloated tables
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
       n_dead_tup, n_live_tup,
       CASE WHEN n_live_tup > 0 
            THEN round(n_dead_tup::float / n_live_tup::float * 100, 2) 
            ELSE 0 
       END as dead_tuple_percent
FROM pg_stat_user_tables 
WHERE n_dead_tup > 1000
ORDER BY dead_tuple_percent DESC;
```

#### Connection Management
```sql
-- Monitor active connections
SELECT state, count(*) 
FROM pg_stat_activity 
WHERE state IS NOT NULL 
GROUP BY state;

-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Kill problematic queries if necessary
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '1 hour'
AND state = 'active';
```

### Weekly Database Maintenance

#### Index Optimization
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0 
AND idx_tup_fetch = 0
ORDER BY schemaname, tablename;

-- Find missing indexes
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / seq_scan as avg_tup_per_scan
FROM pg_stat_user_tables 
WHERE seq_scan > 0 
AND seq_tup_read / seq_scan > 10000
ORDER BY seq_tup_read DESC;
```

#### Data Cleanup
```sql
-- Clean up old audit logs (older than 90 days)
DELETE FROM audit_logs 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Clean up expired OTP codes
DELETE FROM otp_codes 
WHERE expires_at < NOW() - INTERVAL '24 hours';

-- Archive old locker records (older than 1 year)
INSERT INTO locker_records_archive 
SELECT * FROM locker_records 
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM locker_records 
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Database Backup Verification
```bash
# Verify backup integrity
./backup/backup-automation.sh test-restore --type database

# Check backup storage usage
./scripts/check-backup-storage.sh

# Test point-in-time recovery
./backup/disaster-recovery.sh test-weekly --automated
```

## Monitoring and Alerting

### Key Metrics to Monitor

#### Application Performance Metrics
- **Response Time**: 95th percentile < 500ms
- **Error Rate**: < 1% for all endpoints
- **Throughput**: Monitor requests per second
- **Availability**: > 99.9% uptime

#### Business Metrics
- **User Registrations**: Daily and weekly trends
- **Application Approval Rate**: > 90%
- **Locker Utilization**: Target 70-80%
- **Revenue Tracking**: Daily revenue trends

#### Infrastructure Metrics
- **CPU Usage**: < 80% average
- **Memory Usage**: < 85% average
- **Disk Usage**: < 80% on all volumes
- **Database Connections**: < 80% of max connections

### Alert Response Procedures

#### Critical Alerts (P0)
**Response Time**: 15 minutes
**Escalation**: Immediate to on-call engineer + engineering lead

1. **Service Down Alert**
   ```bash
   # Immediate actions
   ./scripts/service-health-check.sh --detailed
   ./monitoring/check-infrastructure.sh
   
   # If confirmed outage
   ./incident-response/create-incident.sh --level P0 --description "Service outage"
   ./incident-response/notify-stakeholders.sh --level critical
   ```

2. **Database Connection Failure**
   ```bash
   # Check database status
   ./scripts/check-database-connectivity.sh
   
   # If database is down
   ./backup/disaster-recovery.sh assess-database-damage
   ./backup/disaster-recovery.sh restore-database --backup-type latest-full
   ```

#### High Priority Alerts (P1)
**Response Time**: 30 minutes
**Escalation**: To engineering lead after 1 hour

1. **High Error Rate**
   ```bash
   # Investigate error patterns
   ./scripts/analyze-error-patterns.sh --last-hour
   
   # Check recent deployments
   ./scripts/check-recent-deployments.sh
   
   # If deployment related, consider rollback
   ./scripts/rollback-deployment.sh --to-previous
   ```

2. **Performance Degradation**
   ```bash
   # Check resource utilization
   ./scripts/check-resource-usage.sh
   
   # Analyze slow queries
   ./scripts/analyze-slow-queries.sh --last-hour
   
   # Scale resources if needed
   ./scripts/scale-resources.sh --auto
   ```

### Dashboard Maintenance

#### Daily Dashboard Review
1. **System Overview Dashboard**
   - Service status indicators
   - Request rate and response time trends
   - Error rate monitoring
   - Resource utilization

2. **Business Metrics Dashboard**
   - User activity metrics
   - Application processing times
   - Revenue and usage trends
   - Locker utilization rates

3. **Security Dashboard**
   - Authentication failure rates
   - Suspicious activity indicators
   - Security event summaries
   - Rate limiting triggers

## Troubleshooting Guide

### Common Issues and Solutions

#### Application Won't Start
**Symptoms**: Service health checks failing, no response on expected ports

**Troubleshooting Steps**:
```bash
# 1. Check process status
ps aux | grep node
systemctl status yeslocker-api

# 2. Check logs
tail -f /var/log/yeslocker/application.log
journalctl -u yeslocker-api -f

# 3. Check configuration
./scripts/validate-config.sh

# 4. Check dependencies
npm install
docker-compose ps

# 5. Restart services
systemctl restart yeslocker-api
docker-compose restart
```

#### Database Connection Issues
**Symptoms**: Connection timeouts, authentication failures

**Troubleshooting Steps**:
```bash
# 1. Test connectivity
telnet $DB_HOST $DB_PORT
curl -I $SUPABASE_URL

# 2. Check credentials
./scripts/test-db-credentials.sh

# 3. Check connection pool
./scripts/check-connection-pool.sh

# 4. Review database logs
tail -f /var/log/postgresql/postgresql.log
```

#### High Memory Usage
**Symptoms**: OOM errors, slow response times

**Troubleshooting Steps**:
```bash
# 1. Check memory usage
free -h
ps aux --sort=-%mem | head -20

# 2. Check for memory leaks
./scripts/check-memory-leaks.sh

# 3. Analyze heap dumps
node --inspect app.js
# Use Chrome DevTools for heap analysis

# 4. Restart services if necessary
systemctl restart yeslocker-api
```

#### Slow Database Queries
**Symptoms**: High response times, database alerts

**Troubleshooting Steps**:
```sql
-- Check active queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check missing indexes
SELECT * FROM pg_stat_user_tables 
WHERE seq_scan > idx_scan 
AND seq_tup_read > 10000;
```

### Performance Troubleshooting

#### High CPU Usage
```bash
# 1. Identify CPU-intensive processes
top -c
htop

# 2. Check Node.js performance
node --prof app.js
node --prof-process isolate-*.log > processed.txt

# 3. Profile application
npm install -g clinic
clinic doctor -- node app.js
```

#### Memory Leaks
```bash
# 1. Monitor memory usage over time
./scripts/monitor-memory.sh --duration 60

# 2. Generate heap snapshots
node --inspect app.js
# Use Chrome DevTools Memory tab

# 3. Use memory profiling tools
npm install -g clinic
clinic heapdump -- node app.js
```

#### Network Issues
```bash
# 1. Check network connectivity
ping google.com
curl -I https://api.github.com

# 2. Check DNS resolution
nslookup $DOMAIN_NAME
dig $DOMAIN_NAME

# 3. Check port connectivity
telnet $HOST $PORT
netstat -tlnp | grep $PORT
```

## Security Operations

### Daily Security Checks

#### Authentication Monitoring
```bash
# Check failed login attempts
./scripts/check-failed-logins.sh --last-24h

# Review suspicious IP addresses
./scripts/analyze-suspicious-ips.sh

# Check for brute force attempts
./scripts/detect-brute-force.sh --threshold 10
```

#### Access Control Review
```bash
# Review admin access logs
./scripts/review-admin-access.sh --today

# Check for privilege escalation attempts
./scripts/check-privilege-escalation.sh

# Verify SSL certificate status
./scripts/check-ssl-certificates.sh
```

### Weekly Security Maintenance

#### Security Updates
```bash
# Check for security updates
npm audit
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}"

# Update dependencies
npm audit fix
docker-compose pull && docker-compose up -d
```

#### Access Review
```bash
# Review user accounts and permissions
./scripts/user-access-review.sh

# Check for inactive admin accounts
./scripts/check-inactive-admins.sh --days 30

# Review API key usage
./scripts/api-key-usage-review.sh
```

### Incident Response

#### Security Incident Procedure
1. **Immediate Response** (0-15 minutes)
   ```bash
   # Isolate affected systems
   ./backup/disaster-recovery.sh isolate-systems --affected-servers
   
   # Change critical credentials
   ./backup/disaster-recovery.sh rotate-credentials --emergency
   
   # Enable enhanced monitoring
   ./scripts/enable-security-monitoring.sh --level high
   ```

2. **Investigation** (15-60 minutes)
   ```bash
   # Collect evidence
   ./scripts/collect-security-evidence.sh
   
   # Analyze logs
   ./scripts/analyze-security-logs.sh --incident-time "$INCIDENT_TIME"
   
   # Assess damage
   ./scripts/assess-security-damage.sh
   ```

3. **Recovery** (1-4 hours)
   ```bash
   # Restore from clean backup if needed
   ./backup/disaster-recovery.sh restore-from-clean-backup --pre-incident
   
   # Apply security patches
   ./scripts/apply-security-patches.sh --all
   
   # Verify system integrity
   ./scripts/verify-system-integrity.sh
   ```

## Performance Management

### Performance Monitoring

#### Key Performance Indicators
- **Response Time**: Monitor 50th, 95th, and 99th percentiles
- **Throughput**: Requests per second capacity
- **Error Rate**: Application and infrastructure error rates
- **Resource Utilization**: CPU, memory, disk, network usage

#### Performance Testing
```bash
# Weekly performance testing
./tests/load-testing/authenticated-stress-test.js

# Monthly comprehensive testing
./tests/load-testing/stress-test-suite.js

# Performance regression testing after deployments
./scripts/performance-regression-test.sh --baseline production
```

### Optimization Procedures

#### Database Optimization
```sql
-- Weekly index maintenance
REINDEX DATABASE yeslocker;
ANALYZE;

-- Query optimization
EXPLAIN ANALYZE SELECT * FROM users WHERE phone = '13800000001';

-- Connection pool optimization
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
SELECT pg_reload_conf();
```

#### Application Optimization
```bash
# Profile application performance
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Optimize bundle size
npm run analyze
npm run build:optimize

# Enable compression
# Update nginx.conf with gzip settings
```

#### Caching Strategy
```bash
# Implement Redis caching
docker run -d --name redis -p 6379:6379 redis:alpine

# Configure application caching
./scripts/configure-caching.sh --redis-url redis://localhost:6379

# Monitor cache hit rates
./scripts/monitor-cache-performance.sh
```

## User Management

### Account Management

#### User Registration Process
1. **Phone Number Verification**
   - SMS OTP sent via Tencent Cloud SMS
   - OTP valid for 10 minutes
   - Maximum 3 attempts per phone number per hour

2. **Account Creation**
   - User profile creation with basic information
   - Store assignment based on user selection
   - Initial status: 'active'

3. **Account Verification**
   ```bash
   # Verify user registration process
   ./scripts/test-user-registration.sh --phone "13800000001"
   
   # Check for duplicate accounts
   ./scripts/check-duplicate-users.sh
   ```

#### Admin Account Management
```bash
# Create new admin account
./scripts/create-admin.sh --phone "13800000001" --name "管理员" --role "store_admin" --store-id "1"

# Disable admin account
./scripts/disable-admin.sh --admin-id "admin_123"

# Reset admin password
./scripts/reset-admin-password.sh --admin-id "admin_123"
```

### Support Procedures

#### Common User Issues

1. **Login Problems**
   ```bash
   # Check user account status
   ./scripts/check-user-status.sh --phone "13800000001"
   
   # Reset user password
   ./scripts/reset-user-password.sh --phone "13800000001"
   
   # Check for account lockout
   ./scripts/check-account-lockout.sh --phone "13800000001"
   ```

2. **Application Issues**
   ```bash
   # Check application status
   ./scripts/check-application-status.sh --application-id "app_123"
   
   # Manually approve application
   ./scripts/manual-approve-application.sh --application-id "app_123" --admin-id "admin_1"
   
   # Check locker availability
   ./scripts/check-locker-availability.sh --store-id "1"
   ```

3. **Locker Access Issues**
   ```bash
   # Check locker assignment
   ./scripts/check-locker-assignment.sh --user-id "user_123"
   
   # Reset locker access
   ./scripts/reset-locker-access.sh --locker-id "locker_001"
   
   # Generate new QR code
   ./scripts/generate-qr-code.sh --locker-id "locker_001"
   ```

## Maintenance Schedules

### Daily Maintenance (Automated)
- **02:00**: Full database backup
- **03:00**: Application data backup
- **01:00**: System configuration backup
- **04:00**: Log rotation and cleanup
- **05:00**: Performance metrics collection

### Weekly Maintenance (Manual)
- **Sunday 05:00**: Automated disaster recovery test
- **Sunday 06:00**: Security scan and vulnerability assessment
- **Sunday 07:00**: Performance optimization review
- **Sunday 08:00**: Database maintenance (ANALYZE, VACUUM)

### Monthly Maintenance (Scheduled)
- **First Saturday 06:00**: Comprehensive disaster recovery drill
- **First Sunday**: Security patches and updates
- **Second Sunday**: Performance testing and optimization
- **Third Sunday**: User access review and cleanup
- **Fourth Sunday**: Documentation and runbook updates

### Quarterly Maintenance (Planned)
- **Q1**: Infrastructure capacity planning
- **Q2**: Security audit and penetration testing
- **Q3**: Disaster recovery plan review and update
- **Q4**: Performance baseline review and optimization

## Emergency Procedures

### Emergency Contact List
```
Incident Commander: +86-138-0000-0001
Database Admin: +86-138-0000-0002
Security Officer: +86-138-0000-0003
Network Admin: +86-138-0000-0004
Business Continuity: +86-138-0000-0005

Escalation Chain:
Level 1: On-call → Lead (30 min)
Level 2: Lead → Manager (1 hour)  
Level 3: Manager → Director (2 hours)
```

### Emergency Response Procedures

#### System Outage Response
1. **Immediate Actions** (0-15 minutes)
   ```bash
   # Create incident
   ./backup/disaster-recovery.sh activate-incident P0 "System outage detected"
   
   # Enable maintenance mode
   ./backup/disaster-recovery.sh enable-maintenance-mode
   
   # Assess damage
   ./backup/disaster-recovery.sh health-check --comprehensive
   ```

2. **Recovery Actions** (15-60 minutes)
   ```bash
   # Restore services
   ./backup/disaster-recovery.sh start-applications
   
   # Verify functionality
   ./backup/disaster-recovery.sh run-smoke-tests --service all
   
   # Monitor performance
   ./scripts/monitor-recovery.sh --duration 30
   ```

#### Data Corruption Response
```bash
# Stop all write operations
./backup/disaster-recovery.sh stop-applications

# Assess corruption extent
./backup/disaster-recovery.sh assess-database-damage

# Restore from backup
./backup/disaster-recovery.sh restore-database --backup-type latest-full

# Verify data integrity
./backup/disaster-recovery.sh verify-database-integrity
```

## Documentation Standards

### Runbook Documentation Requirements
1. **Purpose**: Clear statement of what the procedure accomplishes
2. **Prerequisites**: Required tools, access, and conditions
3. **Step-by-step Instructions**: Detailed, executable commands
4. **Verification**: How to confirm successful completion
5. **Rollback**: How to undo changes if needed
6. **Emergency Contacts**: Who to call if issues arise

### Change Documentation
- All changes must be documented in change log
- Include impact assessment and rollback procedures
- Require approval for production changes
- Maintain version history of all procedures

### Knowledge Base Maintenance
- Update procedures after each execution
- Capture lessons learned from incidents
- Regular review and validation of procedures
- Training materials for new team members

---

**Document Control:**
- **Version**: 1.0
- **Last Updated**: 2025-01-04
- **Next Review**: 2025-04-04
- **Owner**: Operations Team
- **Approver**: Engineering Manager

**This operations handbook is a living document that must be regularly updated based on operational experience and system changes.**