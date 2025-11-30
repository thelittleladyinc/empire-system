/**
 * Redis Configuration
 * Redis connection and queue management
 */

const redis = require('redis');
const Queue = require('bull');
const logger = require('../utils/logger');

let redisClient = null;
let jobQueue = null;

async function initializeRedis() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  // Create Redis client
  redisClient = redis.createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnection failed after 10 attempts');
          return new Error('Redis reconnection limit exceeded');
        }
        return retries * 100;
      }
    }
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connected');
  });

  await redisClient.connect();

  // Test connection
  await redisClient.ping();
  logger.info('Redis connection test successful');

  // Initialize Bull queue for job processing
  jobQueue = new Queue('empire-jobs', redisUrl, {
    redis: {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    }
  });

  jobQueue.on('error', (error) => {
    logger.error('Queue error:', error);
  });

  logger.info('Job queue initialized successfully');

  return { redisClient, jobQueue };
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

function getJobQueue() {
  if (!jobQueue) {
    throw new Error('Job queue not initialized. Call initializeRedis() first.');
  }
  return jobQueue;
}

module.exports = {
  initializeRedis,
  getRedisClient,
  getJobQueue
};
