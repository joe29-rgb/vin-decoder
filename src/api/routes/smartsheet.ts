/**
 * SMARTSHEET API ROUTES
 * Endpoints for SmartSheet integration
 */

import { Router, Request, Response } from 'express';
import { fetchDealsFromSmartSheet, pushDealToSmartSheet, updateDealStatusInSmartSheet } from '../../modules/smartsheet-integration';
import { state } from '../state';

const router = Router();

/**
 * GET /api/smartsheet/deals
 * Fetch all deals from SmartSheet
 */
router.get('/deals', async (_req: Request, res: Response) => {
  try {
    const deals = await fetchDealsFromSmartSheet();
    res.json({ success: true, deals, total: deals.length });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/smartsheet/deals
 * Push a new deal to SmartSheet
 */
router.post('/deals', async (req: Request, res: Response) => {
  try {
    const { deal } = req.body;
    
    if (!deal) {
      return res.status(400).json({ success: false, error: 'Deal data required' });
    }

    const rowId = await pushDealToSmartSheet(deal);
    res.json({ success: true, rowId, message: 'Deal pushed to SmartSheet' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /api/smartsheet/deals/:rowId/status
 * Update deal status in SmartSheet
 */
router.put('/deals/:rowId/status', async (req: Request, res: Response) => {
  try {
    const { rowId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status required' });
    }

    await updateDealStatusInSmartSheet(parseInt(rowId), status);
    res.json({ success: true, message: 'Status updated in SmartSheet' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/smartsheet/sync-scored-deals
 * Push all scored deals to SmartSheet
 */
router.post('/sync-scored-deals', async (req: Request, res: Response) => {
  try {
    const { rows, approval } = req.body;

    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ success: false, error: 'Scored rows required' });
    }

    const results = [];
    for (const row of rows.slice(0, 10)) { // Push top 10 deals
      try {
        const deal = {
          customerName: approval?.customerName || 'Unknown',
          vehicle: row.title,
          vin: row.vin,
          lender: approval?.bank || 'Unknown',
          program: approval?.program || 'Unknown',
          salePrice: row.salePrice,
          payment: row.monthlyPayment,
          term: approval?.termMonths || 0,
          frontGross: row.frontGross,
          backGross: row.backGross,
          totalGross: row.totalGross,
          status: 'Pending'
        };

        const rowId = await pushDealToSmartSheet(deal);
        results.push({ vehicle: row.title, rowId, success: true });
      } catch (error) {
        results.push({ vehicle: row.title, success: false, error: (error as Error).message });
      }
    }

    res.json({ success: true, results, total: results.length });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
