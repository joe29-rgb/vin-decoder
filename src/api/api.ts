/**
 * EXPRESS API WRAPPER
 * REST endpoints for deal finding, inventory, and GHL integration
 */

import express, { Request, Response } from 'express';
import { findOptimalDeals } from '../modules/deal-maximizer';
import { getAllLenderPrograms } from '../modules/lender-programs';
import { saveDealToGHL } from '../modules/ghl-integration';
import { loadInventoryFromCSV, enrichWithVinAuditValuations } from '../modules/inventory-manager';
import { FindDealsRequest, FindDealsResponse, Vehicle } from '../types/types';

const router = express.Router();
let inventory: Vehicle[] = [];

router.post('/deals/find', (req: Request, res: Response) => {
  try {
    const request: FindDealsRequest = req.body;

    if (!request.monthlyIncome || !request.lender || !request.tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: monthlyIncome, lender, tier',
      });
    }

    const deals = findOptimalDeals(request, inventory);

    const response: FindDealsResponse = {
      success: true,
      deals,
      summary: {
        totalVehiclesScanned: inventory.length,
        totalCompliantDeals: deals.length,
        topDealGrossProfit: deals[0]?.grossProfit.total || 0,
        averageMonthlyPayment:
          deals.length > 0
            ? deals.reduce((sum, d) => sum + d.monthlyPayment, 0) / deals.length
            : 0,
      },
    };

    res.json(response);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/lenders', (req: Request, res: Response) => {
  try {
    const lenders = getAllLenderPrograms();
    res.json({ success: true, lenders });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/inventory/upload', async (req: Request, res: Response) => {
  try {
    const { csvContent } = req.body;

    if (!csvContent) {
      return res.status(400).json({
        success: false,
        error: 'CSV content required',
      });
    }

    let parsed = loadInventoryFromCSV(csvContent);
    parsed = await enrichWithVinAuditValuations(parsed);
    inventory = parsed;

    res.json({
      success: true,
      message: `Loaded ${inventory.length} vehicles`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/inventory', (req: Request, res: Response) => {
  res.json({
    success: true,
    total: inventory.length,
    vehicles: inventory,
  });
});

router.post('/deals/save-to-ghl', async (req: Request, res: Response) => {
  try {
    const { customerId, ghlAccessToken, deal } = req.body;

    if (!customerId || !ghlAccessToken || !deal) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerId, ghlAccessToken, deal',
      });
    }

    const result = await saveDealToGHL(deal, customerId, ghlAccessToken);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
