/**
 * LENDER COMPLIANCE MODULE
 * Rule versioning, custom programs, approval rate tracking
 */

import { LenderProgram } from '../types/types';

export interface LenderRuleVersion {
  lender: string;
  program: string;
  version: string;
  effectiveDate: Date;
  expiryDate?: Date;
  rules: LenderProgram;
  changes?: string[];
}

export interface CustomLenderProgram extends LenderProgram {
  isCustom: boolean;
  dealershipId?: string;
  region?: string;
  notes?: string;
}

export interface LenderApprovalStats {
  lender: string;
  program: string;
  totalSubmissions: number;
  totalApprovals: number;
  approvalRate: number;
  avgAPR: number;
  avgLTV: number;
  avgTerm: number;
  lastUpdated: Date;
}

export interface LenderContact {
  lender: string;
  repName: string;
  phone: string;
  email: string;
  region?: string;
  isPrimary: boolean;
}

// Rule version storage
const ruleVersions: Map<string, LenderRuleVersion[]> = new Map();

// Custom programs storage
const customPrograms: Map<string, CustomLenderProgram> = new Map();

// Approval stats storage
const approvalStats: Map<string, LenderApprovalStats> = new Map();

// Lender contacts storage
const lenderContacts: Map<string, LenderContact[]> = new Map();

/**
 * Add new rule version
 */
export function addRuleVersion(version: LenderRuleVersion): void {
  const key = `${version.lender}_${version.program}`;
  
  if (!ruleVersions.has(key)) {
    ruleVersions.set(key, []);
  }
  
  const versions = ruleVersions.get(key)!;
  versions.push(version);
  
  // Sort by effective date descending
  versions.sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
}

/**
 * Get current rule version
 */
export function getCurrentRuleVersion(lender: string, program: string): LenderRuleVersion | null {
  const key = `${lender}_${program}`;
  const versions = ruleVersions.get(key);
  
  if (!versions || versions.length === 0) return null;
  
  const now = new Date();
  
  // Find first version where effectiveDate <= now and (no expiryDate or expiryDate > now)
  for (const version of versions) {
    if (version.effectiveDate <= now && (!version.expiryDate || version.expiryDate > now)) {
      return version;
    }
  }
  
  return null;
}

/**
 * Get all rule versions for lender/program
 */
export function getRuleHistory(lender: string, program: string): LenderRuleVersion[] {
  const key = `${lender}_${program}`;
  return ruleVersions.get(key) || [];
}

/**
 * Add custom lender program
 */
export function addCustomProgram(program: CustomLenderProgram): void {
  const key = `${program.lender}_${program.tier}`;
  customPrograms.set(key, program);
}

/**
 * Get custom program
 */
export function getCustomProgram(lender: string, tier: string): CustomLenderProgram | null {
  const key = `${lender}_${tier}`;
  return customPrograms.get(key) || null;
}

/**
 * Get all custom programs for lender
 */
export function getCustomProgramsForLender(lender: string): CustomLenderProgram[] {
  const programs: CustomLenderProgram[] = [];
  
  for (const [key, program] of customPrograms.entries()) {
    if (key.startsWith(`${lender}_`)) {
      programs.push(program);
    }
  }
  
  return programs;
}

/**
 * Record approval submission
 */
export function recordApprovalSubmission(
  lender: string,
  program: string,
  approved: boolean,
  apr: number,
  ltv: number,
  term: number
): void {
  const key = `${lender}_${program}`;
  
  let stats = approvalStats.get(key);
  
  if (!stats) {
    stats = {
      lender,
      program,
      totalSubmissions: 0,
      totalApprovals: 0,
      approvalRate: 0,
      avgAPR: 0,
      avgLTV: 0,
      avgTerm: 0,
      lastUpdated: new Date()
    };
    approvalStats.set(key, stats);
  }
  
  stats.totalSubmissions++;
  if (approved) {
    stats.totalApprovals++;
  }
  
  stats.approvalRate = (stats.totalApprovals / stats.totalSubmissions) * 100;
  
  // Update running averages
  const n = stats.totalApprovals;
  if (approved && n > 0) {
    stats.avgAPR = ((stats.avgAPR * (n - 1)) + apr) / n;
    stats.avgLTV = ((stats.avgLTV * (n - 1)) + ltv) / n;
    stats.avgTerm = ((stats.avgTerm * (n - 1)) + term) / n;
  }
  
  stats.lastUpdated = new Date();
}

/**
 * Get approval stats
 */
export function getApprovalStats(lender: string, program: string): LenderApprovalStats | null {
  const key = `${lender}_${program}`;
  return approvalStats.get(key) || null;
}

/**
 * Get all approval stats for lender
 */
export function getLenderApprovalStats(lender: string): LenderApprovalStats[] {
  const stats: LenderApprovalStats[] = [];
  
  for (const [key, stat] of approvalStats.entries()) {
    if (key.startsWith(`${lender}_`)) {
      stats.push(stat);
    }
  }
  
  return stats;
}

/**
 * Get top performing lenders
 */
export function getTopPerformingLenders(limit: number = 5): LenderApprovalStats[] {
  const allStats = Array.from(approvalStats.values());
  
  // Sort by approval rate descending
  allStats.sort((a, b) => b.approvalRate - a.approvalRate);
  
  return allStats.slice(0, limit);
}

/**
 * Add lender contact
 */
export function addLenderContact(contact: LenderContact): void {
  if (!lenderContacts.has(contact.lender)) {
    lenderContacts.set(contact.lender, []);
  }
  
  const contacts = lenderContacts.get(contact.lender)!;
  
  // If setting as primary, unset other primaries
  if (contact.isPrimary) {
    contacts.forEach(c => c.isPrimary = false);
  }
  
  contacts.push(contact);
}

/**
 * Get lender contacts
 */
export function getLenderContacts(lender: string): LenderContact[] {
  return lenderContacts.get(lender) || [];
}

/**
 * Get primary contact for lender
 */
export function getPrimaryContact(lender: string): LenderContact | null {
  const contacts = getLenderContacts(lender);
  return contacts.find(c => c.isPrimary) || contacts[0] || null;
}

/**
 * Compliance pre-check before scoring
 */
export function compliancePreCheck(
  lender: string,
  program: string,
  vehicleYear: number,
  vehicleMileage: number,
  creditScore?: number
): {
  compliant: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Get current rules
  const ruleVersion = getCurrentRuleVersion(lender, program);
  
  if (!ruleVersion) {
    errors.push(`No active rules found for ${lender} ${program}`);
    return { compliant: false, warnings, errors };
  }
  
  const rules = ruleVersion.rules;
  
  // Check vehicle age
  const currentYear = new Date().getFullYear();
  const vehicleAge = currentYear - vehicleYear;
  
  if (rules.maxVehicleAge && vehicleAge > rules.maxVehicleAge) {
    errors.push(`Vehicle too old: ${vehicleAge} years (max: ${rules.maxVehicleAge})`);
  }
  
  // Check mileage
  if (rules.maxMileage && vehicleMileage > rules.maxMileage) {
    errors.push(`Mileage too high: ${vehicleMileage.toLocaleString()} km (max: ${rules.maxMileage.toLocaleString()})`);
  }
  
  // Check credit score if available
  if (creditScore && rules.minCreditScore && creditScore < rules.minCreditScore) {
    errors.push(`Credit score too low: ${creditScore} (min: ${rules.minCreditScore})`);
  }
  
  // Warnings for borderline cases
  if (rules.maxVehicleAge && vehicleAge > rules.maxVehicleAge * 0.8) {
    warnings.push(`Vehicle age approaching limit: ${vehicleAge} years`);
  }
  
  if (rules.maxMileage && vehicleMileage > rules.maxMileage * 0.8) {
    warnings.push(`Mileage approaching limit: ${vehicleMileage.toLocaleString()} km`);
  }
  
  return {
    compliant: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Initialize default rule versions for all lenders
 */
export function initializeDefaultRules(): void {
  const effectiveDate = new Date('2025-01-01');
  
  // TD Specialized Lending
  addRuleVersion({
    lender: 'TD',
    program: '6-Key',
    version: '1.0',
    effectiveDate,
    rules: {
      lender: 'TD',
      tier: '6-Key',
      rate: 11.99,
      ltv: 140,
      maxDsr: 45,
      minIncome: 2000,
      reserve: 500,
      fee: 595,
      negativeEquityLimit: 5000,
      apr: 11.99,
      maxTerm: 84,
      maxLTV: 140,
      maxVehicleAge: 10,
      maxMileage: 200000,
      minCreditScore: 650
    }
  });
  
  // Add more default rules for other lenders...
  // (This would be populated from MASTER-LENDER-DATA-FILE.md)
}
