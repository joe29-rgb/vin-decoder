import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import axios from 'axios';
import { listRules, setRules, addRules } from '../../modules/rules-library';
import { scoreInventory } from '../../modules/approvals-engine';
import { ApprovalIngestPayload, LenderRuleSet, ScoreRequest, ScoreResponse, Vehicle } from '../../types/types';
import { state } from '../state';
import { parseDecisionText } from '../../modules/decision-parser';

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
    const text = data.text || '';
    const bankMatch = text.match(/(?:Bank|Lender)\s*[:\-]\s*([A-Za-z0-9 &\-]+)/i);
    const programMatch = text.match(/Program\s*[:\-]\s*([^\n]+)/i);
    const suggestion = [ { bank: (bankMatch ? bankMatch[1].trim() : 'Generic'), program: (programMatch ? programMatch[1].trim() : 'Standard') } ];
    res.json({ success: true, text, suggestion });
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
    const suggestion: any = { approval: {}, trade: {}, extracted: {} };

    // First, attempt lender-specific parser
    try {
      const parsed = parseDecisionText(text);
      if (parsed) {
        if (parsed.approval) Object.assign(suggestion.approval, parsed.approval);
        if (parsed.extracted) Object.assign(suggestion.extracted, parsed.extracted);
      }
    } catch(_e) {}

    // Then apply generic regex extractors to fill in any gaps
    // Bank/Lender name
    const bankMatch = text.match(/(?:Bank|Lender)\s*[:\-]\s*([A-Za-z0-9 &'\-]+)/i);
    if (bankMatch) suggestion.approval.bank = bankMatch[1].trim();
    // Program or Program Approval
    const programMatch = text.match(/Program\s*[:\-]\s*([^\n]+)/i) || text.match(/Program\s*Approval\s*[:\-]\s*([^\n]+)/i);
    if (programMatch) suggestion.approval.program = programMatch[1].trim();

    // APR / Annual Interest Rate
    const aprMatch = text.match(/(?:APR|Annual\s*Interest\s*Rate)[^\d]*(\d{1,2}(?:\.\d{1,2})?)/i);
    if (aprMatch) suggestion.approval.apr = Number(aprMatch[1]);

    // Term / Amortization
    const termMatch = text.match(/(?:Term\s*of\s*Borrowing|Term|Months)[^\d]*(\d{2,3})/i);
    if (termMatch) suggestion.approval.termMonths = Number(termMatch[1]);
    const amortMatch = text.match(/Amortization\s*[:\-]?\s*(\d{2,3})/i);
    if (amortMatch) suggestion.extracted.amortizationMonths = Number(amortMatch[1]);

    // Payment Frequency
    const freqMatch = text.match(/Payment\s*Frequency\s*[:\-]?\s*([A-Za-z\- ]+)/i);
    if (freqMatch) {
      const f = freqMatch[1].trim().toLowerCase();
      const map: any = { 'monthly': 'monthly', 'bi-weekly': 'biweekly', 'bi weekly': 'biweekly', 'biweekly': 'biweekly', 'semi-monthly': 'semimonthly', 'semimonthly': 'semimonthly', 'weekly': 'weekly' };
      suggestion.approval.paymentFrequency = map[f] || undefined;
      suggestion.extracted.paymentFrequencyRaw = freqMatch[1].trim();
    }

    // Amount Financed / Installment Payment / Residual
    const amtMatch = text.match(/Amount\s*Financed\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    if (amtMatch) suggestion.extracted.amountFinanced = Number(amtMatch[1].replace(/[,]/g,'').trim());
    const instMatch = text.match(/Installment\s*Payment\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    if (instMatch) suggestion.extracted.installmentPayment = Number(instMatch[1].replace(/[,]/g,'').trim());
    const residMatch = text.match(/Residual\s*Value\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    if (residMatch) suggestion.extracted.residualValue = Number(residMatch[1].replace(/[,]/g,'').trim());

    // Optional payment range on some decisions
    const payRange = text.match(/Payment[^\d]*(\d{2,4})(?:[^\d]+|\s*to\s*)(\d{2,4})/i);
    if (payRange) { suggestion.approval.paymentMin = Number(payRange[1]); suggestion.approval.paymentMax = Number(payRange[2]); }

    // Conditions block (best-effort): capture text after 'Conditions'
    const condIdx = text.search(/\bConditions\b/i);
    if (condIdx >= 0) {
      suggestion.extracted.conditions = text.slice(condIdx).trim();
    }

    res.json({ success: true, text, suggestion });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.post('/approvals/ingest', (req: Request, res: Response) => {
  try {
    const body: any = req.body || {};
    const ingestOne = (payload: any) => {
      const contactId = payload.contactId || '';
      const locationId = payload.locationId || (process.env.GHL_LOCATION_ID as string) || '';
      const a = payload.approval || {};
      const t = payload.trade || {};
      const approval = {
        bank: a.bank || 'Generic',
        program: a.program || 'Standard',
        apr: Number(a.apr ?? 12.99),
        termMonths: Number(a.termMonths ?? 72),
        paymentMin: Number(a.paymentMin ?? 200),
        paymentMax: Number(a.paymentMax ?? 1200),
        frontCapFactor: a.frontCapFactor != null ? Number(a.frontCapFactor) : undefined,
        backCap: a.backCap,
        province: a.province || 'AB',
        downPayment: Number(a.downPayment ?? 0),
        dealerAdminFee: a.dealerAdminFee != null ? Number(a.dealerAdminFee) : undefined,
        lenderAdminFee: a.lenderAdminFee != null ? Number(a.lenderAdminFee) : undefined,
        paymentFrequency: a.paymentFrequency,
      } as any;
      const trade = {
        allowance: Number(t.allowance ?? 0),
        acv: Number(t.acv ?? 0),
        lienBalance: Number(t.lienBalance ?? 0),
      };
      const item = { contactId, locationId, approval, trade };
      state.lastApproval = item;
      state.approvalQueue.push(item);
      if (payload.blackBook?.overrideVehicleId && payload.blackBook?.overrideValue != null) {
        const id = payload.blackBook.overrideVehicleId;
        const vi = state.mirroredInventory.findIndex(v => v.id === id);
        if (vi >= 0) state.mirroredInventory[vi] = { ...state.mirroredInventory[vi], blackBookValue: Number(payload.blackBook.overrideValue) };
      }
      return item;
    };
    const results: any[] = [];
    if (Array.isArray(body)) {
      for (const p of body) results.push(ingestOne(p));
    } else if (Array.isArray(body.approvals)) {
      for (const p of body.approvals) results.push(ingestOne(p));
    } else {
      results.push(ingestOne(body));
    }
    res.json({ success: true, total: results.length, last: state.lastApproval });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.get('/approvals/last', (_req: Request, res: Response) => {
  if (!state.lastApproval) return res.json({ success: true, hasApproval: false });
  res.json({ success: true, hasApproval: true, lastApproval: state.lastApproval });
});

router.get('/approvals/list', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, total: state.approvalQueue.length, approvals: state.approvalQueue });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.post('/approvals/score', (req: Request, res: Response) => {
  try {
    const body: ScoreRequest = req.body || {};
    const defaultApproval = {
      bank: 'Generic',
      program: 'Standard',
      apr: 12.99,
      termMonths: 72,
      paymentMin: 200,
      paymentMax: 1200,
      province: 'AB',
      downPayment: 0,
    } as any;
    const defaultTrade = { allowance: 0, acv: 0, lienBalance: 0 };
    const approval = body.approval || state.lastApproval?.approval || defaultApproval;
    const trade = body.trade || state.lastApproval?.trade || defaultTrade;
    // Build authoritative inventory for scoring.
    // If mirrored is empty, use primary. If both have data, merge by VIN/ID and prefer primary values for defined fields.
    function keyOf(v: Partial<Vehicle>): string { return (v.vin && v.vin.length) ? `VIN:${v.vin}` : `ID:${v.id}`; }
    let src: Vehicle[] = [];
    if (state.inventory.length > 0 && state.mirroredInventory.length === 0) {
      src = state.inventory;
    } else if (state.inventory.length === 0 && state.mirroredInventory.length > 0) {
      src = state.mirroredInventory;
    } else if (state.inventory.length > 0 && state.mirroredInventory.length > 0) {
      const map = new Map<string, Vehicle>();
      for (const v of state.mirroredInventory) map.set(keyOf(v), v);
      for (const v of state.inventory) {
        const k = keyOf(v);
        const prev = map.get(k) || ({} as Vehicle);
        // Prefer defined fields from primary inventory
        map.set(k, { ...prev, ...v } as Vehicle);
      }
      src = Array.from(map.values());
    }
    if (src.length === 0) src = [];
    state.mirroredInventory = src;

    const rows = scoreInventory(src, approval, trade);
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
