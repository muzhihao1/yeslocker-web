// Health Check and Monitoring Middleware for YesLocker
const express = require('express');
const client = require('prom-client');
const { createClient } = require('@supabase/supabase-js');
const os = require('os');

// Create Prometheus metrics registry
const register = new client.Registry();

// Define custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'endpoint', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'endpoint', 'status_code']
});

const activeConnections = new client.Gauge({
  name: 'active_connections_total',
  help: 'Number of active connections'
});

const databaseConnectionPool = new client.Gauge({
  name: 'database_connection_pool_size',
  help: 'Current database connection pool size'
});

const authAttemptsTotal = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['type', 'result']
});

const authFailuresTotal = new client.Counter({
  name: 'auth_failures_total',
  help: 'Total authentication failures',
  labelNames: ['type', 'reason']
});

const adminLoginFailuresTotal = new client.Counter({
  name: 'admin_login_failures_total',
  help: 'Total admin login failures',
  labelNames: ['admin_id', 'reason']
});

const userRegistrationsTotal = new client.Counter({
  name: 'user_registrations_total',
  help: 'Total user registrations'
});

const applicationsTotal = new client.Counter({
  name: 'applications_total',
  help: 'Total locker applications',
  labelNames: ['status']
});

const applicationApprovalsTotal = new client.Counter({
  name: 'application_approvals_total',
  help: 'Total application approvals'
});

const applicationRejectionsTotal = new client.Counter({
  name: 'application_rejections_total',
  help: 'Total application rejections'
});

const lockerOperationsTotal = new client.Counter({
  name: 'locker_operations_total',
  help: 'Total locker operations',
  labelNames: ['operation_type']
});

const occupiedLockersTotal = new client.Gauge({
  name: 'occupied_lockers_total',
  help: 'Number of occupied lockers'
});

const totalLockersAvailable = new client.Gauge({
  name: 'total_lockers_available',
  help: 'Total number of available lockers'
});

const activeUsers24h = new client.Gauge({
  name: 'active_users_24h',
  help: 'Number of active users in the last 24 hours'
});

const revenueTotal = new client.Counter({
  name: 'revenue_total',
  help: 'Total revenue in cents',
  labelNames: ['currency']
});

const rateLimitTriggeredTotal = new client.Counter({
  name: 'rate_limit_triggered_total',
  help: 'Total rate limit triggers',
  labelNames: ['endpoint', 'client_ip']
});

const failedLoginAttemptsTotal = new client.Counter({
  name: 'failed_login_attempts_total',
  help: 'Total failed login attempts',
  labelNames: ['source_ip', 'user_type']
});

const adminActionsTotal = new client.Counter({
  name: 'admin_actions_total',
  help: 'Total admin actions',
  labelNames: ['admin_id', 'action_type']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseConnectionPool);
register.registerMetric(authAttemptsTotal);
register.registerMetric(authFailuresTotal);
register.registerMetric(adminLoginFailuresTotal);
register.registerMetric(userRegistrationsTotal);
register.registerMetric(applicationsTotal);
register.registerMetric(applicationApprovalsTotal);
register.registerMetric(applicationRejectionsTotal);
register.registerMetric(lockerOperationsTotal);
register.registerMetric(occupiedLockersTotal);
register.registerMetric(totalLockersAvailable);
register.registerMetric(activeUsers24h);
register.registerMetric(revenueTotal);
register.registerMetric(rateLimitTriggeredTotal);
register.registerMetric(failedLoginAttemptsTotal);
register.registerMetric(adminActionsTotal);

// Add default Node.js metrics
client.collectDefaultMetrics({ register });

// Health check status
let healthStatus = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  checks: {}
};

// Connection tracking
let connectionCount = 0;

/**
 * Middleware to track request metrics
 */
function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  connectionCount++;
  activeConnections.set(connectionCount);

  // Track request start
  const endTimer = httpRequestDuration.startTimer({
    method: req.method,
    endpoint: req.route?.path || req.path
  });

  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = (Date.now() - startTime) / 1000;
    
    // Record metrics
    httpRequestsTotal.inc({
      method: req.method,
      endpoint: req.route?.path || req.path,
      status_code: res.statusCode
    });

    endTimer({
      status_code: res.statusCode
    });

    connectionCount--;
    activeConnections.set(connectionCount);

    // Call original end method
    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Authentication metrics tracking
 */
function trackAuthAttempt(type, result, reason = null) {
  authAttemptsTotal.inc({ type, result });
  
  if (result === 'failure') {
    authFailuresTotal.inc({ type, reason: reason || 'unknown' });
  }
}

/**
 * Admin login failure tracking  
 */
function trackAdminLoginFailure(adminId, reason) {
  adminLoginFailuresTotal.inc({ admin_id: adminId, reason });
}

/**
 * User registration tracking
 */
function trackUserRegistration() {
  userRegistrationsTotal.inc();
}

/**
 * Application tracking
 */
function trackApplication(status) {
  applicationsTotal.inc({ status });
  
  if (status === 'approved') {
    applicationApprovalsTotal.inc();
  } else if (status === 'rejected') {
    applicationRejectionsTotal.inc();
  }
}

/**
 * Locker operation tracking
 */
function trackLockerOperation(operationType) {
  lockerOperationsTotal.inc({ operation_type: operationType });
}

/**
 * Admin action tracking
 */
function trackAdminAction(adminId, actionType) {
  adminActionsTotal.inc({ admin_id: adminId, action_type: actionType });
}

/**
 * Rate limit tracking
 */
function trackRateLimit(endpoint, clientIp) {
  rateLimitTriggeredTotal.inc({ endpoint, client_ip: clientIp });
}

/**
 * Failed login attempt tracking
 */
function trackFailedLogin(sourceIp, userType) {
  failedLoginAttemptsTotal.inc({ source_ip: sourceIp, user_type: userType });
}

/**
 * Revenue tracking
 */
function trackRevenue(amount, currency = 'CNY') {
  revenueTotal.inc({ currency }, amount);
}

/**
 * Database health check
 */
async function checkDatabase() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);

    if (error) throw error;

    return {
      status: 'healthy',
      response_time: Date.now(),
      details: 'Database connection successful'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      response_time: Date.now(),
      error: error.message
    };
  }
}

/**
 * Memory health check
 */
function checkMemory() {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsagePercent = (usedMem / totalMem) * 100;

  return {
    status: memoryUsagePercent > 90 ? 'unhealthy' : 'healthy',
    heap_used: memUsage.heapUsed,
    heap_total: memUsage.heapTotal,
    external: memUsage.external,
    system_memory_usage_percent: memoryUsagePercent,
    details: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`
  };
}

/**
 * CPU health check
 */
function checkCPU() {
  const loadAvg = os.loadavg();
  const cpuCount = os.cpus().length;
  const loadPercent = (loadAvg[0] / cpuCount) * 100;

  return {
    status: loadPercent > 80 ? 'unhealthy' : 'healthy',
    load_average_1m: loadAvg[0],
    load_average_5m: loadAvg[1],  
    load_average_15m: loadAvg[2],
    cpu_count: cpuCount,
    load_percent: loadPercent,
    details: `CPU load: ${loadPercent.toFixed(2)}%`
  };
}

/**
 * Update business metrics periodically
 */
async function updateBusinessMetrics() {
  try {
    // Mock data for development - replace with real database queries
    const mockData = {
      occupiedLockers: Math.floor(Math.random() * 100) + 50,
      totalLockers: 200,
      activeUsers: Math.floor(Math.random() * 500) + 100
    };

    occupiedLockersTotal.set(mockData.occupiedLockers);
    totalLockersAvailable.set(mockData.totalLockers);
    activeUsers24h.set(mockData.activeUsers);

    // In production, implement real queries:
    /*
    const supabase = createClient(...);
    
    // Count occupied lockers
    const { count: occupiedCount } = await supabase
      .from('lockers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'occupied');
    
    // Count total lockers
    const { count: totalCount } = await supabase
      .from('lockers')
      .select('*', { count: 'exact', head: true });
    
    // Count active users (last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { count: activeCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_active_at', twentyFourHoursAgo.toISOString());

    occupiedLockersTotal.set(occupiedCount || 0);
    totalLockersAvailable.set(totalCount || 0);
    activeUsers24h.set(activeCount || 0);
    */

  } catch (error) {
    console.error('Error updating business metrics:', error);
  }
}

/**
 * Comprehensive health check
 */
async function performHealthCheck() {
  const startTime = Date.now();
  
  const checks = {
    database: await checkDatabase(),
    memory: checkMemory(),
    cpu: checkCPU()
  };

  const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
  
  healthStatus = {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    response_time: Date.now() - startTime,
    checks
  };

  return healthStatus;
}

/**
 * Express routes for monitoring endpoints
 */
function addMonitoringRoutes(app) {
  // Prometheus metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).end(error.message);
    }
  });

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // Readiness probe (for Kubernetes)
  app.get('/ready', (req, res) => {
    if (connectionCount < 100) { // Adjust threshold as needed
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', reason: 'too many connections' });
    }
  });

  // Liveness probe (for Kubernetes)
  app.get('/live', (req, res) => {
    res.status(200).json({ status: 'alive', uptime: process.uptime() });
  });

  // Business metrics endpoint
  app.get('/business-metrics', async (req, res) => {
    await updateBusinessMetrics();
    res.json({
      occupied_lockers: occupiedLockersTotal.get(),
      total_lockers: totalLockersAvailable.get(),
      active_users_24h: activeUsers24h.get(),
      timestamp: new Date().toISOString()
    });
  });
}

// Update business metrics every 5 minutes
setInterval(updateBusinessMetrics, 5 * 60 * 1000);

// Export functions and middleware
module.exports = {
  metricsMiddleware,
  addMonitoringRoutes,
  trackAuthAttempt,
  trackAdminLoginFailure,
  trackUserRegistration,
  trackApplication,
  trackLockerOperation,
  trackAdminAction,
  trackRateLimit,
  trackFailedLogin,
  trackRevenue,
  performHealthCheck,
  register
};