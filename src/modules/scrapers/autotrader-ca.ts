/**
 * AutoTrader.ca Scraper
 * Scrapes Canadian automotive marketplace for competitor pricing and inventory
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Vehicle } from '../../types/types';
import logger from '../../utils/logger';

interface AutoTraderSearchParams {
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

interface AutoTraderListing {
  id: string;
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  price: number;
  dealer: {
    name: string;
    location: string;
    phone?: string;
  };
  images: string[];
  url: string;
  condition: 'new' | 'used';
  bodyType?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  exteriorColor?: string;
  interiorColor?: string;
}

export async function scrapeAutoTraderCA(params: AutoTraderSearchParams): Promise<AutoTraderListing[]> {
  try {
    const searchUrl = buildSearchUrl(params);
    logger.info('Scraping AutoTrader.ca', { url: searchUrl, params });
    
    const html = await fetchWithRetry(searchUrl);
    const listings = parseListings(html);
    
    logger.info('AutoTrader.ca scrape complete', { 
      found: listings.length,
      limit: params.limit 
    });
    
    return listings.slice(0, params.limit || 50);
  } catch (error: any) {
    logger.error('AutoTrader.ca scrape failed', { error: error.message });
    throw error;
  }
}

function buildSearchUrl(params: AutoTraderSearchParams): string {
  const baseUrl = 'https://www.autotrader.ca/cars';
  const urlParams = new URLSearchParams();
  
  if (params.make) {
    urlParams.append('make', params.make);
  }
  
  if (params.model) {
    urlParams.append('model', params.model);
  }
  
  if (params.yearMin) {
    urlParams.append('priceMin', params.yearMin.toString());
  }
  
  if (params.yearMax) {
    urlParams.append('priceMax', params.yearMax.toString());
  }
  
  if (params.priceMin) {
    urlParams.append('priceMin', params.priceMin.toString());
  }
  
  if (params.priceMax) {
    urlParams.append('priceMax', params.priceMax.toString());
  }
  
  if (params.location) {
    urlParams.append('loc', params.location);
  }
  
  if (params.radius) {
    urlParams.append('rcp', params.radius.toString());
  }
  
  urlParams.append('rcs', '0');
  urlParams.append('srt', '35');
  urlParams.append('prx', '-1');
  
  const queryString = urlParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

async function fetchWithRetry(url: string, maxRetries: number = 3): Promise<string> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 30000,
        maxRedirects: 5,
      });
      
      return response.data;
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

function parseListings(html: string): AutoTraderListing[] {
  const $ = cheerio.load(html);
  const listings: AutoTraderListing[] = [];
  
  $('.result-item, .listing-item, [data-listing-id]').each((index, element) => {
    try {
      const $item = $(element);
      
      const listingId = $item.attr('data-listing-id') || 
                       $item.attr('id') || 
                       `listing-${index}`;
      
      const titleText = $item.find('.title, .listing-title, h2, h3').first().text().trim();
      const { year, make, model, trim } = parseTitle(titleText);
      
      const priceText = $item.find('.price, .listing-price, [class*="price"]').first().text().trim();
      const price = parsePrice(priceText);
      
      const mileageText = $item.find('.kms, .mileage, [class*="mileage"], [class*="odometer"]').first().text().trim();
      const mileage = parseMileage(mileageText);
      
      const dealerName = $item.find('.dealer-name, .seller-name, [class*="dealer"]').first().text().trim() || 'Unknown Dealer';
      const dealerLocation = $item.find('.dealer-location, .location, [class*="location"]').first().text().trim() || '';
      
      const imageUrl = $item.find('img').first().attr('src') || 
                      $item.find('img').first().attr('data-src') || 
                      '';
      
      const relativeUrl = $item.find('a').first().attr('href') || '';
      const absoluteUrl = relativeUrl.startsWith('http') 
        ? relativeUrl 
        : `https://www.autotrader.ca${relativeUrl}`;
      
      const transmission = $item.find('[class*="transmission"]').first().text().trim();
      const bodyType = $item.find('[class*="body"]').first().text().trim();
      const drivetrain = $item.find('[class*="drivetrain"], [class*="drive"]').first().text().trim();
      const fuelType = $item.find('[class*="fuel"]').first().text().trim();
      const exteriorColor = $item.find('[class*="exterior"], [class*="color"]').first().text().trim();
      
      if (year && make && model && price > 0) {
        listings.push({
          id: listingId,
          year,
          make,
          model,
          trim,
          mileage,
          price,
          dealer: {
            name: dealerName,
            location: dealerLocation,
          },
          images: imageUrl ? [imageUrl] : [],
          url: absoluteUrl,
          condition: year >= new Date().getFullYear() - 1 ? 'new' : 'used',
          bodyType: bodyType || undefined,
          transmission: transmission || undefined,
          drivetrain: drivetrain || undefined,
          fuelType: fuelType || undefined,
          exteriorColor: exteriorColor || undefined,
        });
      }
    } catch (error: any) {
      logger.warn('Failed to parse listing', { error: error.message, index });
    }
  });
  
  return listings;
}

function parseTitle(title: string): { year: number; make: string; model: string; trim?: string } {
  const yearMatch = title.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : 0;
  
  const parts = title.split(/\s+/).filter(p => p.length > 0);
  const yearIndex = parts.findIndex(p => /^(19|20)\d{2}$/.test(p));
  
  let make = '';
  let model = '';
  let trim = '';
  
  if (yearIndex >= 0 && parts.length > yearIndex + 1) {
    make = parts[yearIndex + 1] || '';
    model = parts[yearIndex + 2] || '';
    trim = parts.slice(yearIndex + 3).join(' ');
  } else if (parts.length >= 2) {
    make = parts[0];
    model = parts[1];
    trim = parts.slice(2).join(' ');
  }
  
  return { year, make, model, trim };
}

function parsePrice(priceText: string): number {
  const cleaned = priceText.replace(/[^0-9]/g, '');
  const price = parseInt(cleaned);
  return isNaN(price) ? 0 : price;
}

function parseMileage(mileageText: string): number {
  const cleaned = mileageText.replace(/[^0-9]/g, '');
  const mileage = parseInt(cleaned);
  return isNaN(mileage) ? 0 : mileage;
}

export function convertToVehicle(listing: AutoTraderListing): Vehicle {
  return {
    id: listing.id,
    vin: listing.vin || '',
    year: listing.year,
    make: listing.make,
    model: listing.model,
    trim: listing.trim || '',
    mileage: listing.mileage,
    color: listing.exteriorColor,
    engine: 'Unknown',
    transmission: listing.transmission || 'Unknown',
    cbbWholesale: 0,
    cbbRetail: 0,
    yourCost: 0,
    suggestedPrice: listing.price,
    inStock: true,
    imageUrl: listing.images[0],
    imageUrls: listing.images,
    blackBookValue: undefined,
  };
}

export async function searchCompetitorPricing(
  year: number,
  make: string,
  model: string,
  radius: number = 250,
  location: string = 'Alberta'
): Promise<{ average: number; min: number; max: number; count: number; listings: AutoTraderListing[] }> {
  try {
    const listings = await scrapeAutoTraderCA({
      make,
      model,
      yearMin: year,
      yearMax: year,
      location,
      radius,
      limit: 50,
    });
    
    if (listings.length === 0) {
      return { average: 0, min: 0, max: 0, count: 0, listings: [] };
    }
    
    const prices = listings.map(l => l.price).filter(p => p > 0);
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    return {
      average: Math.round(average),
      min,
      max,
      count: listings.length,
      listings,
    };
  } catch (error: any) {
    logger.error('Competitor pricing search failed', { error: error.message });
    throw error;
  }
}
