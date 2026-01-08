/**
 * DEALS MANAGEMENT API ROUTES
 * Deal state machine, pipeline, conversion tracking
 */

import { Router, Request, Response } from 'express';
import {
  createDeal,
  getDeal,
  getAllDeals,
  getDealsByState,
  getDealsByCustomer,
  getDealsBySalesperson,
  transitionDealState,
  updateDeal,
  addDealNote,
  getDealPipelineSummary,
  getDealsRequiringAction,
  calculateConversionRates,
  deleteDeal
} from '../../modules/deal-state-machine';
import logger from '../../utils/logger';

const router = Router();

/**
 * POST /api/deals-management/create
 * Create new deal
 */
router.post('/create', (req: Request, res: Response) => {
  try {
    const dealData = req.body;
    const deal = createDeal(dealData);
    res.json({ success: true, deal });
  } catch (error: any) {
    logger.error('Create deal failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/deals-management/:id
 * Get deal by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deal = getDeal(id);
    
    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }
    
    res.json({ success: true, deal });
  } catch (error: any) {
    logger.error('Get deal failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/deals-management
 * Get all deals or filter by state/customer/salesperson
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { state, customer, salesperson } = req.query;
    
    let deals;
    if (state) {
      deals = getDealsByState(state as any);
    } else if (customer) {
      deals = getDealsByCustomer(customer as string);
    } else if (salesperson) {
      deals = getDealsBySalesperson(salesperson as string);
    } else {
      deals = getAllDeals();
    }
    
    res.json({ success: true, total: deals.length, deals });
  } catch (error: any) {
    logger.error('Get deals failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/deals-management/:id/state
 * Transition deal state
 */
router.put('/:id/state', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newState, reason, userId } = req.body;
    
    if (!newState) {
      return res.status(400).json({ success: false, error: 'newState required' });
    }
    
    const result = transitionDealState(id, newState, reason, userId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error: any) {
    logger.error('Transition deal state failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/deals-management/:id
 * Update deal
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const result = updateDeal(id, updates);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error: any) {
    logger.error('Update deal failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/deals-management/:id/notes
 * Add note to deal
 */
router.post('/:id/notes', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    
    if (!note) {
      return res.status(400).json({ success: false, error: 'note required' });
    }
    
    const result = addDealNote(id, note);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error: any) {
    logger.error('Add deal note failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/deals-management/pipeline/summary
 * Get pipeline summary
 */
router.get('/pipeline/summary', (req: Request, res: Response) => {
  try {
    const summary = getDealPipelineSummary();
    res.json({ success: true, summary });
  } catch (error: any) {
    logger.error('Get pipeline summary failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/deals-management/pipeline/action-required
 * Get deals requiring action
 */
router.get('/pipeline/action-required', (req: Request, res: Response) => {
  try {
    const deals = getDealsRequiringAction();
    res.json({ success: true, deals });
  } catch (error: any) {
    logger.error('Get action required deals failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/deals-management/pipeline/conversion-rates
 * Get conversion rates
 */
router.get('/pipeline/conversion-rates', (req: Request, res: Response) => {
  try {
    const rates = calculateConversionRates();
    res.json({ success: true, rates });
  } catch (error: any) {
    logger.error('Get conversion rates failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/deals-management/:id
 * Delete deal
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = deleteDeal(id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
  } catch (error: any) {
    logger.error('Delete deal failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
