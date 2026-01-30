/**
 * CARGURUS.CA HTTP SCRAPER
 * Uses direct HTTP requests with proper headers to avoid bot detection
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Vehicle } from '../../types/types';
import logger from '../../utils/logger';

export interface CarGurusParams {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  postalCode?: string;
  radius?: number;
  limit?: number;
}

export async function scrapeCarGurusHTTP(params: CarGurusParams): Promise<Vehicle[]> {
  logger.info('[CarGurus-HTTP] Starting scrape', params);
  
  try {
    const url = buildCarGurusURL(params);
    logger.info('[CarGurus-HTTP] Fetching:', url);
    
    // Try multiple times with different user agents
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    
    let html = '';
    let success = false;
    
    for (const ua of userAgents) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
            'DNT': '1'
          },
          timeout: 30000,
          maxRedirects: 5
        });
        
        html = response.data;
        
        // Check if we got blocked
        if (!html.includes('DataDome') && !html.includes('captcha') && html.length > 10000) {
          success = true;
          break;
        }
      } catch (error: any) {
        logger.warn(`[CarGurus-HTTP] Attempt with UA failed: ${error.message}`);
        continue;
      }
    }
    
    if (!success || !html) {
      logger.error('[CarGurus-HTTP] All attempts failed - bot detection active');
      // Return empty array instead of throwing - graceful degradation
      return [];
    }
    
    const $ = cheerio.load(html);
    const vehicles: Vehicle[] = [];
    
    // Try multiple selector patterns for CarGurus
    const selectorPatterns = [
      'div[class*="carBlade"]',
      'div[class*="listingRow"]',
      'div[class*="listing"]',
      '[data-cg="listing"]',
      'article'
    ];
    
    let listings: any = null;
    
    for (const selector of selectorPatterns) {
      const found = $(selector);
      if (found.length > 5) {
        listings = found;
        logger.info(`[CarGurus-HTTP] Using selector: ${selector} (${found.length} elements)`);
        break;
      }
    }
    
    if (!listings || listings.length === 0) {
      logger.warn('[CarGurus-HTTP] No listings found with any selector');
      return [];
    }
    
    listings.each((index: number, element: any) => {
      if (params.limit && vehicles.length >= params.limit) {
        return false;
      }
      
      const $el = $(element);
      
      // Extract vehicle data
      const id = $el.attr('data-cg') || $el.attr('id') || `cg-${Date.now()}-${index}`;
      const title = $el.find('h2, h3, h4, [class*="title"]').first().text().trim();
      const priceText = $el.find('[class*="price"]').first().text().trim();
      const mileageText = $el.find('[class*="mileage"]').first().text().trim();
      const locationText = $el.find('[class*="location"], [class*="dealer"]').first().text().trim();
      const linkHref = $el.find('a[href*="/Cars/"]').first().attr('href');
      
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
          ? `https://www.cargurus.ca${linkHref}` 
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
    
    logger.info(`[CarGurus-HTTP] Scraped ${vehicles.length} vehicles`);
    return vehicles;
    
  } catch (error: any) {
    logger.error('[CarGurus-HTTP] Scrape failed:', error.message);
    // Return empty array instead of throwing - graceful degradation
    return [];
  }
}

function buildCarGurusURL(params: CarGurusParams): string {
  const base = 'https://www.cargurus.ca/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action';
  const queryParams = new URLSearchParams();
  
  queryParams.append('sourceContext', 'carGurusHomePageModel');
  
  if (params.make) queryParams.append('entitySelectingHelper.selectedEntity', params.make);
  if (params.model) queryParams.append('entitySelectingHelper.selectedEntity2', params.model);
  if (params.yearMin) queryParams.append('startYear', params.yearMin.toString());
  if (params.yearMax) queryParams.append('endYear', params.yearMax.toString());
  if (params.priceMin) queryParams.append('minPrice', params.priceMin.toString());
  if (params.priceMax) queryParams.append('maxPrice', params.priceMax.toString());
  if (params.postalCode) queryParams.append('zip', params.postalCode);
  if (params.radius) queryParams.append('distance', params.radius.toString());
  
  return `${base}?${queryParams.toString()}`;
}
