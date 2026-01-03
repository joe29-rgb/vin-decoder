import { ApprovalSpec } from '../types/types';

export type ParsedDecision = {
  approval: Partial<ApprovalSpec>;
  extracted: {
    lenderName?: string;
    programRaw?: string;
    amountFinanced?: number;
    installmentPayment?: number;
    amortizationMonths?: number;
    residualValue?: number;
    paymentFrequencyRaw?: string;
    conditions?: string;
    recognizedLender?: string;
  };
};

function toNum(s?: string): number | undefined {
  if (!s) return undefined;
  const n = Number(String(s).replace(/[$,\s]/g, ''));
  return isNaN(n) ? undefined : n;
}

function normFreq(s?: string): ApprovalSpec['paymentFrequency'] | undefined {
  if (!s) return undefined;
  const f = s.trim().toLowerCase();
  if (f.includes('bi') && f.includes('week')) return 'biweekly';
  if (f.includes('semi') && f.includes('month')) return 'semimonthly';
  if (f.includes('weekly')) return 'weekly';
  if (f.includes('month')) return 'monthly';
  return undefined;
}

function parseTD(text: string): ParsedDecision | null {
  if (!/td\s*auto\s*finance/i.test(text)) return null;
  const out: ParsedDecision = { approval: {}, extracted: { recognizedLender: 'TD Auto Finance' } };
  const prog = text.match(/Program\s*(?:Approval)?\s*[:\-]\s*([^\n]+)/i);
  if (prog) out.approval.program = prog[1].trim();
  const apr = text.match(/(?:APR|Annual\s*Interest\s*Rate)[^\d]*(\d{1,2}(?:\.\d{1,2})?)/i);
  if (apr) out.approval.apr = Number(apr[1]);
  const term = text.match(/(?:Term\s*of\s*Borrowing|Term|Months)[^\d]*(\d{2,3})/i);
  if (term) out.approval.termMonths = Number(term[1]);
  const freq = text.match(/Payment\s*Frequency\s*[:\-]?\s*([A-Za-z\- ]+)/i);
  if (freq) { out.approval.paymentFrequency = normFreq(freq[1]); out.extracted.paymentFrequencyRaw = freq[1].trim(); }
  const af = text.match(/Amount\s*Financed\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  if (af) out.extracted.amountFinanced = toNum(af[1]);
  const inst = text.match(/Installment\s*Payment\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  if (inst) out.extracted.installmentPayment = toNum(inst[1]);
  const amort = text.match(/Amortization\s*[:\-]?\s*(\d{2,3})/i);
  if (amort) out.extracted.amortizationMonths = Number(amort[1]);
  const resid = text.match(/Residual\s*Value\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  if (resid) out.extracted.residualValue = toNum(resid[1]);
  out.approval.bank = 'TD Auto Finance';
  return out;
}

function parseEdenPark(text: string): ParsedDecision | null {
  if (!/eden\s*park/i.test(text)) return null;
  const out: ParsedDecision = { approval: {}, extracted: { recognizedLender: 'Eden Park' } };
  const apr = text.match(/Annual\s*Interest\s*Rate\s*[:\-]?[^\d]*(\d{1,2}(?:\.\d{1,2})?)/i);
  if (apr) out.approval.apr = Number(apr[1]);
  const term = text.match(/(?:Term\s*of\s*Borrowing|Term)\s*[:\-]?[^\d]*(\d{2,3})/i);
  if (term) out.approval.termMonths = Number(term[1]);
  const freq = text.match(/Payment\s*Frequency\s*[:\-]?\s*([A-Za-z\- ]+)/i);
  if (freq) { out.approval.paymentFrequency = normFreq(freq[1]); out.extracted.paymentFrequencyRaw = freq[1].trim(); }
  const af = text.match(/Amount\s*Financed\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  if (af) out.extracted.amountFinanced = toNum(af[1]);
  const inst = text.match(/Installment\s*Payment\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  if (inst) out.extracted.installmentPayment = toNum(inst[1]);
  out.approval.bank = 'Eden Park';
  return out;
}

function parseSantander(text: string): ParsedDecision | null {
  if (!/santander\s*consumer/i.test(text)) return null;
  const out: ParsedDecision = { approval: {}, extracted: { recognizedLender: 'Santander Consumer' } };
  const apr = text.match(/(?:APR|Annual\s*Interest\s*Rate|Interest\s*Rate)[^\d]*(\d{1,2}(?:\.\d{1,2})?)/i);
  if (apr) out.approval.apr = Number(apr[1]);
  const term = text.match(/(?:Term\s*of\s*Borrowing|Term)\s*[:\-]?[^\d]*(\d{2,3})/i);
  if (term) out.approval.termMonths = Number(term[1]);
  const freq = text.match(/Payment\s*Frequency\s*[:\-]?\s*([A-Za-z\- ]+)/i);
  if (freq) { out.approval.paymentFrequency = normFreq(freq[1]); out.extracted.paymentFrequencyRaw = freq[1].trim(); }
  const af = text.match(/Amount\s*Financed\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  if (af) out.extracted.amountFinanced = toNum(af[1]);
  const inst = text.match(/Installment\s*Payment\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  if (inst) out.extracted.installmentPayment = toNum(inst[1]);
  out.approval.bank = 'Santander Consumer';
  return out;
}

function parseRifco(text: string): ParsedDecision | null {
  if (!/rifco/i.test(text)) return null;
  const out: ParsedDecision = { approval: {}, extracted: { recognizedLender: 'RIFCO' } };
  const apr = text.match(/(?:APR|Annual\s*Interest\s*Rate)[^\d]*(\d{1,2}(?:\.\d{1,2})?)/i);
  if (apr) out.approval.apr = Number(apr[1]);
  const freq = text.match(/Payment\s*Frequency\s*[:\-]?\s*([A-Za-z\- ]+)/i);
  if (freq) { out.approval.paymentFrequency = normFreq(freq[1]); out.extracted.paymentFrequencyRaw = freq[1].trim(); }
  out.approval.bank = 'RIFCO';
  return out;
}

export function parseDecisionText(text: string): ParsedDecision {
  const candidates = [parseTD(text), parseEdenPark(text), parseSantander(text), parseRifco(text)];
  for (const c of candidates) if (c) return c;
  // Generic fallback
  const generic: ParsedDecision = { approval: {}, extracted: {} };
  const bank = text.match(/(?:Bank|Lender)\s*[:\-]\s*([A-Za-z0-9 &'\-]+)/i);
  if (bank) { generic.approval.bank = bank[1].trim(); generic.extracted.lenderName = bank[1].trim(); }
  const program = text.match(/Program\s*(?:Approval)?\s*[:\-]\s*([^\n]+)/i);
  if (program) generic.approval.program = program[1].trim();
  const apr = text.match(/(?:APR|Annual\s*Interest\s*Rate)[^\d]*(\d{1,2}(?:\.\d{1,2})?)/i);
  if (apr) generic.approval.apr = Number(apr[1]);
  const term = text.match(/(?:Term\s*of\s*Borrowing|Term|Months)[^\d]*(\d{2,3})/i);
  if (term) generic.approval.termMonths = Number(term[1]);
  const freq = text.match(/Payment\s*Frequency\s*[:\-]?\s*([A-Za-z\- ]+)/i);
  if (freq) { generic.approval.paymentFrequency = normFreq(freq[1]); generic.extracted.paymentFrequencyRaw = freq[1].trim(); }
  const af = text.match(/Amount\s*Financed\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  if (af) generic.extracted.amountFinanced = toNum(af[1]);
  const inst = text.match(/Installment\s*Payment\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  if (inst) generic.extracted.installmentPayment = toNum(inst[1]);
  const amort = text.match(/Amortization\s*[:\-]?\s*(\d{2,3})/i);
  if (amort) generic.extracted.amortizationMonths = Number(amort[1]);
  const resid = text.match(/Residual\s*Value\s*[:\-]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
  if (resid) generic.extracted.residualValue = toNum(resid[1]);
  const condIdx = text.search(/\bConditions\b/i);
  if (condIdx >= 0) generic.extracted.conditions = text.slice(condIdx).trim();
  return generic;
}
