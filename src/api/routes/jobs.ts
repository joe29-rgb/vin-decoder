/**
 * BACKGROUND JOBS API ROUTES
 * Job queue management and monitoring
 */

import { Router, Request, Response } from 'express';
import {
  addJob,
  getJob,
  getAllJobs,
  getJobsByType,
  getJobsByStatus,
  cancelJob,
  getQueueStats,
  clearCompletedJobs,
  initializeScheduledJobs
} from '../../modules/background-jobs';
import logger from '../../utils/logger';

const router = Router();

/**
 * POST /api/jobs/create
 * Create new background job
 */
router.post('/create', (req: Request, res: Response) => {
  try {
    const { type, data, maxRetries } = req.body;
    
    if (!type) {
      return res.status(400).json({ success: false, error: 'Job type required' });
    }
    
    const jobId = addJob(type, data || {}, maxRetries);
    res.json({ success: true, jobId });
  } catch (error: any) {
    logger.error('Create job failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/:id
 * Get job by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = getJob(id);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    
    res.json({ success: true, job });
  } catch (error: any) {
    logger.error('Get job failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs
 * Get all jobs or filter by type/status
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { type, status } = req.query;
    
    let jobs;
    if (type) {
      jobs = getJobsByType(type as any);
    } else if (status) {
      jobs = getJobsByStatus(status as any);
    } else {
      jobs = getAllJobs();
    }
    
    res.json({ success: true, total: jobs.length, jobs });
  } catch (error: any) {
    logger.error('Get jobs failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/jobs/:id
 * Cancel job
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = cancelJob(id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error: any) {
    logger.error('Cancel job failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/stats/queue
 * Get queue statistics
 */
router.get('/stats/queue', (req: Request, res: Response) => {
  try {
    const stats = getQueueStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    logger.error('Get queue stats failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/jobs/cleanup/completed
 * Clear completed jobs
 */
router.delete('/cleanup/completed', (req: Request, res: Response) => {
  try {
    const cleared = clearCompletedJobs();
    res.json({ success: true, cleared });
  } catch (error: any) {
    logger.error('Clear completed jobs failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/jobs/initialize-scheduled
 * Initialize scheduled jobs (auto-scrape, cache cleanup)
 */
router.post('/initialize-scheduled', (req: Request, res: Response) => {
  try {
    initializeScheduledJobs();
    res.json({ success: true, message: 'Scheduled jobs initialized' });
  } catch (error: any) {
    logger.error('Initialize scheduled jobs failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
