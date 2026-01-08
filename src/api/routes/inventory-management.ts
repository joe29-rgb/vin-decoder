/**
 * INVENTORY MANAGEMENT API ROUTES
 * Aging reports, search, comparison, alerts, bulk updates
 */

import { Router, Request, Response } from 'express';
import {
  generateAgingReport,
  searchInventory,
  filterInventory,
  compareVehicles,
  bulkUpdateInventory,
  getInventoryAlerts,
  reserveVehicle,
  unreserveVehicle,
  getReservation,
  saveInventoryTemplate,
  loadInventoryTemplate,
  getAllTemplates,
  deleteInventoryTemplate
} from '../../modules/inventory-management';
import { state } from '../state';
import logger from '../../utils/logger';

const router = Router();

/**
 * GET /api/inventory-management/aging-report
 * Generate aging report for inventory
 */
router.get('/aging-report', (req: Request, res: Response) => {
  try {
    const report = generateAgingReport(state.inventory as any);
    res.json({ success: true, report });
  } catch (error: any) {
    logger.error('Aging report failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/inventory-management/search
 * Search inventory
 */
router.get('/search', (req: Request, res: Response) => {
  try {
    const query = req.query.q as string || '';
    const results = searchInventory(state.inventory, query);
    res.json({ success: true, total: results.length, results });
  } catch (error: any) {
    logger.error('Inventory search failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/inventory-management/filter
 * Filter inventory by criteria
 */
router.post('/filter', (req: Request, res: Response) => {
  try {
    const filters = req.body;
    const results = filterInventory(state.inventory, filters);
    res.json({ success: true, total: results.length, results });
  } catch (error: any) {
    logger.error('Inventory filter failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/inventory-management/compare
 * Compare vehicles side-by-side
 */
router.post('/compare', (req: Request, res: Response) => {
  try {
    const { vehicleIds } = req.body;
    
    if (!vehicleIds || !Array.isArray(vehicleIds)) {
      return res.status(400).json({ success: false, error: 'vehicleIds array required' });
    }
    
    const vehicles = state.inventory.filter(v => vehicleIds.includes(v.id));
    const comparison = compareVehicles(vehicles);
    
    res.json({ success: true, comparison });
  } catch (error: any) {
    logger.error('Vehicle comparison failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/inventory-management/bulk-update
 * Bulk update inventory
 */
router.post('/bulk-update', (req: Request, res: Response) => {
  try {
    const { vehicleIds, updates } = req.body;
    
    if (!vehicleIds || !Array.isArray(vehicleIds)) {
      return res.status(400).json({ success: false, error: 'vehicleIds array required' });
    }
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'updates object required' });
    }
    
    state.inventory = bulkUpdateInventory(state.inventory, vehicleIds, updates);
    
    res.json({ success: true, updated: vehicleIds.length });
  } catch (error: any) {
    logger.error('Bulk update failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/inventory-management/alerts
 * Get inventory alerts
 */
router.get('/alerts', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const alerts = getInventoryAlerts(limit);
    res.json({ success: true, total: alerts.length, alerts });
  } catch (error: any) {
    logger.error('Get alerts failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/inventory-management/reserve
 * Reserve vehicle
 */
router.post('/reserve', (req: Request, res: Response) => {
  try {
    const { vehicleId, customerName, hours } = req.body;
    
    if (!vehicleId || !customerName) {
      return res.status(400).json({ success: false, error: 'vehicleId and customerName required' });
    }
    
    reserveVehicle(vehicleId, customerName, hours || 24);
    res.json({ success: true, message: 'Vehicle reserved' });
  } catch (error: any) {
    logger.error('Reserve vehicle failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/inventory-management/reserve/:vehicleId
 * Unreserve vehicle
 */
router.delete('/reserve/:vehicleId', (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    unreserveVehicle(vehicleId);
    res.json({ success: true, message: 'Reservation removed' });
  } catch (error: any) {
    logger.error('Unreserve vehicle failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/inventory-management/reserve/:vehicleId
 * Get reservation status
 */
router.get('/reserve/:vehicleId', (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    const reservation = getReservation(vehicleId);
    
    if (!reservation) {
      return res.json({ success: true, reserved: false });
    }
    
    res.json({ success: true, reserved: true, reservation });
  } catch (error: any) {
    logger.error('Get reservation failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/inventory-management/templates
 * Save inventory template
 */
router.post('/templates', (req: Request, res: Response) => {
  try {
    const template = req.body;
    
    if (!template.name) {
      return res.status(400).json({ success: false, error: 'Template name required' });
    }
    
    saveInventoryTemplate(template);
    res.json({ success: true, message: 'Template saved' });
  } catch (error: any) {
    logger.error('Save template failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/inventory-management/templates
 * Get all templates
 */
router.get('/templates', (req: Request, res: Response) => {
  try {
    const templates = getAllTemplates();
    res.json({ success: true, total: templates.length, templates });
  } catch (error: any) {
    logger.error('Get templates failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/inventory-management/templates/:name
 * Load specific template
 */
router.get('/templates/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const template = loadInventoryTemplate(name);
    
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    res.json({ success: true, template });
  } catch (error: any) {
    logger.error('Load template failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/inventory-management/templates/:name
 * Delete template
 */
router.delete('/templates/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    deleteInventoryTemplate(name);
    res.json({ success: true, message: 'Template deleted' });
  } catch (error: any) {
    logger.error('Delete template failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
