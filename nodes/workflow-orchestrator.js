/**
 * Node 101: Workflow Orchestrator
 * Section 5: The Spine
 * 
 * The central conductor that coordinates all Empire System workflows.
 * This node manages the execution sequence of all other nodes across all sections.
 */

const { getPool } = require('../config/database');
const { getJobQueue } = require('../config/redis');
const logger = require('../utils/logger');

class WorkflowOrchestrator {
  constructor() {
    this.activeWorkflows = new Map();
    this.jobQueue = null;
    this.db = null;
  }

  async initialize() {
    this.db = getPool();
    this.jobQueue = getJobQueue();
    
    // Set up job processor
    this.jobQueue.process(async (job) => {
      return await this.processJob(job);
    });

    logger.info('Workflow Orchestrator initialized');
  }

  /**
   * Create a new workflow for a property listing
   */
  async createWorkflow(propertyId, workflowType = 'full_listing') {
    try {
      const result = await this.db.query(
        `INSERT INTO workflows (name, status, property_id, metadata) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [workflowType, 'pending', propertyId, JSON.stringify({ type: workflowType })]
      );

      const workflowId = result.rows[0].id;
      
      logger.info(`Created workflow ${workflowId} for property ${propertyId}`);

      // Queue the workflow for execution
      await this.queueWorkflow(workflowId);

      return workflowId;
    } catch (error) {
      logger.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Queue a workflow for execution
   */
  async queueWorkflow(workflowId) {
    try {
      // Get workflow details
      const result = await this.db.query(
        'SELECT * FROM workflows WHERE id = $1',
        [workflowId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      const workflow = result.rows[0];

      // Define the execution sequence based on workflow type
      const executionPlan = this.getExecutionPlan(workflow.name);

      // Queue each node in sequence
      for (let i = 0; i < executionPlan.length; i++) {
        const nodeName = executionPlan[i];
        
        await this.db.query(
          `INSERT INTO jobs (workflow_id, node_name, status, priority) 
           VALUES ($1, $2, $3, $4)`,
          [workflowId, nodeName, 'pending', i + 1]
        );
      }

      // Update workflow status
      await this.db.query(
        'UPDATE workflows SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['queued', workflowId]
      );

      logger.info(`Queued ${executionPlan.length} jobs for workflow ${workflowId}`);

      // Start processing the first job
      await this.processNextJob(workflowId);

    } catch (error) {
      logger.error('Error queueing workflow:', error);
      throw error;
    }
  }

  /**
   * Get the execution plan for a workflow type
   */
  getExecutionPlan(workflowType) {
    // This is a simplified execution plan
    // In the full system, this would orchestrate all 295 nodes
    const plans = {
      'full_listing': [
        // Section 1: The Brain (Data Collection)
        'mls_data_ingester',
        'property_photos_collector',
        'competitive_analysis_engine',
        
        // Section 2: The Factory (Content Generation)
        'master_content_generator',
        'facebook_post_generator',
        'instagram_caption_generator',
        
        // Section 3: The Megaphone (Publishing)
        'facebook_publisher',
        'instagram_publisher',
        
        // Section 4: The Eyes (Analytics)
        'engagement_tracker',
        
        // Section 6: The Closer (Lead Management)
        'lead_capture_monitor'
      ],
      'test': [
        'test_node'
      ]
    };

    return plans[workflowType] || plans['test'];
  }

  /**
   * Process the next pending job for a workflow
   */
  async processNextJob(workflowId) {
    try {
      // Get the next pending job
      const result = await this.db.query(
        `SELECT * FROM jobs 
         WHERE workflow_id = $1 AND status = 'pending' 
         ORDER BY priority ASC 
         LIMIT 1`,
        [workflowId]
      );

      if (result.rows.length === 0) {
        // No more pending jobs, mark workflow as complete
        await this.completeWorkflow(workflowId);
        return;
      }

      const job = result.rows[0];

      // Add job to Bull queue for processing
      await this.jobQueue.add({
        jobId: job.id,
        workflowId: workflowId,
        nodeName: job.node_name
      });

      logger.info(`Queued job ${job.id} (${job.node_name}) for processing`);

    } catch (error) {
      logger.error('Error processing next job:', error);
      throw error;
    }
  }

  /**
   * Process a job from the queue
   */
  async processJob(bullJob) {
    const { jobId, workflowId, nodeName } = bullJob.data;

    try {
      logger.info(`Processing job ${jobId}: ${nodeName}`);

      // Update job status to 'running'
      await this.db.query(
        `UPDATE jobs 
         SET status = 'running', started_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [jobId]
      );

      // Execute the node
      // In the full system, this would dynamically load and execute the appropriate node
      const result = await this.executeNode(nodeName, workflowId);

      // Update job status to 'completed'
      await this.db.query(
        `UPDATE jobs 
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP, result = $1 
         WHERE id = $2`,
        [JSON.stringify(result), jobId]
      );

      logger.info(`Completed job ${jobId}: ${nodeName}`);

      // Process next job in workflow
      await this.processNextJob(workflowId);

      return result;

    } catch (error) {
      logger.error(`Error processing job ${jobId}:`, error);

      // Update job status to 'failed'
      await this.db.query(
        `UPDATE jobs 
         SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error = $1 
         WHERE id = $2`,
        [error.message, jobId]
      );

      // Mark workflow as failed
      await this.db.query(
        `UPDATE workflows 
         SET status = 'failed', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [workflowId]
      );

      throw error;
    }
  }

  /**
   * Execute a specific node
   */
  async executeNode(nodeName, workflowId) {
    // Placeholder for node execution
    // In the full system, this would dynamically load and execute the node
    logger.info(`Executing node: ${nodeName} for workflow ${workflowId}`);
    
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      nodeName,
      status: 'success',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Mark a workflow as complete
   */
  async completeWorkflow(workflowId) {
    try {
      await this.db.query(
        `UPDATE workflows 
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [workflowId]
      );

      logger.info(`Workflow ${workflowId} completed successfully`);
      
      this.activeWorkflows.delete(workflowId);

    } catch (error) {
      logger.error('Error completing workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId) {
    try {
      const workflowResult = await this.db.query(
        'SELECT * FROM workflows WHERE id = $1',
        [workflowId]
      );

      if (workflowResult.rows.length === 0) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      const jobsResult = await this.db.query(
        'SELECT * FROM jobs WHERE workflow_id = $1 ORDER BY priority ASC',
        [workflowId]
      );

      return {
        workflow: workflowResult.rows[0],
        jobs: jobsResult.rows
      };

    } catch (error) {
      logger.error('Error getting workflow status:', error);
      throw error;
    }
  }
}

module.exports = { WorkflowOrchestrator };
