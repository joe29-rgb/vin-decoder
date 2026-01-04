/**
 * Reports and Analytics API Routes
 * Business intelligence and reporting endpoints
 */

import { Router, Request, Response } from 'express';
import {
  calculateInventoryMetrics,
  generateInventoryReport,
  calculateTrends,
  generateComparisonReport,
  generateDealerPerformanceReport,
  exportReportToCSV,
  generateExecutiveSummary,
} from '../../modules/reports-analytics';
import { getInventoryStore } from '../../modules/inventory-sync';
import logger from '../../utils/logger';

const router = Router();

router.get('/inventory/metrics', async (req: Request, res: Response) => {
  try {
    const vehicles = getInventoryStore();
    const metrics = calculateInventoryMetrics(vehicles);
    
    res.json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    logger.error('Get inventory metrics failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/inventory/report', async (req: Request, res: Response) => {
  try {
    const vehicles = getInventoryStore();
    const report = generateInventoryReport(vehicles);
    
    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Generate inventory report failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/inventory/export', async (req: Request, res: Response) => {
  try {
    const vehicles = getInventoryStore();
    const metrics = calculateInventoryMetrics(vehicles);
    const csv = exportReportToCSV(metrics);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="inventory-report-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    logger.error('Export inventory report failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/performance', async (req: Request, res: Response) => {
  try {
    const vehicles = getInventoryStore();
    const performance = generateDealerPerformanceReport(vehicles);
    
    res.json({
      success: true,
      performance,
    });
  } catch (error: any) {
    logger.error('Generate performance report failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/executive-summary', async (req: Request, res: Response) => {
  try {
    const vehicles = getInventoryStore();
    const summary = generateExecutiveSummary(vehicles);
    
    res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    logger.error('Generate executive summary failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/comparison', async (req: Request, res: Response) => {
  try {
    const { currentInventory, previousInventory } = req.body;
    
    if (!Array.isArray(currentInventory) || !Array.isArray(previousInventory)) {
      return res.status(400).json({
        success: false,
        error: 'Both currentInventory and previousInventory must be arrays',
      });
    }
    
    const comparison = generateComparisonReport(currentInventory, previousInventory);
    
    res.json({
      success: true,
      comparison,
    });
  } catch (error: any) {
    logger.error('Generate comparison report failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/trends', async (req: Request, res: Response) => {
  try {
    const { historicalData, periods } = req.body;
    
    if (!Array.isArray(historicalData)) {
      return res.status(400).json({
        success: false,
        error: 'historicalData must be an array',
      });
    }
    
    const data = historicalData.map((item: any) => ({
      date: new Date(item.date),
      value: item.value,
    }));
    
    const trends = calculateTrends(data, periods);
    
    res.json({
      success: true,
      trends,
    });
  } catch (error: any) {
    logger.error('Calculate trends failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const vehicles = getInventoryStore();
    
    const metrics = calculateInventoryMetrics(vehicles);
    const performance = generateDealerPerformanceReport(vehicles);
    const summary = generateExecutiveSummary(vehicles);
    
    res.json({
      success: true,
      dashboard: {
        metrics,
        performance,
        summary,
        generatedAt: new Date(),
      },
    });
  } catch (error: any) {
    logger.error('Generate dashboard failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
