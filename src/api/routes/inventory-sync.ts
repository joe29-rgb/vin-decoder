/**
 * Inventory Sync API Routes
 * Real-time inventory synchronization endpoints
 */

import { Router, Request, Response } from 'express';
import {
  configureSyncService,
  getSyncConfig,
  addSyncSource,
  removeSyncSource,
  startSyncService,
  stopSyncService,
  performSync,
  manualSync,
  getSyncHistory,
  getChangeLog,
  getChangesSince,
  clearSyncHistory,
  clearChangeLog,
  getSyncStatus,
  setInventoryStore,
  getInventoryStore,
} from '../../modules/inventory-sync';
import logger from '../../utils/logger';

const router = Router();

router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = getSyncStatus();
    res.json({
      success: true,
      status,
    });
  } catch (error: any) {
    logger.error('Get sync status failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = getSyncConfig();
    res.json({
      success: true,
      config,
    });
  } catch (error: any) {
    logger.error('Get sync config failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/config', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    configureSyncService(config);
    res.json({
      success: true,
      message: 'Sync service configured',
      config: getSyncConfig(),
    });
  } catch (error: any) {
    logger.error('Configure sync service failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/sources', async (req: Request, res: Response) => {
  try {
    const source = req.body;
    
    if (!source.name || !source.type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type',
      });
    }

    addSyncSource(source);
    res.json({
      success: true,
      message: 'Sync source added',
      source,
    });
  } catch (error: any) {
    logger.error('Add sync source failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.delete('/sources/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const removed = removeSyncSource(name);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Sync source not found',
      });
    }

    res.json({
      success: true,
      message: 'Sync source removed',
    });
  } catch (error: any) {
    logger.error('Remove sync source failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/start', async (req: Request, res: Response) => {
  try {
    startSyncService();
    res.json({
      success: true,
      message: 'Sync service started',
      status: getSyncStatus(),
    });
  } catch (error: any) {
    logger.error('Start sync service failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/stop', async (req: Request, res: Response) => {
  try {
    stopSyncService();
    res.json({
      success: true,
      message: 'Sync service stopped',
      status: getSyncStatus(),
    });
  } catch (error: any) {
    logger.error('Stop sync service failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const { source } = req.body;
    const result = await manualSync(source);
    
    res.json({
      success: true,
      message: 'Manual sync completed',
      result,
    });
  } catch (error: any) {
    logger.error('Manual sync failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const history = getSyncHistory(limit);
    
    res.json({
      success: true,
      total: history.length,
      history,
    });
  } catch (error: any) {
    logger.error('Get sync history failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/changes', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const since = req.query.since ? new Date(req.query.since as string) : undefined;
    
    const changes = since ? getChangesSince(since) : getChangeLog(limit);
    
    res.json({
      success: true,
      total: changes.length,
      changes,
    });
  } catch (error: any) {
    logger.error('Get change log failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.delete('/history', async (req: Request, res: Response) => {
  try {
    clearSyncHistory();
    res.json({
      success: true,
      message: 'Sync history cleared',
    });
  } catch (error: any) {
    logger.error('Clear sync history failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.delete('/changes', async (req: Request, res: Response) => {
  try {
    clearChangeLog();
    res.json({
      success: true,
      message: 'Change log cleared',
    });
  } catch (error: any) {
    logger.error('Clear change log failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/inventory', async (req: Request, res: Response) => {
  try {
    const { vehicles } = req.body;
    
    if (!Array.isArray(vehicles)) {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain an array of vehicles',
      });
    }

    setInventoryStore(vehicles);
    
    res.json({
      success: true,
      message: 'Inventory store updated',
      count: vehicles.length,
    });
  } catch (error: any) {
    logger.error('Set inventory store failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/inventory', async (req: Request, res: Response) => {
  try {
    const vehicles = getInventoryStore();
    
    res.json({
      success: true,
      total: vehicles.length,
      vehicles,
    });
  } catch (error: any) {
    logger.error('Get inventory store failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
