import { LenderRuleSet } from '../types/types';

// In-memory dynamic rules store (uploaded monthly via API)
let RULES: LenderRuleSet[] = [];

export function setRules(rules: LenderRuleSet[]) {
  RULES = Array.isArray(rules) ? [...rules] : [];
}

export function addRules(rules: LenderRuleSet[]) {
  if (!Array.isArray(rules)) return;
  RULES.push(...rules);
}

export function listRules(): LenderRuleSet[] {
  return [...RULES];
}

export function findRule(bank: string, program: string): LenderRuleSet | undefined {
  const b = (bank || '').toLowerCase().trim();
  const p = (program || '').toLowerCase().trim();
  return RULES.find(r => r.bank.toLowerCase().trim() === b && r.program.toLowerCase().trim() === p);
}
