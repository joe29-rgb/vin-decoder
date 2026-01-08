/**
 * DEAL STATE MACHINE MODULE
 * Manage deal lifecycle: draft → pending → approved → closed
 */

export type DealState = 'draft' | 'pending' | 'approved' | 'conditional' | 'declined' | 'closed' | 'cancelled';

export interface Deal {
  id: string;
  state: DealState;
  customerName: string;
  contactId?: string;
  vehicleId: string;
  vehicleInfo: string;
  lender: string;
  program: string;
  salePrice: number;
  monthlyPayment: number;
  apr: number;
  term: number;
  downPayment: number;
  tradeAllowance: number;
  tradeACV: number;
  tradeLien: number;
  frontGross: number;
  backGross: number;
  totalGross: number;
  salesperson?: string;
  createdAt: Date;
  updatedAt: Date;
  stateHistory: DealStateChange[];
  notes?: string;
}

export interface DealStateChange {
  fromState: DealState | null;
  toState: DealState;
  timestamp: Date;
  reason?: string;
  userId?: string;
}

// Valid state transitions
const validTransitions: Record<DealState, DealState[]> = {
  'draft': ['pending', 'cancelled'],
  'pending': ['approved', 'conditional', 'declined', 'cancelled'],
  'conditional': ['approved', 'declined', 'cancelled'],
  'approved': ['closed', 'cancelled'],
  'declined': ['pending', 'cancelled'],
  'closed': [],
  'cancelled': []
};

// Deal storage
const deals: Map<string, Deal> = new Map();

/**
 * Create new deal
 */
export function createDeal(dealData: Omit<Deal, 'id' | 'state' | 'createdAt' | 'updatedAt' | 'stateHistory'>): Deal {
  const id = `DEAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const deal: Deal = {
    ...dealData,
    id,
    state: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
    stateHistory: [{
      fromState: null,
      toState: 'draft',
      timestamp: new Date()
    }]
  };
  
  deals.set(id, deal);
  return deal;
}

/**
 * Get deal by ID
 */
export function getDeal(id: string): Deal | null {
  return deals.get(id) || null;
}

/**
 * Get all deals
 */
export function getAllDeals(): Deal[] {
  return Array.from(deals.values());
}

/**
 * Get deals by state
 */
export function getDealsByState(state: DealState): Deal[] {
  return Array.from(deals.values()).filter(d => d.state === state);
}

/**
 * Get deals by customer
 */
export function getDealsByCustomer(customerName: string): Deal[] {
  return Array.from(deals.values()).filter(d => 
    d.customerName.toLowerCase().includes(customerName.toLowerCase())
  );
}

/**
 * Get deals by salesperson
 */
export function getDealsBySalesperson(salesperson: string): Deal[] {
  return Array.from(deals.values()).filter(d => d.salesperson === salesperson);
}

/**
 * Check if state transition is valid
 */
export function isValidTransition(fromState: DealState, toState: DealState): boolean {
  return validTransitions[fromState]?.includes(toState) || false;
}

/**
 * Transition deal to new state
 */
export function transitionDealState(
  dealId: string,
  newState: DealState,
  reason?: string,
  userId?: string
): { success: boolean; error?: string; deal?: Deal } {
  const deal = deals.get(dealId);
  
  if (!deal) {
    return { success: false, error: 'Deal not found' };
  }
  
  if (!isValidTransition(deal.state, newState)) {
    return { 
      success: false, 
      error: `Invalid transition from ${deal.state} to ${newState}` 
    };
  }
  
  const stateChange: DealStateChange = {
    fromState: deal.state,
    toState: newState,
    timestamp: new Date(),
    reason,
    userId
  };
  
  deal.state = newState;
  deal.updatedAt = new Date();
  deal.stateHistory.push(stateChange);
  
  return { success: true, deal };
}

/**
 * Update deal
 */
export function updateDeal(dealId: string, updates: Partial<Deal>): { success: boolean; error?: string; deal?: Deal } {
  const deal = deals.get(dealId);
  
  if (!deal) {
    return { success: false, error: 'Deal not found' };
  }
  
  // Don't allow direct state changes through update
  delete updates.state;
  delete updates.stateHistory;
  
  Object.assign(deal, updates);
  deal.updatedAt = new Date();
  
  return { success: true, deal };
}

/**
 * Add note to deal
 */
export function addDealNote(dealId: string, note: string): { success: boolean; error?: string } {
  const deal = deals.get(dealId);
  
  if (!deal) {
    return { success: false, error: 'Deal not found' };
  }
  
  const timestamp = new Date().toISOString();
  const noteWithTimestamp = `[${timestamp}] ${note}`;
  
  deal.notes = deal.notes ? `${deal.notes}\n${noteWithTimestamp}` : noteWithTimestamp;
  deal.updatedAt = new Date();
  
  return { success: true };
}

/**
 * Get deal pipeline summary
 */
export function getDealPipelineSummary(): {
  byState: Record<DealState, number>;
  totalValue: Record<DealState, number>;
  totalDeals: number;
  totalPipelineValue: number;
} {
  const byState: Record<DealState, number> = {
    draft: 0,
    pending: 0,
    approved: 0,
    conditional: 0,
    declined: 0,
    closed: 0,
    cancelled: 0
  };
  
  const totalValue: Record<DealState, number> = {
    draft: 0,
    pending: 0,
    approved: 0,
    conditional: 0,
    declined: 0,
    closed: 0,
    cancelled: 0
  };
  
  let totalDeals = 0;
  let totalPipelineValue = 0;
  
  for (const deal of deals.values()) {
    byState[deal.state]++;
    totalValue[deal.state] += deal.salePrice;
    totalDeals++;
    
    // Only count active states in pipeline value
    if (['draft', 'pending', 'approved', 'conditional'].includes(deal.state)) {
      totalPipelineValue += deal.salePrice;
    }
  }
  
  return { byState, totalValue, totalDeals, totalPipelineValue };
}

/**
 * Get deals requiring action
 */
export function getDealsRequiringAction(): {
  pendingApproval: Deal[];
  conditionalApproval: Deal[];
  oldDrafts: Deal[];
} {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  
  return {
    pendingApproval: getDealsByState('pending'),
    conditionalApproval: getDealsByState('conditional'),
    oldDrafts: getDealsByState('draft').filter(d => d.createdAt < threeDaysAgo)
  };
}

/**
 * Calculate conversion rates
 */
export function calculateConversionRates(): {
  draftToPending: number;
  pendingToApproved: number;
  approvedToClosed: number;
  overallConversion: number;
} {
  const allDeals = getAllDeals();
  
  const drafts = allDeals.filter(d => d.stateHistory.some(h => h.toState === 'draft')).length;
  const pending = allDeals.filter(d => d.stateHistory.some(h => h.toState === 'pending')).length;
  const approved = allDeals.filter(d => d.stateHistory.some(h => h.toState === 'approved')).length;
  const closed = allDeals.filter(d => d.state === 'closed').length;
  
  return {
    draftToPending: drafts > 0 ? (pending / drafts) * 100 : 0,
    pendingToApproved: pending > 0 ? (approved / pending) * 100 : 0,
    approvedToClosed: approved > 0 ? (closed / approved) * 100 : 0,
    overallConversion: drafts > 0 ? (closed / drafts) * 100 : 0
  };
}

/**
 * Delete deal
 */
export function deleteDeal(dealId: string): { success: boolean; error?: string } {
  if (!deals.has(dealId)) {
    return { success: false, error: 'Deal not found' };
  }
  
  deals.delete(dealId);
  return { success: true };
}
