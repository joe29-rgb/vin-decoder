/**
 * APPROVAL ENHANCEMENTS MODULE
 * Credit score extraction, expiry tracking, co-signer info, approval history
 */

import { ApprovalSpec } from '../types/types';

export interface EnhancedApproval extends ApprovalSpec {
  creditScore?: number;
  creditBureau?: 'Equifax' | 'TransUnion';
  expiryDate?: Date;
  isExpired?: boolean;
  coSigner?: {
    name: string;
    creditScore?: number;
    relationship?: string;
  };
  conditions?: string[];
  approvalType?: 'unconditional' | 'conditional' | 'pre-approval';
  confidenceScore?: number; // 0-100
  extractedAt?: Date;
  lenderReference?: string;
}

/**
 * Extract credit score from approval text
 */
export function extractCreditScore(text: string): { score?: number; bureau?: string } {
  const result: { score?: number; bureau?: string } = {};
  
  // Pattern: "Credit Score: 650" or "FICO: 650" or "Beacon: 650"
  const scorePatterns = [
    /(?:Credit\s+Score|FICO|Beacon|Score):\s*(\d{3})/i,
    /(?:Credit\s+Score|FICO|Beacon|Score)\s+(\d{3})/i,
    /\b(\d{3})\s+(?:Credit\s+Score|FICO|Beacon)/i
  ];
  
  for (const pattern of scorePatterns) {
    const match = text.match(pattern);
    if (match) {
      const score = parseInt(match[1]);
      if (score >= 300 && score <= 900) {
        result.score = score;
        break;
      }
    }
  }
  
  // Extract bureau
  if (text.match(/Equifax/i)) {
    result.bureau = 'Equifax';
  } else if (text.match(/TransUnion/i)) {
    result.bureau = 'TransUnion';
  }
  
  return result;
}

/**
 * Extract approval expiry date
 */
export function extractExpiryDate(text: string): Date | null {
  const patterns = [
    /(?:Valid\s+Until|Expires?|Expiry|Good\s+Until):\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /(?:Valid\s+Until|Expires?|Expiry|Good\s+Until)\s+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /(?:Valid\s+for)\s+(\d+)\s+days?/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1].includes('/') || match[1].includes('-')) {
        // Parse date
        const parts = match[1].split(/[-/]/);
        let month, day, year;
        
        if (parts[2].length === 4) {
          // MM/DD/YYYY or DD/MM/YYYY
          month = parseInt(parts[0]) - 1;
          day = parseInt(parts[1]);
          year = parseInt(parts[2]);
        } else {
          // MM/DD/YY or DD/MM/YY
          month = parseInt(parts[0]) - 1;
          day = parseInt(parts[1]);
          year = 2000 + parseInt(parts[2]);
        }
        
        return new Date(year, month, day);
      } else {
        // Days from now
        const days = parseInt(match[1]);
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);
        return expiry;
      }
    }
  }
  
  // Default: 30 days from now if not specified
  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 30);
  return defaultExpiry;
}

/**
 * Check if approval is expired
 */
export function isApprovalExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}

/**
 * Extract co-signer information
 */
export function extractCoSignerInfo(text: string): {
  name?: string;
  creditScore?: number;
  relationship?: string;
} | null {
  const result: any = {};
  
  // Check if co-signer mentioned
  if (!text.match(/co[-\s]?signer|co[-\s]?applicant|guarantor/i)) {
    return null;
  }
  
  // Extract co-signer name
  const namePatterns = [
    /(?:Co[-\s]?Signer|Co[-\s]?Applicant|Guarantor):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /(?:Co[-\s]?Signer|Co[-\s]?Applicant|Guarantor)\s+Name:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.name = match[1].trim();
      break;
    }
  }
  
  // Extract co-signer credit score
  const scoreMatch = text.match(/(?:Co[-\s]?Signer|Co[-\s]?Applicant).*?(?:Score|FICO|Beacon):\s*(\d{3})/i);
  if (scoreMatch) {
    const score = parseInt(scoreMatch[1]);
    if (score >= 300 && score <= 900) {
      result.creditScore = score;
    }
  }
  
  // Extract relationship
  const relationshipMatch = text.match(/(?:Relationship|Relation):\s*([A-Za-z\s]+?)(?:\n|,|$)/i);
  if (relationshipMatch) {
    result.relationship = relationshipMatch[1].trim();
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Extract approval conditions
 */
export function extractConditions(text: string): string[] {
  const conditions: string[] = [];
  
  // Common condition patterns
  const conditionPatterns = [
    /(?:Subject\s+to|Conditional\s+on|Pending|Requires?):\s*([^\n]+)/gi,
    /(?:Condition|Requirement)\s*\d*:\s*([^\n]+)/gi,
    /\*\s*([^\n]+(?:verification|proof|document|letter)[^\n]*)/gi
  ];
  
  for (const pattern of conditionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const condition = match[1].trim();
      if (condition.length > 10 && !conditions.includes(condition)) {
        conditions.push(condition);
      }
    }
  }
  
  return conditions;
}

/**
 * Determine approval type
 */
export function determineApprovalType(text: string): 'unconditional' | 'conditional' | 'pre-approval' {
  if (text.match(/pre[-\s]?approval/i)) {
    return 'pre-approval';
  }
  
  if (text.match(/conditional|subject\s+to|pending|requires?/i)) {
    return 'conditional';
  }
  
  return 'unconditional';
}

/**
 * Calculate approval confidence score (0-100)
 */
export function calculateConfidenceScore(approval: Partial<EnhancedApproval>): number {
  let score = 0;
  
  // Has bank/lender (20 points)
  if (approval.bank) score += 20;
  
  // Has program (15 points)
  if (approval.program) score += 15;
  
  // Has APR (15 points)
  if (approval.apr && approval.apr > 0) score += 15;
  
  // Has term (15 points)
  if (approval.termMonths && approval.termMonths > 0) score += 15;
  
  // Has payment range (15 points)
  if (approval.paymentMax && approval.paymentMax > 0) score += 15;
  
  // Has credit score (10 points)
  if (approval.creditScore) score += 10;
  
  // Has expiry date (5 points)
  if (approval.expiryDate) score += 5;
  
  // Has lender reference (5 points)
  if (approval.lenderReference) score += 5;
  
  return Math.min(100, score);
}

/**
 * Enhance approval with all extracted data
 */
export function enhanceApproval(approval: ApprovalSpec, pdfText: string): EnhancedApproval {
  const enhanced: EnhancedApproval = { ...approval };
  
  // Extract credit score
  const creditInfo = extractCreditScore(pdfText);
  if (creditInfo.score) {
    enhanced.creditScore = creditInfo.score;
    enhanced.creditBureau = creditInfo.bureau as any;
  }
  
  // Extract expiry date
  const expiryDate = extractExpiryDate(pdfText);
  if (expiryDate) {
    enhanced.expiryDate = expiryDate;
    enhanced.isExpired = isApprovalExpired(expiryDate);
  }
  
  // Extract co-signer
  const coSigner = extractCoSignerInfo(pdfText);
  if (coSigner && coSigner.name) {
    enhanced.coSigner = coSigner as { name: string; creditScore?: number; relationship?: string };
  }
  
  // Extract conditions
  const conditions = extractConditions(pdfText);
  if (conditions.length > 0) {
    enhanced.conditions = conditions;
  }
  
  // Determine approval type
  enhanced.approvalType = determineApprovalType(pdfText);
  
  // Extract lender reference
  const refMatch = pdfText.match(/(?:Reference|Ref|Application|Deal)\s*#?:\s*([A-Z0-9-]+)/i);
  if (refMatch) {
    enhanced.lenderReference = refMatch[1];
  }
  
  // Calculate confidence score
  enhanced.confidenceScore = calculateConfidenceScore(enhanced);
  
  // Set extraction timestamp
  enhanced.extractedAt = new Date();
  
  return enhanced;
}

/**
 * Approval history storage (in-memory for now, will move to Supabase)
 */
const approvalHistory: Map<string, EnhancedApproval[]> = new Map();

/**
 * Add approval to history
 */
export function addToApprovalHistory(contactId: string, approval: EnhancedApproval): void {
  if (!approvalHistory.has(contactId)) {
    approvalHistory.set(contactId, []);
  }
  
  const history = approvalHistory.get(contactId)!;
  history.push(approval);
  
  // Keep only last 10 approvals per contact
  if (history.length > 10) {
    history.shift();
  }
}

/**
 * Get approval history for contact
 */
export function getApprovalHistory(contactId: string): EnhancedApproval[] {
  return approvalHistory.get(contactId) || [];
}

/**
 * Get all active (non-expired) approvals for contact
 */
export function getActiveApprovals(contactId: string): EnhancedApproval[] {
  const history = getApprovalHistory(contactId);
  return history.filter(a => !a.isExpired);
}

/**
 * Compare multiple approvals and find best option
 */
export function compareBestApproval(approvals: EnhancedApproval[]): EnhancedApproval | null {
  if (approvals.length === 0) return null;
  
  // Filter out expired approvals
  const active = approvals.filter(a => !a.isExpired);
  if (active.length === 0) return null;
  
  // Sort by: 1) Lowest APR, 2) Highest payment max, 3) Longest term
  active.sort((a, b) => {
    if (a.apr !== b.apr) return a.apr - b.apr;
    if (a.paymentMax !== b.paymentMax) return b.paymentMax - a.paymentMax;
    return b.termMonths - a.termMonths;
  });
  
  return active[0];
}
