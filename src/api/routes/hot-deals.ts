import { Router, Request, Response } from 'express';
import { scoreInventory } from '../../modules/approvals-engine';
import { fetchInventoryFromSupabase } from '../../modules/supabase';
import { ApprovalSpec, TradeInfo } from '../../types/types';

const router = Router();

/**
 * GET /api/hot-deals/alerts
 * Returns real-time hot deal notifications based on current inventory and recent approvals
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    
    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required'
      });
    }

    // Fetch inventory
    const inventory = await fetchInventoryFromSupabase(dealershipId);
    
    if (!inventory || inventory.length === 0) {
      return res.json({
        success: true,
        alerts: [],
        message: 'No inventory available'
      });
    }

    // Get recent approvals from session/state (simplified for now)
    // In production, this would query Supabase approvals table
    const alerts = [];
    
    // Generate hot deal alerts based on inventory characteristics
    for (const vehicle of inventory.slice(0, 10)) {
      const grossPotential = vehicle.suggestedPrice - vehicle.yourCost;
      const margin = vehicle.yourCost > 0 ? (grossPotential / vehicle.yourCost) * 100 : 0;
      
      if (margin > 25 && vehicle.inStock) {
        alerts.push({
          id: `alert-${vehicle.id}`,
          type: 'high_margin',
          priority: 'high',
          vehicle: {
            id: vehicle.id,
            title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            vin: vehicle.vin,
            imageUrl: vehicle.imageUrl
          },
          message: `High margin opportunity: ${margin.toFixed(1)}% potential gross`,
          grossPotential: grossPotential,
          margin: margin,
          timestamp: new Date().toISOString()
        });
      }
      
      // Low mileage alert
      if (vehicle.year >= new Date().getFullYear() - 3 && vehicle.mileage < 30000) {
        alerts.push({
          id: `alert-low-mileage-${vehicle.id}`,
          type: 'low_mileage',
          priority: 'medium',
          vehicle: {
            id: vehicle.id,
            title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            vin: vehicle.vin,
            imageUrl: vehicle.imageUrl
          },
          message: `Low mileage gem: ${vehicle.mileage.toLocaleString()} km on ${vehicle.year}`,
          mileage: vehicle.mileage,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({
      success: true,
      alerts: alerts.slice(0, 20), // Limit to 20 most recent
      count: alerts.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/hot-deals/score
 * Scores all inventory against a given approval to find hot deals
 */
router.post('/score', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    const { approval, trade } = req.body;
    
    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required'
      });
    }

    if (!approval) {
      return res.status(400).json({
        success: false,
        error: 'Approval data required'
      });
    }

    // Fetch inventory
    const inventory = await fetchInventoryFromSupabase(dealershipId);
    
    if (!inventory || inventory.length === 0) {
      return res.json({
        success: true,
        deals: [],
        message: 'No inventory available'
      });
    }

    // Score inventory
    const approvalSpec: ApprovalSpec = {
      bank: approval.bank || 'TD',
      program: approval.program || '4-Key',
      apr: approval.apr || 17.5,
      termMonths: approval.termMonths || 84,
      paymentMin: approval.paymentMin || 0,
      paymentMax: approval.paymentMax || 999999,
      downPayment: approval.downPayment || 0,
      province: approval.province || 'AB'
    };

    const tradeInfo: TradeInfo = trade || {
      allowance: 0,
      acv: 0,
      lienBalance: 0
    };

    const scoredRows = scoreInventory(inventory, approvalSpec, tradeInfo);

    // Filter for hot deals (high gross profit)
    const hotDeals = scoredRows
      .filter((row: any) => row.totalGross > 3000)
      .sort((a: any, b: any) => b.totalGross - a.totalGross)
      .slice(0, 10);

    res.json({
      success: true,
      deals: hotDeals,
      totalScored: scoredRows.length,
      hotDealsCount: hotDeals.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
