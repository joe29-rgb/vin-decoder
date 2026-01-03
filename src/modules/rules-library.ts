import { LenderRuleSet } from '../types/types';
import { getContactsForBank } from './lender-contacts';
import { getAllLenderPrograms } from './lender-programs';
import * as fs from 'fs';
import * as path from 'path';

// In-memory dynamic rules store (uploaded monthly via API)
let RULES: LenderRuleSet[] = [];
// Attempt to auto-load bundled default rules so uploads are only needed for new programs
try {
  const seedPath = path.resolve(__dirname, '..', 'config', 'rules-seed.json');
  if (fs.existsSync(seedPath)) {
    const raw = fs.readFileSync(seedPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      RULES = [...parsed] as LenderRuleSet[];
    }
  }
} catch (_e) {}

// Also load built-in program DB (TD/Santander/SDA) and map to LenderRuleSet
try {
  const db = getAllLenderPrograms();
  const pushFrom = (bankKey: string, canonicalBank: string) => {
    const programs = db[bankKey] || {};
    for (const progKey of Object.keys(programs)) {
      const p = programs[progKey];
      const rule: LenderRuleSet = {
        bank: canonicalBank,
        program: p.tier,
        baseApr: p.rate,
        maxFrontEndAdvance: (p.ltv && p.ltv > 0) ? (p.ltv / 100) : undefined,
        frontAdvanceBase: 'black_book',
        reserve: p.reserve ? {
          fixedByFinancedAmount: [ { minFinanced: 0, maxFinanced: 10000000, amount: p.reserve } ],
        } : undefined,
      } as LenderRuleSet;
      RULES.push(rule);
    }
  };
  pushFrom('TD', 'TD Auto Finance');
  pushFrom('Santander', 'Santander Consumer');
  pushFrom('SDA', 'Scotia Dealer Advantage');
} catch(_e) {}

export function setRules(rules: LenderRuleSet[]) {
  RULES = Array.isArray(rules) ? [...rules] : [];
}

export function addRules(rules: LenderRuleSet[]) {
  if (!Array.isArray(rules)) return;
  RULES.push(...rules);
}

export function listRules(): LenderRuleSet[] {
  // Return a copy, enriching with default contacts when missing
  return RULES.map((r) => {
    if (!r.contacts || !r.contacts.length || !r.lenderAddress) {
      const info = getContactsForBank(r.bank);
      if (info) {
        return {
          ...r,
          contacts: (r.contacts && r.contacts.length ? r.contacts : info.contacts),
          lenderAddress: r.lenderAddress || info.address,
        } as LenderRuleSet;
      }
    }
    return { ...r } as LenderRuleSet;
  });
}

export function findRule(bank: string, program: string): LenderRuleSet | undefined {
  function normBank(s: string): string {
    const x = (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    // map common aliases to canonical tokens
    if (/\btd\b|td auto/.test(x)) return 'td auto finance';
    if (/santander/.test(x)) return 'santander consumer';
    if (/scotia\s*dealer\s*advantage|\bsda\b|scotiabank/.test(x)) return 'scotia dealer advantage';
    if (/eden\s*park/.test(x)) return 'eden park';
    if (/\brbc\b/.test(x)) return 'rbc';
    if (/\bcibc\b/.test(x)) return 'cibc auto finance';
    if (/general\s*bank/.test(x)) return 'general bank of canada';
    if (/\bia\b|\bia\s*auto/.test(x)) return 'ia auto finance';
    if (/autocapital|\bacc\b/.test(x)) return 'autocapital';
    if (/northlake/.test(x)) return 'northlake';
    if (/rifco/.test(x)) return 'rifco';
    if (/servus|connectfirst/.test(x)) return 'servus cu';
    if (/ws\s*leasing|prospera/.test(x)) return 'ws leasing';
    if (/national\s*bank/.test(x)) return 'national bank';
    return x;
  }
  function normProgram(s: string): string {
    const x = (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    // normalize key/tier/star formats
    const keyMatch = x.match(/(key)\s*(\d+)|(\d+)\s*(key)/);
    if (keyMatch) {
      const n = keyMatch[2] || keyMatch[3] || '';
      return `key ${n}`.trim();
    }
    const tierMatch = x.match(/(tier)\s*(\d+)|(\d+)\s*(tier)/);
    if (tierMatch) {
      const n = tierMatch[2] || tierMatch[3] || '';
      return `tier ${n}`.trim();
    }
    const starMatch = x.match(/(star)\s*(\d+)|(\d+)\s*(star)/);
    if (starMatch) {
      const n = starMatch[2] || starMatch[3] || '';
      return `star ${n}`.trim();
    }
    return x;
  }
  const b = normBank(bank);
  const p = normProgram(program);
  return RULES.find(r => normBank(r.bank) === b && normProgram(r.program) === p);
}
