/**
 * Node 105: System Health Monitor
 * Section 5: The Spine
 * 
 * Continuously monitors system health, resource usage, and performance metrics.
 * Alerts when issues are detected and maintains system uptime.
 */

const cron = require('node-cron');
const { getPool } = require('../config/database');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

class SystemHealthMonitor {
  constructor() {
    this.healthCheckInterval = null;
    this.metrics = {
      uptime: 0,
      lastCheck: null,
      database: { status: 'unknown', responseTime: 0 },
      redis: { status: 'unknown', responseTime: 0 },
      memory: { used: 0, total: 0, percentage: 0 },
      activeWorkflows: 0,
      pendingJobs: 0
    };
  }

  async start() {
    logger.info('Starting System Health Monitor...');

    // Run health check every minute
    this.healthCheckInterval = cron.schedule('* * * * *', async () => {
      await this.performHealthCheck();
    });

    // Run initial health check
    await this.performHealthCheck();

    logger.info('System Health Monitor started successfully');
  }

  async performHealthCheck() {
    try {
      const startTime = Date.now();

      // Check database health
      await this.checkDatabase();

      // Check Redis health
      await this.checkRedis();

      // Check system resources
      this.checkSystemResources();

      // Check workflow metrics
      await this.checkWorkflowMetrics();

      this.metrics.lastCheck = new Date().toISOString();
      this.metrics.uptime = process.uptime();

      const duration = Date.now() - startTime;
      
      logger.info(`Health check completed in ${duration}ms`, {
        database: this.metrics.database.status,
        redis: this.metrics.redis.status,
        memory: `${this.metrics.memory.percentage.toFixed(1)}%`,
        activeWorkflows: this.metrics.activeWorkflows,
        pendingJobs: this.metrics.pendingJobs
      });

      // Alert if any issues detected
      if (this.metrics.database.status === 'unhealthy' || 
          this.metrics.redis.status === 'unhealthy') {
        await this.sendAlert('System health check failed');
      }

      if (this.metrics.memory.percentage > 90) {
        await this.sendAlert(`High memory usage: ${this.metrics.memory.percentage.toFixed(1)}%`);
      }

    } catch (error) {
      logger.error('Error performing health check:', error);
    }
  }

  async checkDatabase() {
    try {
      const db = getPool();
      const start = Date.now();
      
      await db.query('SELECT 1');
      
      const responseTime = Date.now() - start;
      
      this.metrics.database = {
        status: 'healthy',
        responseTime
      };

      if (responseTime > 1000) {
        logger.warn(`Database response time is high: ${responseTime}ms`);
      }

    } catch (error) {
      logger.error('Database health check failed:', error);
      this.metrics.database = {
        status: 'unhealthy',
        responseTime: 0,
        error: error.message
      };
    }
  }

  async checkRedis() {
    try {
      const redis = getRedisClient();
      const start = Date.now();
      
      await redis.ping();
      
      const responseTime = Date.now() - start;
      
      this.metrics.redis = {
        status: 'healthy',
        responseTime
      };

      if (responseTime > 500) {
        logger.warn(`Redis response time is high: ${responseTime}ms`);
      }

    } catch (error) {
      logger.error('Redis health check failed:', error);
      this.metrics.redis = {
        status: 'unhealthy',
        responseTime: 0,
        error: error.message
      };
    }
  }

  checkSystemResources() {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const percentage = (usedMem / totalMem) * 100;

    this.metrics.memory = {
      used: Math.round(usedMem / 1024 / 1024), // MB
      total: Math.round(totalMem / 1024 / 1024), // MB
      percentage: percentage
    };
  }

  async checkWorkflowMetrics() {
    try {
      const db = getPool();

      // Count active workflows
      const activeResult = await db.query(
        "SELECT COUNT(*) FROM workflows WHERE status IN ('pending', 'queued', 'running')"
      );
      this.metrics.activeWorkflows = parseInt(activeResult.rows[0].count);

      // Count pending jobs
      const pendingResult = await db.query(
        "SELECT COUNT(*) FROM jobs WHERE status = 'pending'"
      );
      this.metrics.pendingJobs = parseInt(pendingResult.rows[0].count);

    } catch (error) {
      logger.error('Error checking workflow metrics:', error);
    }
  }

  async sendAlert(message) {
    logger.error(`🚨 ALERT: ${message}`);
    
    // In the full system, this would send notifications via:
    // - Email
    // - SMS
    // - Slack/Discord
    // - PagerDuty
    
    try {
      const db = getPool();
      await db.query(
        'INSERT INTO system_logs (level, message, metadata) VALUES ($1, $2, $3)',
        ['alert', message, JSON.stringify(this.metrics)]
      );
    } catch (error) {
      logger.error('Error logging alert:', error);
    }
  }

  getMetrics() {
    return this.metrics;
  }

  stop() {
    if (this.healthCheckInterval) {
      this.healthCheckInterval.stop();
      logger.info('System Health Monitor stopped');
    }
  }
}

module.exports = { SystemHealthMonitor };
