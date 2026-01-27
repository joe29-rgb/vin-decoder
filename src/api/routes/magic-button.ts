import { Router, Request, Response } from 'express';
import { scoreInventory } from '../../modules/approvals-engine';
import { fetchInventoryFromSupabase } from '../../modules/supabase';
import { ApprovalSpec, TradeInfo } from '../../types/types';
import { state } from '../state';

const router = Router();

/**
 * POST /api/magic-button/auto-deal
 * One-click auto deal builder - finds best deal for given approval
 */
router.post('/auto-deal', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    
    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required'
      });
    }

    // Get approval from request or use last ingested
    let approval = req.body.approval;
    let trade = req.body.trade;

    // If no approval provided, use last ingested from state
    if (!approval && state.lastApproval) {
      approval = state.lastApproval.approval;
      trade = state.lastApproval.trade;
    }

    if (!approval) {
      return res.status(400).json({
        success: false,
        error: 'No approval data available. Please ingest an approval first.'
      });
    }

    // Fetch inventory
    const inventory = await fetchInventoryFromSupabase(dealershipId);
    
    if (!inventory || inventory.length === 0) {
      return res.json({
        success: false,
        error: 'No inventory available',
        message: 'Please upload inventory first'
      });
    }

    // Score all inventory
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

    // Find the best deal (highest total gross)
    const bestDeal = scoredRows
      .filter((row: any) => row.flags.length === 0) // No flags = compliant
      .sort((a: any, b: any) => b.totalGross - a.totalGross)[0];

    if (!bestDeal) {
      return res.json({
        success: false,
        error: 'No compliant deals found',
        message: 'No vehicles meet the approval criteria',
        totalScored: scoredRows.length
      });
    }

    // Find the vehicle details
    const vehicle = inventory.find(v => v.id === bestDeal.vehicleId);

    res.json({
      success: true,
      deal: {
        vehicleId: bestDeal.vehicleId,
        vin: bestDeal.vin,
        title: bestDeal.title,
        imageUrl: bestDeal.imageUrl,
        salePrice: bestDeal.salePrice,
        monthlyPayment: bestDeal.monthlyPayment,
        frontGross: bestDeal.frontGross,
        backGross: bestDeal.backGross,
        totalGross: bestDeal.totalGross,
        vehicle: vehicle,
        approval: approvalSpec,
        trade: tradeInfo
      },
      totalScored: scoredRows.length,
      message: `Found best deal: $${bestDeal.totalGross.toFixed(0)} total gross`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/magic-button/quick-score
 * Quick scoring for demo/preview mode
 */
router.post('/quick-score', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    const { paymentMax, bank, program } = req.body;
    
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
        success: false,
        error: 'No inventory available'
      });
    }

    // Create quick approval spec
    const approvalSpec: ApprovalSpec = {
      bank: bank || 'TD',
      program: program || '4-Key',
      apr: 17.5,
      termMonths: 84,
      paymentMin: 0,
      paymentMax: paymentMax || 900,
      downPayment: 0,
      province: 'AB'
    };

    const tradeInfo: TradeInfo = {
      allowance: 0,
      acv: 0,
      lienBalance: 0
    };

    const scoredRows = scoreInventory(inventory, approvalSpec, tradeInfo);

    // Get top 5 deals
    const topDeals = scoredRows
      .filter((row: any) => row.flags.length === 0)
      .sort((a: any, b: any) => b.totalGross - a.totalGross)
      .slice(0, 5);

    res.json({
      success: true,
      deals: topDeals,
      totalScored: scoredRows.length,
      compliantCount: scoredRows.filter((r: any) => r.flags.length === 0).length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
