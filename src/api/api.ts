/**
 * EXPRESS API WRAPPER
 * REST endpoints for deal finding, inventory, and GHL integration
 */

import express, { Request, Response } from 'express';
import { findOptimalDeals } from '../modules/deal-maximizer';
import { getAllLenderPrograms } from '../modules/lender-programs';
import { saveDealToGHL } from '../modules/ghl-integration';
import { loadInventoryFromCSV, enrichWithVinAuditValuations } from '../modules/inventory-manager';
import {
  FindDealsRequest,
  FindDealsResponse,
  Vehicle,
  ApprovalIngestPayload,
  ApprovalSpec,
  TradeInfo,
  ScoreRequest,
  ScoreResponse,
  LenderRuleSet,
} from '../types/types';
import axios from 'axios';
import { scoreInventory } from '../modules/approvals-engine';
import { listRules, setRules, addRules } from '../modules/rules-library';

const router = express.Router();
let inventory: Vehicle[] = [];
let mirroredInventory: Vehicle[] = [];
let lastApproval: { contactId: string; locationId: string; approval: ApprovalSpec; trade: TradeInfo } | null = null;

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

router.post('/ghl/push-selected', async (req: Request, res: Response) => {
  try {
    const { contactId, selected, webhookUrl } = req.body || {};
    const url = webhookUrl || process.env.GHL_INBOUND_WEBHOOK_URL as string;
    if (!contactId || !selected || !url) {
      return res.status(400).json({ success: false, error: 'Missing contactId, selected, or webhook URL' });
    }
    const payload = { contactId, selected };
    const { data } = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
    res.json({ success: true, providerResponse: data });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
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

// Dynamic Lender Rules Library
router.get('/rules', (_req: Request, res: Response) => {
  res.json({ success: true, rules: listRules() });
});

router.post('/rules/upload', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const rules: LenderRuleSet[] = Array.isArray(body) ? body : (body.rules || []);
    const mode: 'replace' | 'append' = body.mode === 'append' ? 'append' : 'replace';
    if (!Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({ success: false, error: 'No rules provided' });
    }
    if (mode === 'append') addRules(rules);
    else setRules(rules);
    res.json({ success: true, total: listRules().length });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.post('/inventory/sync', (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const v: Vehicle = {
      id: String(b.id || b.stock || b.vehicleId || b.vehicle_id || b.vin || `WEB-${Date.now()}`),
      vin: String(b.vin || ''),
      year: Number(b.year || b.vehicle_year || 0),
      make: String(b.make || b.vehicle_make || 'Unknown'),
      model: String(b.model || b.vehicle_model || 'Unknown'),
      trim: b.trim || '',
      mileage: Number(b.mileage || 0),
      color: b.color || '',
      engine: b.engine || 'Unknown',
      transmission: b.transmission || 'Unknown',
      cbbWholesale: Number(b.cbbWholesale || 0),
      cbbRetail: Number(b.cbbRetail || 0),
      yourCost: Number(b.cost || b.yourCost || 0),
      suggestedPrice: Number(b.suggestedPrice || b.price || 0),
      inStock: b.inStock === undefined ? true : (String(b.inStock).toLowerCase() !== 'false'),
      imageUrl: b.imageUrl || b.image_url || b.photoUrl || '',
      blackBookValue: b.blackBookValue !== undefined ? Number(b.blackBookValue) : (b.black_book_value !== undefined ? Number(b.black_book_value) : undefined),
    };

    const idx = mirroredInventory.findIndex(x => x.id === v.id);
    if (idx >= 0) mirroredInventory[idx] = { ...mirroredInventory[idx], ...v };
    else mirroredInventory.push(v);

    res.json({ success: true, message: 'Vehicle upserted', vehicleId: v.id });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.get('/inventory/mirrored', (req: Request, res: Response) => {
  res.json({ success: true, total: mirroredInventory.length, vehicles: mirroredInventory });
});

router.post('/approvals/ingest', (req: Request, res: Response) => {
  try {
    const payload: ApprovalIngestPayload = req.body;
    if (!payload?.contactId || !payload?.locationId || !payload?.approval || !payload?.trade) {
      return res.status(400).json({ success: false, error: 'Missing contactId, locationId, approval, or trade' });
    }
    lastApproval = {
      contactId: payload.contactId,
      locationId: payload.locationId,
      approval: payload.approval,
      trade: payload.trade,
    };
    if (payload.blackBook?.overrideVehicleId && payload.blackBook?.overrideValue != null) {
      const id = payload.blackBook.overrideVehicleId;
      const vi = mirroredInventory.findIndex(v => v.id === id);
      if (vi >= 0) mirroredInventory[vi] = { ...mirroredInventory[vi], blackBookValue: Number(payload.blackBook.overrideValue) };
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.get('/approvals/last', (req: Request, res: Response) => {
  if (!lastApproval) return res.json({ success: true, hasApproval: false });
  res.json({ success: true, hasApproval: true, lastApproval });
});

router.post('/approvals/score', (req: Request, res: Response) => {
  try {
    const body: ScoreRequest = req.body || {};
    const approval = body.approval || lastApproval?.approval;
    const trade = body.trade || lastApproval?.trade;
    if (!approval || !trade) return res.status(400).json({ success: false, error: 'Missing approval or trade (ingest first or include in request)' });
    if (mirroredInventory.length === 0 && inventory.length > 0) {
      mirroredInventory = inventory;
    }
    const rows = scoreInventory(mirroredInventory, approval, trade);
    const response: ScoreResponse = { approval, rows };
    res.json({ success: true, ...response });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
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
