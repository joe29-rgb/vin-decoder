/**
 * BACKGROUND JOB QUEUE MODULE
 * Async processing for scraping, scoring, and other long-running tasks
 */

import cron from 'node-cron';

export type JobType = 'scrape' | 'score' | 'export' | 'sync' | 'cleanup';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  data: any;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retries: number;
  maxRetries: number;
}

// Job queue storage
const jobQueue: Job[] = [];
const jobHistory: Job[] = [];
let isProcessing = false;

/**
 * Add job to queue
 */
export function addJob(
  type: JobType,
  data: any,
  maxRetries: number = 3
): string {
  const id = `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const job: Job = {
    id,
    type,
    status: 'pending',
    data,
    createdAt: new Date(),
    retries: 0,
    maxRetries
  };
  
  jobQueue.push(job);
  
  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
  
  return id;
}

/**
 * Get job by ID
 */
export function getJob(id: string): Job | null {
  return jobQueue.find(j => j.id === id) || 
         jobHistory.find(j => j.id === id) || 
         null;
}

/**
 * Get all jobs
 */
export function getAllJobs(): Job[] {
  return [...jobQueue, ...jobHistory];
}

/**
 * Get jobs by type
 */
export function getJobsByType(type: JobType): Job[] {
  return getAllJobs().filter(j => j.type === type);
}

/**
 * Get jobs by status
 */
export function getJobsByStatus(status: JobStatus): Job[] {
  return getAllJobs().filter(j => j.status === status);
}

/**
 * Process job queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing) return;
  
  isProcessing = true;
  
  while (jobQueue.length > 0) {
    const job = jobQueue[0];
    
    try {
      job.status = 'running';
      job.startedAt = new Date();
      
      console.log(`[JOB] Processing ${job.type} job ${job.id}`);
      
      // Process based on job type
      switch (job.type) {
        case 'scrape':
          job.result = await processScrapeJob(job.data);
          break;
        case 'score':
          job.result = await processScoreJob(job.data);
          break;
        case 'export':
          job.result = await processExportJob(job.data);
          break;
        case 'sync':
          job.result = await processSyncJob(job.data);
          break;
        case 'cleanup':
          job.result = await processCleanupJob(job.data);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
      
      job.status = 'completed';
      job.completedAt = new Date();
      
      console.log(`[JOB] Completed ${job.type} job ${job.id}`);
      
    } catch (error) {
      console.error(`[JOB] Error processing ${job.type} job ${job.id}:`, error);
      
      job.retries++;
      
      if (job.retries >= job.maxRetries) {
        job.status = 'failed';
        job.error = (error as Error).message;
        job.completedAt = new Date();
        
        console.error(`[JOB] Failed ${job.type} job ${job.id} after ${job.retries} retries`);
      } else {
        // Reset to pending for retry
        job.status = 'pending';
        job.startedAt = undefined;
        
        console.log(`[JOB] Retrying ${job.type} job ${job.id} (attempt ${job.retries + 1}/${job.maxRetries})`);
        
        // Move to end of queue for retry
        jobQueue.push(jobQueue.shift()!);
        continue;
      }
    }
    
    // Move completed/failed job to history
    jobQueue.shift();
    jobHistory.push(job);
    
    // Keep only last 100 jobs in history
    if (jobHistory.length > 100) {
      jobHistory.shift();
    }
  }
  
  isProcessing = false;
}

/**
 * Process scrape job
 */
async function processScrapeJob(data: any): Promise<any> {
  // Import scraper dynamically to avoid circular dependencies
  const { default: fetch } = await import('node-fetch');
  
  const url = data.url || 'http://localhost:10000/api/scrape/devon';
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Scrape failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result;
}

/**
 * Process score job
 */
async function processScoreJob(data: any): Promise<any> {
  const { default: fetch } = await import('node-fetch');
  
  const url = 'http://localhost:10000/api/approvals/score';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`Score failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result;
}

/**
 * Process export job
 */
async function processExportJob(data: any): Promise<any> {
  const { exportInventoryToExcel } = await import('./excel-export');
  
  const buffer = await exportInventoryToExcel(data.inventory);
  return { success: true, size: buffer.length };
}

/**
 * Process sync job
 */
async function processSyncJob(data: any): Promise<any> {
  const { pushDealToSmartSheet } = await import('./smartsheet-integration');
  
  const rowId = await pushDealToSmartSheet(data.deal);
  return { success: true, rowId };
}

/**
 * Process cleanup job
 */
async function processCleanupJob(data: any): Promise<any> {
  const { clearExpiredCache } = await import('./scraper-cache');
  
  clearExpiredCache();
  return { success: true, message: 'Cache cleaned' };
}

/**
 * Cancel job
 */
export function cancelJob(id: string): { success: boolean; error?: string } {
  const jobIndex = jobQueue.findIndex(j => j.id === id);
  
  if (jobIndex === -1) {
    return { success: false, error: 'Job not found or already completed' };
  }
  
  const job = jobQueue[jobIndex];
  
  if (job.status === 'running') {
    return { success: false, error: 'Cannot cancel running job' };
  }
  
  jobQueue.splice(jobIndex, 1);
  job.status = 'failed';
  job.error = 'Cancelled by user';
  job.completedAt = new Date();
  jobHistory.push(job);
  
  return { success: true };
}

/**
 * Get queue statistics
 */
export function getQueueStats(): {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
} {
  const allJobs = getAllJobs();
  
  return {
    pending: allJobs.filter(j => j.status === 'pending').length,
    running: allJobs.filter(j => j.status === 'running').length,
    completed: allJobs.filter(j => j.status === 'completed').length,
    failed: allJobs.filter(j => j.status === 'failed').length,
    total: allJobs.length
  };
}

/**
 * Clear completed jobs from history
 */
export function clearCompletedJobs(): number {
  const beforeCount = jobHistory.length;
  const filtered = jobHistory.filter(j => j.status !== 'completed');
  jobHistory.length = 0;
  jobHistory.push(...filtered);
  return beforeCount - jobHistory.length;
}

/**
 * Schedule auto-scrape job
 */
export function scheduleAutoScrape(cronExpression: string = '0 */6 * * *'): void {
  // Run every 6 hours by default
  cron.schedule(cronExpression, () => {
    console.log('[CRON] Running scheduled scrape job');
    addJob('scrape', { url: 'http://localhost:10000/api/scrape/devon?limit=50' });
  });
  
  console.log(`[CRON] Auto-scrape scheduled: ${cronExpression}`);
}

/**
 * Schedule cache cleanup job
 */
export function scheduleCacheCleanup(cronExpression: string = '0 0 * * *'): void {
  // Run daily at midnight by default
  cron.schedule(cronExpression, () => {
    console.log('[CRON] Running scheduled cache cleanup');
    addJob('cleanup', {});
  });
  
  console.log(`[CRON] Cache cleanup scheduled: ${cronExpression}`);
}

/**
 * Initialize scheduled jobs
 */
export function initializeScheduledJobs(): void {
  scheduleAutoScrape('0 */6 * * *'); // Every 6 hours
  scheduleCacheCleanup('0 0 * * *'); // Daily at midnight
  
  console.log('[CRON] All scheduled jobs initialized');
}
