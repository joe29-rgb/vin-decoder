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
    
    // Enhanced lender matching for all formats
    let lenderName = '';
    const lenderPatterns = [
      /Lender\s*[:\-]?\s*([^\n]+?)(?=\s*Status|\s*Lender Reference|$)/i,
      /Bank\s*[:\-]?\s*([^\n]+?)(?=\s*Status|\s*Reference|$)/i,
      /(?:Scotia Dealer Advantage|iA Auto Finance|Eden Park|RIFCO|TD Auto Finance)/i
    ];
    for (const pattern of lenderPatterns) {
      const match = text.match(pattern);
      if (match) {
        lenderName = match[1] ? match[1].trim() : match[0].trim();
        break;
      }
    }
    // Normalize lender names to match lender-programs.ts format
    if (lenderName) {
      const normalized = lenderName
        .replace(/\s+Inc\.?$/i, '')
        .replace(/\s+Ltd\.?$/i, '')
        .replace(/\s+Limited$/i, '')
        .replace(/\s+Corporation$/i, '')
        .replace(/\s+Corp\.?$/i, '');
      
      // Map common variations to standard names
      const lenderMap: Record<string, string> = {
        'scotia dealer advantage': 'SDA',
        'ia auto finance': 'IAAutoFinance',
        'i.a. auto finance': 'IAAutoFinance',
        'eden park': 'EdenPark',
        'rifco': 'RIFCO',
        'td auto finance': 'TD',
        'td': 'TD',
        'santander': 'Santander',
        'auto capital': 'AutoCapital',
        'autocapital': 'AutoCapital',
        'lendcare': 'LendCare',
        'northlake': 'Northlake'
      };
      
      const lowerNorm = normalized.toLowerCase();
      suggestion.approval.bank = lenderMap[lowerNorm] || normalized;
    }
    
    // Enhanced program matching
    const programPatterns = [
      /Product\s*[:\-]?\s*([^\n]+?)(?=\s*Applicant|$)/i,
      /Program\s*[:\-]?\s*([^\n]+?)(?=\s*Applicant|$)/i,
      /(?:Pre-Approval|Loan|Conditional Approval)/i
    ];
    let programName = '';
    for (const pattern of programPatterns) {
      const match = text.match(pattern);
      if (match) {
        programName = match[1] ? match[1].trim() : match[0].trim();
        break;
      }
    }
    if (programName) suggestion.approval.program = programName;
    
    // Enhanced APR matching with support for various formats
    const aprPatterns = [
      /Annual Interest Rate\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*%?/i,
      /APR\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*%?/i,
      /Rate\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*%?/i,
      /Flat Rate\s*(\d{1,2}(?:\.\d{1,2})?)\s*%/i,
      /(\d{1,2}\.\d{2})\s*%/
    ];
    for (const pattern of aprPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        suggestion.approval.apr = Number(match[1]);
        break;
      }
    }
    
    // Enhanced term matching
    const termPatterns = [
      /Term of Borrowing\s*[:\-]?\s*(\d{2,3})/i,
      /Term\s*[:\-]?\s*(\d{2,3})\s*(?:months?|mo)/i,
      /Amortization\s*[:\-]?\s*(\d{2,3})/i
    ];
    for (const pattern of termPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        suggestion.approval.termMonths = Number(match[1]);
        break;
      }
    }
    
    // Enhanced payment matching with multiple patterns
    const paymentPatterns = [
      /maximum approved monthly payment\s*(?:is)?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /max payment\s*(?:is)?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /Installment Payment\s*[:\-]?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /Payment\s*[:\-]?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i
    ];
    for (const pattern of paymentPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        suggestion.approval.paymentMax = amount;
        suggestion.approval.paymentMin = Math.round(amount * 0.8); // 80% of max
        break;
      }
    }
    
    // Enhanced amount financed matching
    const amountPatterns = [
      /Amount Financed\s*[:\-]?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /Financed Amount\s*[:\-]?\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i
    ];
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        suggestion.approval.amountFinanced = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
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
    
    // Province extraction for tax calculations
    const provincePatterns = [
      /\b(AB|Alberta)\b/i,
      /\b(BC|British Columbia)\b/i,
      /\b(MB|Manitoba)\b/i,
      /\b(NB|New Brunswick)\b/i,
      /\b(NL|Newfoundland|Labrador)\b/i,
      /\b(NS|Nova Scotia)\b/i,
      /\b(ON|Ontario)\b/i,
      /\b(PE|PEI|Prince Edward Island)\b/i,
      /\b(QC|Quebec|Québec)\b/i,
      /\b(SK|Saskatchewan)\b/i
    ];
    
    for (const pattern of provincePatterns) {
      const match = text.match(pattern);
      if (match) {
        const prov = match[1].toUpperCase();
        // Normalize to 2-letter codes
        const provinceMap: Record<string, string> = {
          'ALBERTA': 'AB', 'BRITISH COLUMBIA': 'BC', 'MANITOBA': 'MB',
          'NEW BRUNSWICK': 'NB', 'NEWFOUNDLAND': 'NL', 'LABRADOR': 'NL',
          'NOVA SCOTIA': 'NS', 'ONTARIO': 'ON', 'PRINCE EDWARD ISLAND': 'PE',
          'PEI': 'PE', 'QUEBEC': 'QC', 'QUÉBEC': 'QC', 'SASKATCHEWAN': 'SK'
        };
        suggestion.approval.province = provinceMap[prov] || prov.substring(0, 2);
        break;
      }
    }
    
    // Default to AB if not found
    if (!suggestion.approval.province) {
      suggestion.approval.province = 'AB';
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
    
    // Apply defaults for optional approval fields
    const approval = {
      ...payload.approval,
      downPayment: payload.approval.downPayment ?? 0,
      province: payload.approval.province || 'AB',
      frontCapFactor: payload.approval.frontCapFactor ?? 1.4,
    };
    
    // Apply defaults for trade fields
    const trade = {
      ...payload.trade,
      allowance: payload.trade.allowance ?? 0,
      acv: payload.trade.acv ?? 0,
      lienBalance: payload.trade.lienBalance ?? 0,
    };
    
    state.lastApproval = {
      contactId: payload.contactId,
      locationId: payload.locationId,
      approval,
      trade,
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
    
    // Always use latest inventory from state.inventory
    const inventoryToScore = state.inventory.length > 0 ? state.inventory : state.mirroredInventory;
    
    if (inventoryToScore.length === 0) {
      return res.status(400).json({ success: false, error: 'No inventory loaded. Please upload inventory first.' });
    }
    
    const rows = scoreInventory(inventoryToScore, approval, trade);
    const response: ScoreResponse = { approval, rows };
    res.json({ success: true, ...response, inventoryCount: inventoryToScore.length });
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
