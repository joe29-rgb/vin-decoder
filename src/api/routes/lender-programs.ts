import { Router, Request, Response } from 'express';
import { getLenderProgram } from '../../modules/lender-programs';
import { LenderType } from '../../types/types';

const router = Router();

/**
 * GET /api/lender-programs/rate
 * Returns the interest rate for a specific lender and tier/program
 */
router.get('/rate', (req: Request, res: Response) => {
  try {
    const lender = req.query.lender as string;
    const tier = req.query.tier as string;

    if (!lender || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: lender and tier'
      });
    }

    const program = getLenderProgram(lender as LenderType, tier);

    if (!program) {
      return res.status(404).json({
        success: false,
        error: `Program not found for ${lender} - ${tier}`
      });
    }

    res.json({
      success: true,
      lender,
      tier,
      rate: program.rate,
      ltv: program.ltv,
      maxTerm: program.maxTerm
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
