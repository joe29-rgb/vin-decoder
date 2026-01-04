import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import axios from 'axios';
import { listRules, setRules, addRules } from '../../modules/rules-library';
import { scoreInventory } from '../../modules/approvals-engine';
import { ApprovalIngestPayload, LenderRuleSet, ScoreRequest, ScoreResponse } from '../../types/types';
import { state } from '../state';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.get('/ping', (_req: Request, res: Response) => {
  res.json({ success: true, scope: 'webhooks', pong: true });
});

// Rules endpoints
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

router.post('/rules/parse-pdf', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, error: 'No file provided' });
    const data = await pdf(file.buffer);
    res.json({ success: true, text: data.text || '' });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

// Approvals endpoints
router.post('/approvals/parse-pdf', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, error: 'No file provided' });
    const data = await pdf(file.buffer);
    const text = data.text || '';
    const suggestion: any = { approval: {}, trade: {}, vehicle: {}, customer: {} };
    
    const bankMatch = text.match(/(?:Bank|Lender)\s*[:\-]\s*([A-Za-z0-9 &\-]+)/i);
    if (bankMatch) suggestion.approval.bank = bankMatch[1].trim();
    
    const programMatch = text.match(/(?:Program|Product)\s*[:\-]\s*([^\n]+)/i);
    if (programMatch) suggestion.approval.program = programMatch[1].trim();
    
    const aprMatch = text.match(/(?:Annual Interest Rate|APR|Rate)\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*%?/i);
    if (aprMatch) suggestion.approval.apr = Number(aprMatch[1]);
    
    const termMatch = text.match(/(?:Term of Borrowing|Term|Months)\s*[:\-]?\s*(\d{2,3})/i);
    if (termMatch) suggestion.approval.termMonths = Number(termMatch[1]);
    
    const installmentMatch = text.match(/(?:Installment Payment|Payment)\s*[:\-]?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (installmentMatch) {
      const amount = parseFloat(installmentMatch[1].replace(/,/g, ''));
      suggestion.approval.paymentMax = amount;
    }
    
    const maxPaymentMatch = text.match(/(?:maximum approved monthly payment|max payment)\s*(?:is)?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (maxPaymentMatch) {
      suggestion.approval.paymentMax = parseFloat(maxPaymentMatch[1].replace(/,/g, ''));
    }
    
    const amountFinancedMatch = text.match(/(?:Amount Financed|Financed Amount)\s*[:\-]?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (amountFinancedMatch) {
      suggestion.approval.amountFinanced = parseFloat(amountFinancedMatch[1].replace(/,/g, ''));
    }
    
    const residualMatch = text.match(/(?:Residual Value|Residual)\s*[:\-]?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (residualMatch) {
      suggestion.approval.residualValue = parseFloat(residualMatch[1].replace(/,/g, ''));
    }
    
    const applicationMatch = text.match(/(?:Application|App)\s*#?\s*[:\-]?\s*([A-Z0-9\-]+)/i);
    if (applicationMatch) suggestion.customer.applicationNumber = applicationMatch[1].trim();
    
    const customerMatch = text.match(/(?:Customer|Applicant|Name)\s*[:\-]\s*([A-Za-z\s\-]+?)(?:\n|Dealer|Co-Applicant)/i);
    if (customerMatch) suggestion.customer.name = customerMatch[1].trim();
    
    const dealerMatch = text.match(/(?:Dealer Name|Dealership)\s*[:\-]\s*([^\n]+)/i);
    if (dealerMatch) suggestion.customer.dealerName = dealerMatch[1].trim();
    
    const vinMatch = text.match(/(?:VIN|Vehicle Identification Number)\s*[:\-]?\s*([A-HJ-NPR-Z0-9]{17})/i);
    if (vinMatch) suggestion.vehicle.vin = vinMatch[1].toUpperCase();
    
    const yearMatch = text.match(/(?:Model|Year)\s*[:\-]?\s*(20\d{2}|19\d{2})/i);
    if (yearMatch) suggestion.vehicle.year = parseInt(yearMatch[1]);
    
    const makeModelMatch = text.match(/(?:Model|Vehicle)\s*[:\-]?\s*(20\d{2}|19\d{2})?\s*([A-Za-z]+)\s+([A-Za-z0-9\s\-]+?)(?:\n|VIN|Odometer)/i);
    if (makeModelMatch) {
      if (makeModelMatch[1] && !suggestion.vehicle.year) suggestion.vehicle.year = parseInt(makeModelMatch[1]);
      suggestion.vehicle.make = makeModelMatch[2].trim();
      suggestion.vehicle.model = makeModelMatch[3].trim();
    }
    
    const odometerMatch = text.match(/(?:Odometer|Mileage|KM)\s*[:\-]?\s*(\d+(?:,\d{3})*)/i);
    if (odometerMatch) {
      suggestion.vehicle.odometer = parseInt(odometerMatch[1].replace(/,/g, ''));
    }
    
    const conditionsMatch = text.match(/(?:Conditions|Lender Comments|Comments)\s*[:\-]?\s*([^\n]+(?:\n(?!(?:Application|Customer|Dealer|Vehicle|VIN|Model|Amount|Term|Payment|Rate|Lender))[^\n]+)*)/i);
    if (conditionsMatch) {
      suggestion.approval.conditions = conditionsMatch[1].trim();
    }
    
    const paymentFreqMatch = text.match(/(?:Payment Frequency)\s*[:\-]?\s*(Weekly|Bi-Weekly|Monthly|Semi-Monthly)/i);
    if (paymentFreqMatch) {
      suggestion.approval.paymentFrequency = paymentFreqMatch[1].trim();
    }
    
    res.json({ success: true, text, suggestion });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.post('/approvals/ingest', (req: Request, res: Response) => {
  try {
    const payload: ApprovalIngestPayload = req.body;
    if (!payload?.contactId || !payload?.locationId || !payload?.approval || !payload?.trade) {
      return res.status(400).json({ success: false, error: 'Missing contactId, locationId, approval, or trade' });
    }
    state.lastApproval = {
      contactId: payload.contactId,
      locationId: payload.locationId,
      approval: payload.approval,
      trade: payload.trade,
    };
    if (payload.blackBook?.overrideVehicleId && payload.blackBook?.overrideValue != null) {
      const id = payload.blackBook.overrideVehicleId;
      const vi = state.mirroredInventory.findIndex(v => v.id === id);
      if (vi >= 0) state.mirroredInventory[vi] = { ...state.mirroredInventory[vi], blackBookValue: Number(payload.blackBook.overrideValue) };
    }
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.get('/approvals/last', (_req: Request, res: Response) => {
  if (!state.lastApproval) return res.json({ success: true, hasApproval: false });
  res.json({ success: true, hasApproval: true, lastApproval: state.lastApproval });
});

router.post('/approvals/score', (req: Request, res: Response) => {
  try {
    const body: ScoreRequest = req.body || {};
    const approval = body.approval || state.lastApproval?.approval;
    const trade = body.trade || state.lastApproval?.trade;
    if (!approval || !trade) return res.status(400).json({ success: false, error: 'Missing approval or trade (ingest first or include in request)' });
    if (state.mirroredInventory.length === 0 && state.inventory.length > 0) {
      state.mirroredInventory = state.inventory;
    }
    const rows = scoreInventory(state.mirroredInventory, approval, trade);
    const response: ScoreResponse = { approval, rows };
    res.json({ success: true, ...response });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

// Generic webhook
router.post('/ghl/push-selected', async (req: Request, res: Response) => {
  try {
    const { contactId, selected, webhookUrl } = req.body || {};
    const url = webhookUrl || (process.env.GHL_INBOUND_WEBHOOK_URL as string);
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

export default router;
