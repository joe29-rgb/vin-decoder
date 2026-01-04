/**
 * CARFAX API Routes
 * Vehicle history report endpoints
 */

import { Router, Request, Response } from 'express';
import { 
  getCarfaxReport, 
  quickCheck, 
  generateReportSummary, 
  calculateRiskScore,
  batchQuickCheck,
  clearCache 
} from '../../modules/carfax-integration';
import logger from '../../utils/logger';

const router = Router();

router.get('/report/:vin', async (req: Request, res: Response) => {
  try {
    const { vin } = req.params;
    
    if (!vin || vin.length !== 17) {
      return res.status(400).json({
        success: false,
        error: 'Invalid VIN format. VIN must be 17 characters.'
      });
    }

    const report = await getCarfaxReport(vin.toUpperCase());
    const summary = generateReportSummary(report);
    const risk = calculateRiskScore(report);

    res.json({
      success: true,
      vin: report.vin,
      report,
      summary,
      risk,
    });
  } catch (error: any) {
    logger.error('CARFAX report request failed', { 
      vin: req.params.vin, 
      error: error.message 
    });
    
    res.status(error.message.includes('not available') ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/quickcheck/:vin', async (req: Request, res: Response) => {
  try {
    const { vin } = req.params;
    
    if (!vin || vin.length !== 17) {
      return res.status(400).json({
        success: false,
        error: 'Invalid VIN format. VIN must be 17 characters.'
      });
    }

    const result = await quickCheck(vin.toUpperCase());

    res.json({
      success: true,
      vin: result.vin,
      quickCheck: result,
    });
  } catch (error: any) {
    logger.error('CARFAX quick check failed', { 
      vin: req.params.vin, 
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/batch-quickcheck', async (req: Request, res: Response) => {
  try {
    const { vins } = req.body;
    
    if (!Array.isArray(vins) || vins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body must contain an array of VINs'
      });
    }

    if (vins.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 VINs per batch request'
      });
    }

    const validVins = vins.filter(vin => typeof vin === 'string' && vin.length === 17);
    
    if (validVins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid VINs provided'
      });
    }

    const results = await batchQuickCheck(validVins.map(v => v.toUpperCase()));
    
    const response: any = {
      success: true,
      total: validVins.length,
      processed: results.size,
      results: {},
    };

    results.forEach((value, key) => {
      response.results[key] = value;
    });

    res.json(response);
  } catch (error: any) {
    logger.error('CARFAX batch quick check failed', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/summary/:vin', async (req: Request, res: Response) => {
  try {
    const { vin } = req.params;
    
    if (!vin || vin.length !== 17) {
      return res.status(400).json({
        success: false,
        error: 'Invalid VIN format. VIN must be 17 characters.'
      });
    }

    const report = await getCarfaxReport(vin.toUpperCase());
    const summary = generateReportSummary(report);
    const risk = calculateRiskScore(report);

    res.json({
      success: true,
      vin: report.vin,
      vehicle: {
        year: report.year,
        make: report.make,
        model: report.model,
        trim: report.trim,
      },
      summary,
      risk,
      highlights: {
        owners: report.ownershipHistory.numberOfOwners,
        accidents: report.accidentHistory.numberOfAccidents,
        cleanTitle: report.titleInfo.isClean,
        openRecalls: report.recalls.numberOfRecalls,
        serviceRecords: report.serviceHistory.numberOfRecords,
      },
    });
  } catch (error: any) {
    logger.error('CARFAX summary request failed', { 
      vin: req.params.vin, 
      error: error.message 
    });
    
    res.status(error.message.includes('not available') ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

router.delete('/cache/:vin?', async (req: Request, res: Response) => {
  try {
    const { vin } = req.params;
    
    if (vin && vin.length !== 17) {
      return res.status(400).json({
        success: false,
        error: 'Invalid VIN format. VIN must be 17 characters.'
      });
    }

    clearCache(vin ? vin.toUpperCase() : undefined);

    res.json({
      success: true,
      message: vin ? `Cache cleared for VIN: ${vin}` : 'All CARFAX cache cleared',
    });
  } catch (error: any) {
    logger.error('CARFAX cache clear failed', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
