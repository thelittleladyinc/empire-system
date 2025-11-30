/**
 * Empire System v1.5.0
 * Main Entry Point
 * 
 * This is the core orchestration layer (Section 5: The Spine) that coordinates
 * all Empire System operations.
 */

require('dotenv').config();
const express = require('express');
const { initializeDatabase } = require('./config/database');
const { initializeRedis } = require('./config/redis');
const { WorkflowOrchestrator } = require('./nodes/workflow-orchestrator');
const { SystemHealthMonitor } = require('./nodes/system-health-monitor');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'Empire System v1.5.0',
    section: 'Section 5: The Spine',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'connected',
    redis: 'connected',
    uptime: process.uptime()
  });
});

// Initialize system
async function startSystem() {
  try {
    logger.info('🚀 Starting Empire System v1.5.0...');
    
    // Initialize database connection
    logger.info('📊 Connecting to PostgreSQL database...');
    await initializeDatabase();
    logger.info('✅ Database connected successfully');
    
    // Initialize Redis connection
    logger.info('⚡ Connecting to Redis cache...');
    await initializeRedis();
    logger.info('✅ Redis connected successfully');
    
    // Initialize core nodes
    logger.info('🧠 Initializing core orchestration nodes...');
    const orchestrator = new WorkflowOrchestrator();
    await orchestrator.initialize();
    logger.info('✅ Workflow Orchestrator initialized');
    
    const healthMonitor = new SystemHealthMonitor();
    await healthMonitor.start();
    logger.info('✅ System Health Monitor started');
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🌐 Empire System server running on port ${PORT}`);
      logger.info('✨ System is ready to process workflows');
    });
    
  } catch (error) {
    logger.error('❌ Failed to start Empire System:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the system
startSystem();
