/**
 * AUTOTRADER.CA HTTP SCRAPER
 * Uses direct HTTP requests instead of Puppeteer (faster, no bot detection)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Vehicle } from '../../types/types';
import logger from '../../utils/logger';

export interface AutoTraderParams {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  radius?: number;
  limit?: number;
}

export async function scrapeAutoTraderHTTP(params: AutoTraderParams): Promise<Vehicle[]> {
  logger.info('[AutoTrader-HTTP] Starting scrape', params);
  
  try {
    const url = buildAutoTraderURL(params);
    logger.info('[AutoTrader-HTTP] Fetching:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 30000
    });
    
    const html = response.data;
    
    // Check for bot detection
    if (html.includes('captcha') || html.includes('DataDome') || html.includes('challenge')) {
      logger.error('[AutoTrader-HTTP] Bot detection triggered');
      return [];
    }
    
    const $ = cheerio.load(html);
    const vehicles: Vehicle[] = [];
    
    // Use the working selector: .result-item
    const listings = $('.result-item');
    logger.info(`[AutoTrader-HTTP] Found ${listings.length} listings`);
    
    listings.each((index, element) => {
      if (params.limit && vehicles.length >= params.limit) {
        return false; // Stop iteration
      }
      
      const $el = $(element);
      
      // Extract vehicle data
      const id = $el.attr('id') || `at-${Date.now()}-${index}`;
      const title = $el.find('h2, .title-wrapper, [class*="title"]').first().text().trim();
      const priceText = $el.find('.price-amount, [class*="price"]').first().text().trim();
      const mileageText = $el.find('[class*="mileage"], [class*="odometer"]').first().text().trim();
      const locationText = $el.find('[class*="location"], [class*="dealer"]').first().text().trim();
      const linkHref = $el.find('a[href*="/a/"]').first().attr('href');
      
      // Parse title for year/make/model
      const titleParts = title.split(' ');
      const year = parseInt(titleParts[0]) || 0;
      const make = titleParts[1] || '';
      const model = titleParts.slice(2).join(' ') || '';
      
      // Parse price
      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
      
      // Parse mileage
      const mileage = parseInt(mileageText.replace(/[^0-9]/g, '')) || 0;
      
      // Build full URL
      const url = linkHref && linkHref.startsWith('http') 
        ? linkHref 
        : linkHref 
          ? `https://www.autotrader.ca${linkHref}` 
          : '';
      
      // Only add if we have minimum required data
      if (title && year > 0) {
        const vehicle: Vehicle = {
          id,
          vin: '',
          year,
          make,
          model,
          trim: '',
          mileage,
          color: '',
          engine: '',
          transmission: '',
          blackBookValue: 0,
          yourCost: 0,
          suggestedPrice: price,
          inStock: true,
          imageUrl: '',
          imageUrls: []
        };
        
        vehicles.push(vehicle);
      }
    });
    
    logger.info(`[AutoTrader-HTTP] Scraped ${vehicles.length} vehicles`);
    return vehicles;
    
  } catch (error: any) {
    logger.error('[AutoTrader-HTTP] Scrape failed:', error.message);
    throw error;
  }
}

function buildAutoTraderURL(params: AutoTraderParams): string {
  const base = 'https://www.autotrader.ca/cars';
  const queryParams = new URLSearchParams();
  
  if (params.make) queryParams.append('make', params.make);
  if (params.model) queryParams.append('mdl', params.model);
  if (params.yearMin) queryParams.append('yRng', `${params.yearMin},${params.yearMax || ''}`);
  if (params.priceMin) queryParams.append('pRng', `${params.priceMin},${params.priceMax || ''}`);
  if (params.location) queryParams.append('loc', params.location);
  if (params.radius) queryParams.append('prx', params.radius.toString());
  
  queryParams.append('rcp', '100'); // Results per page
  queryParams.append('rcs', '0'); // Start index
  queryParams.append('srt', '35'); // Sort order
  queryParams.append('hprc', 'True'); // Has price
  queryParams.append('wcp', 'True'); // With car proof
  queryParams.append('sts', 'New-Used'); // New and used
  
  return `${base}?${queryParams.toString()}`;
}
