import { LenderRuleSet } from '../types/types';
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

// ========================================
// DYNAMIC RESERVE BRACKETS
// Official documentation January 2025-2026
// ========================================

// TD Auto Finance dynamic reserve brackets
const TD_RESERVE_BRACKETS = [
  { minFinanced: 40000, maxFinanced: 10000000, amount: 700 },
  { minFinanced: 25000, maxFinanced: 39999, amount: 600 },
  { minFinanced: 20000, maxFinanced: 24999, amount: 500 },
  { minFinanced: 15000, maxFinanced: 19999, amount: 400 },
  { minFinanced: 10000, maxFinanced: 14999, amount: 300 },
  { minFinanced: 7500, maxFinanced: 9999, amount: 200 },
];

// iA Auto Finance dynamic reserve brackets
const IA_RESERVE_BRACKETS = [
  { minFinanced: 50001, maxFinanced: 10000000, amount: 1000 },
  { minFinanced: 45001, maxFinanced: 50000, amount: 750 },
  { minFinanced: 35001, maxFinanced: 45000, amount: 600 },
  { minFinanced: 20001, maxFinanced: 35000, amount: 500 },
  { minFinanced: 15001, maxFinanced: 20000, amount: 450 },
  { minFinanced: 10001, maxFinanced: 15000, amount: 300 },
  { minFinanced: 0, maxFinanced: 10000, amount: 100 },
];

// Eden Park dynamic reserve brackets
const EDEN_PARK_RESERVE_BRACKETS = [
  { minFinanced: 45001, maxFinanced: 10000000, amount: 750 },
  { minFinanced: 25001, maxFinanced: 45000, amount: 600 },
  { minFinanced: 20001, maxFinanced: 25000, amount: 500 },
  { minFinanced: 15001, maxFinanced: 20000, amount: 450 },
  { minFinanced: 10001, maxFinanced: 15000, amount: 300 },
  { minFinanced: 0, maxFinanced: 10000, amount: 250 },
];

// AutoCapital dynamic reserve brackets
const AUTOCAPITAL_RESERVE_BRACKETS = [
  { minFinanced: 15001, maxFinanced: 10000000, amount: 500 },
  { minFinanced: 0, maxFinanced: 15000, amount: 300 },
];

// Prefera dynamic reserve brackets
const PREFERA_RESERVE_BRACKETS = [
  { minFinanced: 40000, maxFinanced: 10000000, amount: 600 },
  { minFinanced: 30000, maxFinanced: 39999, amount: 500 },
  { minFinanced: 20000, maxFinanced: 29999, amount: 400 },
  { minFinanced: 15000, maxFinanced: 19999, amount: 300 },
  { minFinanced: 0, maxFinanced: 14999, amount: 200 },
];

// Also load built-in program DB and map to LenderRuleSet
try {
  const db = getAllLenderPrograms();
  const pushFrom = (bankKey: string, canonicalBank: string) => {
    const programs = db[bankKey] || {};
    for (const progKey of Object.keys(programs)) {
      const p = programs[progKey];
      
      // Determine which reserve bracket to use based on lender
      let reserveBrackets;
      if (bankKey === 'TD') {
        reserveBrackets = TD_RESERVE_BRACKETS;
      } else if (bankKey === 'IAAutoFinance') {
        reserveBrackets = IA_RESERVE_BRACKETS;
      } else if (bankKey === 'EdenPark') {
        reserveBrackets = EDEN_PARK_RESERVE_BRACKETS;
      } else if (bankKey === 'AutoCapital') {
        reserveBrackets = AUTOCAPITAL_RESERVE_BRACKETS;
      } else if (bankKey === 'Prefera') {
        reserveBrackets = PREFERA_RESERVE_BRACKETS;
      }
      
      const rule: LenderRuleSet = {
        bank: canonicalBank,
        program: p.tier,
        frontCapFactor: (p.ltv && p.ltv > 0) ? (p.ltv / 100) : undefined,
        reserve: reserveBrackets ? {
          fixedByFinancedAmount: reserveBrackets,
        } : (p.reserve && p.reserve > 0 ? {
          fixedByFinancedAmount: [ { minFinanced: 0, maxFinanced: 10000000, amount: p.reserve } ],
        } : undefined),
      } as LenderRuleSet;
      RULES.push(rule);
    }
  };
  
  // Load all lenders
  pushFrom('TD', 'TD Auto Finance');
  pushFrom('Santander', 'Santander Consumer');
  pushFrom('SDA', 'Scotia Dealer Advantage');
  pushFrom('AutoCapital', 'AutoCapital Canada');
  pushFrom('EdenPark', 'Eden Park');
  pushFrom('IAAutoFinance', 'iA Auto Finance');
  pushFrom('LendCare', 'LendCare');
  pushFrom('Northlake', 'Northlake Financial');
  pushFrom('RIFCO', 'RIFCO');
  pushFrom('Prefera', 'Prefera Finance');
} catch(_e) {}

export function setRules(rules: LenderRuleSet[]) {
  RULES = Array.isArray(rules) ? [...rules] : [];
}

export function addRules(rules: LenderRuleSet[]) {
  if (!Array.isArray(rules)) return;
  RULES.push(...rules);
}

export function listRules(): LenderRuleSet[] {
  return RULES.map((r) => ({ ...r }));
}

export function findRule(bank: string, program: string): LenderRuleSet | undefined {
  function normBank(s: string): string {
    const x = (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    // map common aliases to canonical tokens
    if (/\btd\b|td auto/.test(x)) return 'td auto finance';
    if (/santander/.test(x)) return 'santander consumer';
    if (/scotia\s*dealer\s*advantage|\bsda\b|scotiabank/.test(x)) return 'scotia dealer advantage';
    if (/eden\s*park/.test(x)) return 'eden park';
    if (/\bia\b|\bia\s*auto/.test(x)) return 'ia auto finance';
    if (/autocapital|\bacc\b/.test(x)) return 'autocapital canada';
    if (/northlake/.test(x)) return 'northlake financial';
    if (/rifco/.test(x)) return 'rifco';
    if (/lendcare|lend\s*care/.test(x)) return 'lendcare';
    if (/prefera/.test(x)) return 'prefera finance';
    if (/\brbc\b/.test(x)) return 'rbc';
    if (/\bcibc\b/.test(x)) return 'cibc auto finance';
    if (/general\s*bank/.test(x)) return 'general bank of canada';
    if (/servus|connectfirst/.test(x)) return 'servus cu';
    if (/ws\s*leasing|prospera/.test(x)) return 'ws leasing';
    if (/national\s*bank/.test(x)) return 'national bank';
    return x;
  }
  function normProgram(s: string): string {
    const x = (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    // normalize key/tier/star/gear/ride formats
    const keyMatch = x.match(/(key)\s*(\d+)|(\d+)\s*(key)/);
    if (keyMatch) {
      const n = keyMatch[2] || keyMatch[3] || '';
      return `${n}key`.trim();
    }
    const tierMatch = x.match(/(tier)\s*(\d+)|(\d+)\s*(tier)/);
    if (tierMatch) {
      const n = tierMatch[2] || tierMatch[3] || '';
      return `tier${n}`.trim();
    }
    const starMatch = x.match(/(star)\s*(\d+)|(\d+)\s*(star)/);
    if (starMatch) {
      const n = starMatch[2] || starMatch[3] || '';
      return `star${n}`.trim();
    }
    const gearMatch = x.match(/(\d+)(st|nd|rd|th)\s*gear|(\d+)\s*gear/);
    if (gearMatch) {
      const n = gearMatch[1] || gearMatch[3] || '';
      return `${n}thgear`.trim();
    }
    const rideMatch = x.match(/(\d+)\s*ride|ride\s*(\d+)/);
    if (rideMatch) {
      const n = rideMatch[1] || rideMatch[2] || '';
      return `${n}ride`.trim();
    }
    return x;
  }
  const b = normBank(bank);
  const p = normProgram(program);
  return RULES.find(r => normBank(r.bank) === b && normProgram(r.program) === p);
}
