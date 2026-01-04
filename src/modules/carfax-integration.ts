/**
 * CARFAX API Integration
 * Vehicle history report retrieval and verification for Canadian market
 */

import axios from 'axios';
import logger from '../utils/logger';

interface CarfaxReport {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  reportDate: string;
  ownershipHistory: {
    numberOfOwners: number;
    ownershipType: string[];
  };
  accidentHistory: {
    hasAccidents: boolean;
    numberOfAccidents: number;
    severity: string[];
  };
  serviceHistory: {
    numberOfRecords: number;
    lastServiceDate?: string;
    regularMaintenance: boolean;
  };
  titleInfo: {
    isClean: boolean;
    brandedTitle: boolean;
    titleIssues: string[];
  };
  odometer: {
    currentReading: number;
    readings: Array<{
      date: string;
      mileage: number;
      source: string;
    }>;
    rollbackDetected: boolean;
  };
  recalls: {
    hasOpenRecalls: boolean;
    numberOfRecalls: number;
    recallDetails: Array<{
      date: string;
      description: string;
      status: string;
    }>;
  };
  marketValue: {
    retail: number;
    trade: number;
    private: number;
  };
  score: {
    overall: number;
    condition: string;
  };
}

interface CarfaxQuickCheck {
  vin: string;
  hasReport: boolean;
  hasAccidents: boolean;
  numberOfOwners: number;
  isCleanTitle: boolean;
  lastReportedMileage: number;
}

const reportCache = new Map<string, { report: CarfaxReport; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000;

export async function getCarfaxReport(vin: string): Promise<CarfaxReport> {
  try {
    const cached = reportCache.get(vin);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logger.info('CARFAX report retrieved from cache', { vin });
      return cached.report;
    }

    const apiKey = process.env.CARFAX_API_KEY;
    if (!apiKey) {
      throw new Error('CARFAX_API_KEY not configured');
    }

    logger.info('Fetching CARFAX report', { vin });

    const response = await axios.get(
      `https://api.carfax.com/v1/reports/${encodeURIComponent(vin)}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const report = parseCarfaxResponse(response.data, vin);
    
    reportCache.set(vin, { report, timestamp: Date.now() });
    
    logger.info('CARFAX report retrieved successfully', { 
      vin, 
      hasAccidents: report.accidentHistory.hasAccidents,
      isCleanTitle: report.titleInfo.isClean 
    });

    return report;
  } catch (error: any) {
    if (error.response?.status === 404) {
      logger.warn('CARFAX report not found', { vin });
      throw new Error('No CARFAX report available for this VIN');
    }
    
    logger.error('CARFAX API error', { 
      vin, 
      error: error.message,
      status: error.response?.status 
    });
    throw new Error(`CARFAX API error: ${error.message}`);
  }
}

export async function quickCheck(vin: string): Promise<CarfaxQuickCheck> {
  try {
    const apiKey = process.env.CARFAX_API_KEY;
    if (!apiKey) {
      throw new Error('CARFAX_API_KEY not configured');
    }

    logger.info('CARFAX quick check', { vin });

    const response = await axios.get(
      `https://api.carfax.com/v1/quickcheck/${encodeURIComponent(vin)}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const data = response.data;

    return {
      vin,
      hasReport: data.hasReport || false,
      hasAccidents: data.hasAccidents || false,
      numberOfOwners: data.numberOfOwners || 0,
      isCleanTitle: data.isCleanTitle !== false,
      lastReportedMileage: data.lastReportedMileage || 0,
    };
  } catch (error: any) {
    logger.error('CARFAX quick check error', { 
      vin, 
      error: error.message 
    });
    throw new Error(`CARFAX quick check failed: ${error.message}`);
  }
}

function parseCarfaxResponse(data: any, vin: string): CarfaxReport {
  const vehicle = data.vehicle || {};
  const history = data.history || {};
  const ownership = history.ownership || {};
  const accidents = history.accidents || {};
  const service = history.service || {};
  const title = history.title || {};
  const odometer = history.odometer || {};
  const recalls = history.recalls || {};
  const value = data.marketValue || {};

  return {
    vin,
    year: vehicle.year || 0,
    make: vehicle.make || 'Unknown',
    model: vehicle.model || 'Unknown',
    trim: vehicle.trim,
    reportDate: data.reportDate || new Date().toISOString(),
    ownershipHistory: {
      numberOfOwners: ownership.numberOfOwners || 0,
      ownershipType: ownership.types || [],
    },
    accidentHistory: {
      hasAccidents: accidents.hasAccidents || false,
      numberOfAccidents: accidents.count || 0,
      severity: accidents.severity || [],
    },
    serviceHistory: {
      numberOfRecords: service.recordCount || 0,
      lastServiceDate: service.lastDate,
      regularMaintenance: service.regularMaintenance || false,
    },
    titleInfo: {
      isClean: title.isClean !== false,
      brandedTitle: title.isBranded || false,
      titleIssues: title.issues || [],
    },
    odometer: {
      currentReading: odometer.current || 0,
      readings: (odometer.history || []).map((r: any) => ({
        date: r.date,
        mileage: r.mileage,
        source: r.source,
      })),
      rollbackDetected: odometer.rollbackDetected || false,
    },
    recalls: {
      hasOpenRecalls: recalls.hasOpen || false,
      numberOfRecalls: recalls.count || 0,
      recallDetails: (recalls.details || []).map((r: any) => ({
        date: r.date,
        description: r.description,
        status: r.status,
      })),
    },
    marketValue: {
      retail: value.retail || 0,
      trade: value.trade || 0,
      private: value.private || 0,
    },
    score: {
      overall: data.score || 0,
      condition: data.condition || 'Unknown',
    },
  };
}

export function generateReportSummary(report: CarfaxReport): string {
  const flags: string[] = [];
  
  if (report.accidentHistory.hasAccidents) {
    flags.push(`${report.accidentHistory.numberOfAccidents} accident(s) reported`);
  }
  
  if (!report.titleInfo.isClean) {
    flags.push('Title issues detected');
  }
  
  if (report.titleInfo.brandedTitle) {
    flags.push('Branded title');
  }
  
  if (report.odometer.rollbackDetected) {
    flags.push('Odometer rollback detected');
  }
  
  if (report.recalls.hasOpenRecalls) {
    flags.push(`${report.recalls.numberOfRecalls} open recall(s)`);
  }
  
  if (report.ownershipHistory.numberOfOwners > 3) {
    flags.push(`${report.ownershipHistory.numberOfOwners} previous owners`);
  }

  if (flags.length === 0) {
    return `Clean CARFAX report - ${report.ownershipHistory.numberOfOwners} owner(s), no accidents reported, clean title`;
  }

  return `CARFAX flags: ${flags.join(', ')}`;
}

export function calculateRiskScore(report: CarfaxReport): {
  score: number;
  level: 'low' | 'medium' | 'high';
  factors: string[];
} {
  let score = 0;
  const factors: string[] = [];

  if (report.accidentHistory.hasAccidents) {
    const accidentPoints = report.accidentHistory.numberOfAccidents * 15;
    score += accidentPoints;
    factors.push(`${report.accidentHistory.numberOfAccidents} accident(s): +${accidentPoints}`);
  }

  if (!report.titleInfo.isClean) {
    score += 30;
    factors.push('Title issues: +30');
  }

  if (report.titleInfo.brandedTitle) {
    score += 40;
    factors.push('Branded title: +40');
  }

  if (report.odometer.rollbackDetected) {
    score += 50;
    factors.push('Odometer rollback: +50');
  }

  if (report.recalls.hasOpenRecalls) {
    score += report.recalls.numberOfRecalls * 5;
    factors.push(`${report.recalls.numberOfRecalls} open recall(s): +${report.recalls.numberOfRecalls * 5}`);
  }

  if (report.ownershipHistory.numberOfOwners > 3) {
    const ownerPoints = (report.ownershipHistory.numberOfOwners - 3) * 5;
    score += ownerPoints;
    factors.push(`${report.ownershipHistory.numberOfOwners} owners: +${ownerPoints}`);
  }

  if (!report.serviceHistory.regularMaintenance) {
    score += 10;
    factors.push('Irregular maintenance: +10');
  }

  let level: 'low' | 'medium' | 'high';
  if (score <= 20) level = 'low';
  else if (score <= 50) level = 'medium';
  else level = 'high';

  return { score, level, factors };
}

export async function batchQuickCheck(vins: string[]): Promise<Map<string, CarfaxQuickCheck>> {
  const results = new Map<string, CarfaxQuickCheck>();
  const batchSize = 10;
  
  for (let i = 0; i < vins.length; i += batchSize) {
    const batch = vins.slice(i, i + batchSize);
    const promises = batch.map(async (vin) => {
      try {
        const result = await quickCheck(vin);
        results.set(vin, result);
      } catch (error: any) {
        logger.warn('Batch quick check failed for VIN', { vin, error: error.message });
      }
    });
    
    await Promise.all(promises);
    
    if (i + batchSize < vins.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

export function clearCache(vin?: string): void {
  if (vin) {
    reportCache.delete(vin);
    logger.info('CARFAX cache cleared for VIN', { vin });
  } else {
    reportCache.clear();
    logger.info('CARFAX cache cleared completely');
  }
}
