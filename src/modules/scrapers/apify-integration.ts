/**
 * Apify API Integration for AutoTrader.ca and CarGurus.ca
 * Replaces brittle HTML scrapers with stable API-based scraping
 */

import axios from 'axios';
import { Vehicle } from '../../types/types';
import logger from '../../utils/logger';

interface ApifyConfig {
  apiToken: string;
  actorId: string;
}

interface AutoTraderApifyResult {
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  price: number;
  dealerName: string;
  dealerLocation: string;
  images: string[];
  url: string;
  transmission?: string;
  bodyType?: string;
  exteriorColor?: string;
}

interface CarGurusApifyResult {
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  price: number;
  dealerName: string;
  dealerLocation: string;
  dealerRating?: number;
  images: string[];
  url: string;
  transmission?: string;
  bodyStyle?: string;
  exteriorColor?: string;
  dealRating?: string;
}

export interface CompetitorSearchParams {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  location: string;
  radiusKm: number;
  limit?: number;
}

export class ApifyScraperService {
  private apiToken: string;
  private autotraderActorId: string;
  private cargurusActorId: string;

  constructor() {
    this.apiToken = process.env.APIFY_API_TOKEN || '';
    this.autotraderActorId = process.env.APIFY_AUTOTRADER_ACTOR_ID || 'apify/autotrader-scraper';
    this.cargurusActorId = process.env.APIFY_CARGURUS_ACTOR_ID || 'apify/cargurus-scraper';
    
    if (!this.apiToken) {
      logger.warn('APIFY_API_TOKEN not set - Apify scraping will not work');
    }
  }

  async scrapeAutoTraderCA(params: CompetitorSearchParams): Promise<AutoTraderApifyResult[]> {
    if (!this.apiToken) {
      throw new Error('Apify API token not configured');
    }

    try {
      logger.info('Starting AutoTrader.ca scrape via Apify', { params });

      const input = {
        startUrls: [{ url: this.buildAutoTraderUrl(params) }],
        maxItems: params.limit || 50,
        proxyConfiguration: { useApifyProxy: true },
      };

      const runResponse = await axios.post(
        `https://api.apify.com/v2/acts/${this.autotraderActorId}/runs?token=${this.apiToken}`,
        input,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const runId = runResponse.data.data.id;
      logger.info('Apify AutoTrader run started', { runId });

      const results = await this.waitForRunCompletion(runId);
      logger.info('AutoTrader.ca scrape complete', { count: results.length });

      return results as AutoTraderApifyResult[];
    } catch (error: any) {
      logger.error('AutoTrader.ca Apify scrape failed', { error: error.message });
      throw error;
    }
  }

  async scrapeCarGurusCA(params: CompetitorSearchParams): Promise<CarGurusApifyResult[]> {
    if (!this.apiToken) {
      throw new Error('Apify API token not configured');
    }

    try {
      logger.info('Starting CarGurus.ca scrape via Apify', { params });

      const input = {
        startUrls: [{ url: this.buildCarGurusUrl(params) }],
        maxItems: params.limit || 50,
        proxyConfiguration: { useApifyProxy: true },
      };

      const runResponse = await axios.post(
        `https://api.apify.com/v2/acts/${this.cargurusActorId}/runs?token=${this.apiToken}`,
        input,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const runId = runResponse.data.data.id;
      logger.info('Apify CarGurus run started', { runId });

      const results = await this.waitForRunCompletion(runId);
      logger.info('CarGurus.ca scrape complete', { count: results.length });

      return results as CarGurusApifyResult[];
    } catch (error: any) {
      logger.error('CarGurus.ca Apify scrape failed', { error: error.message });
      throw error;
    }
  }

  private buildAutoTraderUrl(params: CompetitorSearchParams): string {
    const urlParams = new URLSearchParams();
    
    if (params.make) urlParams.append('make', params.make);
    if (params.model) urlParams.append('model', params.model);
    if (params.yearMin) urlParams.append('yearMin', params.yearMin.toString());
    if (params.yearMax) urlParams.append('yearMax', params.yearMax.toString());
    if (params.priceMin) urlParams.append('priceMin', params.priceMin.toString());
    if (params.priceMax) urlParams.append('priceMax', params.priceMax.toString());
    if (params.location) urlParams.append('loc', params.location);
    if (params.radiusKm) urlParams.append('rcp', params.radiusKm.toString());
    
    return `https://www.autotrader.ca/cars?${urlParams.toString()}`;
  }

  private buildCarGurusUrl(params: CompetitorSearchParams): string {
    const urlParams = new URLSearchParams();
    
    urlParams.append('sourceContext', 'carGurusHomePageModel');
    if (params.make) urlParams.append('makeId', this.getMakeId(params.make));
    if (params.yearMin) urlParams.append('startYear', params.yearMin.toString());
    if (params.yearMax) urlParams.append('endYear', params.yearMax.toString());
    if (params.priceMin) urlParams.append('minPrice', params.priceMin.toString());
    if (params.priceMax) urlParams.append('maxPrice', params.priceMax.toString());
    if (params.location) urlParams.append('zip', params.location);
    if (params.radiusKm) urlParams.append('distance', params.radiusKm.toString());
    
    return `https://www.cargurus.ca/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?${urlParams.toString()}`;
  }

  private getMakeId(make: string): string {
    const makeMap: Record<string, string> = {
      'honda': 'm13', 'toyota': 'm20', 'ford': 'm11', 'chevrolet': 'm4',
      'nissan': 'm15', 'mazda': 'm14', 'hyundai': 'm12', 'kia': 'm49',
      'volkswagen': 'm23', 'bmw': 'm3', 'mercedes-benz': 'm29', 'audi': 'm2',
      'lexus': 'm48', 'acura': 'm1', 'subaru': 'm19', 'jeep': 'm47',
      'ram': 'm60', 'gmc': 'm59', 'dodge': 'm9', 'chrysler': 'm5',
    };
    return makeMap[make.toLowerCase()] || 'm0';
  }

  private async waitForRunCompletion(runId: string, maxWaitMs: number = 120000): Promise<any[]> {
    const startTime = Date.now();
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWaitMs) {
      const statusResponse = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${this.apiToken}`
      );

      const status = statusResponse.data.data.status;
      logger.info('Apify run status', { runId, status });

      if (status === 'SUCCEEDED') {
        const datasetId = statusResponse.data.data.defaultDatasetId;
        const dataResponse = await axios.get(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${this.apiToken}`
        );
        return dataResponse.data;
      }

      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new Error(`Apify run ${status.toLowerCase()}: ${runId}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Apify run timeout after ${maxWaitMs}ms`);
  }

  convertAutoTraderToVehicle(result: AutoTraderApifyResult): Vehicle {
    return {
      id: result.vin || `at-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vin: result.vin || '',
      year: result.year,
      make: result.make,
      model: result.model,
      trim: result.trim || '',
      mileage: result.mileage,
      color: result.exteriorColor,
      engine: 'Unknown',
      transmission: result.transmission || 'Unknown',
      blackBookValue: 0,
      yourCost: 0,
      suggestedPrice: result.price,
      inStock: false,
      imageUrl: result.images[0],
      imageUrls: result.images,
    };
  }

  convertCarGurusToVehicle(result: CarGurusApifyResult): Vehicle {
    return {
      id: result.vin || `cg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      vin: result.vin || '',
      year: result.year,
      make: result.make,
      model: result.model,
      trim: result.trim || '',
      mileage: result.mileage,
      color: result.exteriorColor,
      engine: 'Unknown',
      transmission: result.transmission || 'Unknown',
      blackBookValue: 0,
      yourCost: 0,
      suggestedPrice: result.price,
      inStock: false,
      imageUrl: result.images[0],
      imageUrls: result.images,
    };
  }
}

export async function searchCompetitorPricing(
  year: number,
  make: string,
  model: string,
  location: string,
  radiusKm: number = 100
): Promise<{
  autotrader: { average: number; min: number; max: number; count: number; listings: Vehicle[] };
  cargurus: { average: number; min: number; max: number; count: number; listings: Vehicle[] };
  combined: { average: number; min: number; max: number; count: number };
}> {
  const scraper = new ApifyScraperService();
  const params: CompetitorSearchParams = {
    make,
    model,
    yearMin: year,
    yearMax: year,
    location,
    radiusKm,
    limit: 50,
  };

  try {
    const [autotraderResults, cargurusResults] = await Promise.allSettled([
      scraper.scrapeAutoTraderCA(params),
      scraper.scrapeCarGurusCA(params),
    ]);

    const autotraderListings = autotraderResults.status === 'fulfilled' 
      ? autotraderResults.value.map(r => scraper.convertAutoTraderToVehicle(r))
      : [];

    const cargurusListings = cargurusResults.status === 'fulfilled'
      ? cargurusResults.value.map(r => scraper.convertCarGurusToVehicle(r))
      : [];

    const autotraderPrices = autotraderListings.map(v => v.suggestedPrice).filter(p => p > 0);
    const cargurusPrices = cargurusListings.map(v => v.suggestedPrice).filter(p => p > 0);
    const allPrices = [...autotraderPrices, ...cargurusPrices];

    const calculateStats = (prices: number[]) => {
      if (prices.length === 0) return { average: 0, min: 0, max: 0, count: 0 };
      return {
        average: Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length),
        min: Math.min(...prices),
        max: Math.max(...prices),
        count: prices.length,
      };
    };

    return {
      autotrader: { ...calculateStats(autotraderPrices), listings: autotraderListings },
      cargurus: { ...calculateStats(cargurusPrices), listings: cargurusListings },
      combined: calculateStats(allPrices),
    };
  } catch (error: any) {
    logger.error('Competitor pricing search failed', { error: error.message });
    throw error;
  }
}
