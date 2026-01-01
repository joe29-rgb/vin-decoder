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
    const suggestion: any = {
      contactId: 'CONTACT_ID',
      locationId: 'LOCATION_ID',
      approval: {
        bank: '',
        program: '',
        apr: undefined,
        termMonths: undefined,
        paymentMin: undefined,
        paymentMax: undefined,
        province: 'AB',
        downPayment: 0,
      },
      trade: { allowance: 0, acv: 0, lienBalance: 0 },
    };
    const bankMatch = text.match(/(?:Bank|Lender)\s*[:\-]\s*([A-Za-z0-9 &\-]+)/i);
    if (bankMatch) suggestion.approval.bank = bankMatch[1].trim();
    const programMatch = text.match(/Program\s*[:\-]\s*([^\n]+)/i);
    if (programMatch) suggestion.approval.program = programMatch[1].trim();
    const aprMatch = text.match(/APR[^\d]*(\d{1,2}(?:\.\d{1,2})?)/i);
    if (aprMatch) suggestion.approval.apr = Number(aprMatch[1]);
    const termMatch = text.match(/(?:Term|Months)[^\d]*(\d{2,3})/i);
    if (termMatch) suggestion.approval.termMonths = Number(termMatch[1]);
    const payRange = text.match(/Payment[^\d]*(\d{2,4})(?:[^\d]+|\s*to\s*)(\d{2,4})/i);
    if (payRange) { suggestion.approval.paymentMin = Number(payRange[1]); suggestion.approval.paymentMax = Number(payRange[2]); }
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
    const response: ScoreResponse = { approval, rows } as any;
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
