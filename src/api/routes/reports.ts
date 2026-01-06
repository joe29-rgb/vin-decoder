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
import {
  getDealMetrics,
  getLenderPerformance,
  getVehicleTurnover,
  getRevenueByMonth,
  getCreditTierDistribution,
  recordDeal,
  generateSampleData,
  clearDealHistory,
  getDealHistory,
} from '../../modules/reports-generator';
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

router.get('/deals/metrics', (req: Request, res: Response) => {
  try {
    const metrics = getDealMetrics();
    res.json({ success: true, metrics });
  } catch (error: any) {
    logger.error('Get deal metrics failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/deals/lenders', (req: Request, res: Response) => {
  try {
    const lenders = getLenderPerformance();
    res.json({ success: true, lenders });
  } catch (error: any) {
    logger.error('Get lender performance failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/deals/turnover', (req: Request, res: Response) => {
  try {
    const turnover = getVehicleTurnover();
    res.json({ success: true, turnover });
  } catch (error: any) {
    logger.error('Get vehicle turnover failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/deals/revenue', (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const revenue = getRevenueByMonth(months);
    res.json({ success: true, revenue });
  } catch (error: any) {
    logger.error('Get revenue by month failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/deals/credit-tiers', (req: Request, res: Response) => {
  try {
    const tiers = getCreditTierDistribution();
    res.json({ success: true, tiers });
  } catch (error: any) {
    logger.error('Get credit tier distribution failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/deals/record', (req: Request, res: Response) => {
  try {
    const { vehicleId, lender, revenue, grossProfit, payment, creditTier } = req.body;
    
    if (!vehicleId || !lender || !revenue || !grossProfit || !payment) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vehicleId, lender, revenue, grossProfit, payment',
      });
    }
    
    recordDeal({ vehicleId, lender, revenue, grossProfit, payment, creditTier });
    
    res.json({ success: true, message: 'Deal recorded successfully' });
  } catch (error: any) {
    logger.error('Record deal failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/deals/generate-sample', (req: Request, res: Response) => {
  try {
    generateSampleData();
    res.json({ success: true, message: 'Sample data generated' });
  } catch (error: any) {
    logger.error('Generate sample data failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/deals/history', (req: Request, res: Response) => {
  try {
    clearDealHistory();
    res.json({ success: true, message: 'Deal history cleared' });
  } catch (error: any) {
    logger.error('Clear deal history failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/deals/history', (req: Request, res: Response) => {
  try {
    const history = getDealHistory();
    res.json({ success: true, total: history.length, history });
  } catch (error: any) {
    logger.error('Get deal history failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Excel Export Endpoints
 */
import { exportInventoryToExcel, exportDealsToExcel, exportAnalyticsToExcel } from '../../modules/excel-export';
import { state } from '../state';

router.get('/export/excel/inventory', async (req: Request, res: Response) => {
  try {
    const buffer = await exportInventoryToExcel(state.inventory);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=inventory-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    logger.error('Export inventory to Excel failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/export/excel/deals', async (req: Request, res: Response) => {
  try {
    const { rows, approval } = req.body;
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, error: 'Scored rows required' });
    }
    const buffer = await exportDealsToExcel(rows, approval);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=deals-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    logger.error('Export deals to Excel failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/export/excel/analytics', async (req: Request, res: Response) => {
  try {
    const dealMetrics = getDealMetrics();
    const lenderPerformance = getLenderPerformance();
    const revenue = getRevenueByMonth();
    
    const buffer = await exportAnalyticsToExcel({
      dealMetrics,
      lenderPerformance,
      revenue
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    logger.error('Export analytics to Excel failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
