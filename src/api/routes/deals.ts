import { Router, Request, Response } from 'express';
import { findOptimalDeals } from '../../modules/deal-maximizer';
import { getAllLenderPrograms } from '../../modules/lender-programs';
import { saveDealToGHL } from '../../modules/ghl-integration';
import { FindDealsRequest, FindDealsResponse } from '../../types/types';
import { state } from '../state';

const router = Router();

router.get('/ping', (_req: Request, res: Response) => {
  res.json({ success: true, scope: 'deals', pong: true });
});

router.post('/find', (req: Request, res: Response) => {
  try {
    const request: FindDealsRequest = req.body;

    if (!request.monthlyIncome || !request.lender || !request.tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: monthlyIncome, lender, tier',
      });
    }

    const deals = findOptimalDeals(request, state.inventory);

    const response: FindDealsResponse = {
      success: true,
      deals,
      summary: {
        totalVehiclesScanned: state.inventory.length,
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

router.post('/calculate', (req: Request, res: Response) => {
  try {
    const { calculateDeal } = require('../../modules/deal-calculator');
    const { vehicleId, customer, lender, apr, termMonths } = req.body;

    if (!vehicleId || !customer || !lender || !apr || !termMonths) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vehicleId, customer, lender, apr, termMonths',
      });
    }

    const vehicle = state.inventory.find(v => v.id === vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    const calculation = calculateDeal(vehicle, customer, lender, apr, termMonths);

    res.json({
      success: true,
      calculation,
    });
  } catch (error) {
    console.error('[DEALS API] Calculate error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.post('/compare-lenders', (req: Request, res: Response) => {
  try {
    const { compareLenders } = require('../../modules/deal-calculator');
    const { vehicleId, customer, lenders } = req.body;

    if (!vehicleId || !customer || !lenders || !Array.isArray(lenders)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vehicleId, customer, lenders (array)',
      });
    }

    const vehicle = state.inventory.find(v => v.id === vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    const comparisons = compareLenders(vehicle, customer, lenders);

    res.json({
      success: true,
      total: comparisons.length,
      comparisons,
    });
  } catch (error) {
    console.error('[DEALS API] Compare lenders error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.post('/optimize', (req: Request, res: Response) => {
  try {
    const { optimizeDeal } = require('../../modules/deal-calculator');
    const { vehicleId, customer, targetPayment, maxApr } = req.body;

    if (!vehicleId || !customer || !targetPayment) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: vehicleId, customer, targetPayment',
      });
    }

    const vehicle = state.inventory.find(v => v.id === vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found',
      });
    }

    const optimized = optimizeDeal(vehicle, customer, targetPayment, maxApr);

    if (!optimized) {
      return res.json({
        success: false,
        error: 'Could not optimize deal to target payment',
      });
    }

    res.json({
      success: true,
      optimized,
    });
  } catch (error) {
    console.error('[DEALS API] Optimize error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/lenders', (_req: Request, res: Response) => {
  try {
    const lenders = getAllLenderPrograms();
    res.json({ success: true, lenders });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/save-to-ghl', async (req: Request, res: Response) => {
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

router.post('/save', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    const dealData = req.body;

    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required',
      });
    }

    const { saveDealToSupabase } = await import('../../modules/deals-storage');
    const savedDeal = await saveDealToSupabase(dealershipId, dealData);

    if (savedDeal) {
      res.json({
        success: true,
        deal: savedDeal,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save deal',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/list', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const status = req.query.status as string | undefined;

    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required',
      });
    }

    const { getDealsFromSupabase } = await import('../../modules/deals-storage');
    const deals = await getDealsFromSupabase(dealershipId, limit, status);

    res.json({
      success: true,
      total: deals.length,
      deals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required',
      });
    }

    const { getDealStatsFromSupabase } = await import('../../modules/deals-storage');
    const stats = await getDealStatsFromSupabase(dealershipId, startDate, endDate);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/:dealId', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    const dealId = req.params.dealId;

    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required',
      });
    }

    const { getDealByIdFromSupabase } = await import('../../modules/deals-storage');
    const deal = await getDealByIdFromSupabase(dealId, dealershipId);

    if (deal) {
      res.json({
        success: true,
        deal,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Deal not found',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.put('/:dealId', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    const dealId = req.params.dealId;
    const updates = req.body;

    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required',
      });
    }

    const { updateDealInSupabase } = await import('../../modules/deals-storage');
    const updatedDeal = await updateDealInSupabase(dealId, dealershipId, updates);

    if (updatedDeal) {
      res.json({
        success: true,
        deal: updatedDeal,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Deal not found or update failed',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.delete('/:dealId', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    const dealId = req.params.dealId;

    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required',
      });
    }

    const { deleteDealFromSupabase } = await import('../../modules/deals-storage');
    const deleted = await deleteDealFromSupabase(dealId, dealershipId);

    if (deleted) {
      res.json({
        success: true,
        message: 'Deal deleted successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Deal not found or delete failed',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
