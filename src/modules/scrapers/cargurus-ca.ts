/**
 * CarGurus Canada Scraper
 * Scrapes CarGurus.ca for Canadian automotive market data and pricing
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Vehicle } from '../../types/types';
import logger from '../../utils/logger';

interface CarGurusSearchParams {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMax?: number;
  postalCode?: string;
  radius?: number;
  limit?: number;
}

interface CarGurusListing {
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
    rating?: number;
    reviewCount?: number;
  };
  images: string[];
  url: string;
  condition: 'new' | 'used';
  bodyStyle?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  exteriorColor?: string;
  interiorColor?: string;
  engine?: string;
  dealRating?: string;
  daysOnMarket?: number;
  priceAnalysis?: {
    isGoodDeal: boolean;
    dealRating: string;
    priceVsMarket: number;
  };
}

export async function scrapeCarGurusCA(params: CarGurusSearchParams): Promise<CarGurusListing[]> {
  try {
    const searchUrl = buildSearchUrl(params);
    logger.info('Scraping CarGurus.ca', { url: searchUrl, params });
    
    const html = await fetchWithRetry(searchUrl);
    const listings = parseListings(html);
    
    logger.info('CarGurus.ca scrape complete', { 
      found: listings.length,
      limit: params.limit 
    });
    
    return listings.slice(0, params.limit || 50);
  } catch (error: any) {
    logger.error('CarGurus.ca scrape failed', { error: error.message });
    throw error;
  }
}

function buildSearchUrl(params: CarGurusSearchParams): string {
  const baseUrl = 'https://www.cargurus.ca/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action';
  const urlParams = new URLSearchParams();
  
  urlParams.append('sourceContext', 'carGurusHomePageModel');
  urlParams.append('entitySelectingHelper.selectedEntity', 'c26705');
  
  if (params.make) {
    urlParams.append('makeId', getMakeId(params.make));
  }
  
  if (params.model) {
    urlParams.append('modelId', getModelId(params.model));
  }
  
  if (params.yearMin) {
    urlParams.append('startYear', params.yearMin.toString());
  }
  
  if (params.yearMax) {
    urlParams.append('endYear', params.yearMax.toString());
  }
  
  if (params.priceMin) {
    urlParams.append('minPrice', params.priceMin.toString());
  }
  
  if (params.priceMax) {
    urlParams.append('maxPrice', params.priceMax.toString());
  }
  
  if (params.mileageMax) {
    urlParams.append('maxMileage', params.mileageMax.toString());
  }
  
  if (params.postalCode) {
    urlParams.append('zip', params.postalCode);
  }
  
  if (params.radius) {
    urlParams.append('distance', params.radius.toString());
  } else {
    urlParams.append('distance', '250');
  }
  
  urlParams.append('sortType', 'DEAL_SCORE');
  urlParams.append('sortDirection', 'DESC');
  
  return `${baseUrl}?${urlParams.toString()}`;
}

function getMakeId(make: string): string {
  const makeMap: Record<string, string> = {
    'honda': 'm13',
    'toyota': 'm20',
    'ford': 'm11',
    'chevrolet': 'm4',
    'nissan': 'm15',
    'mazda': 'm14',
    'hyundai': 'm12',
    'kia': 'm49',
    'volkswagen': 'm23',
    'bmw': 'm3',
    'mercedes-benz': 'm29',
    'audi': 'm2',
    'lexus': 'm48',
    'acura': 'm1',
    'subaru': 'm19',
    'jeep': 'm47',
    'ram': 'm60',
    'gmc': 'm59',
    'dodge': 'm9',
    'chrysler': 'm5',
  };
  
  const normalized = make.toLowerCase().replace(/[^a-z]/g, '');
  return makeMap[normalized] || 'm0';
}

function getModelId(model: string): string {
  return 'd0';
}

async function fetchWithRetry(url: string, maxRetries: number = 3): Promise<string> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8,fr-CA;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
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

function parseListings(html: string): CarGurusListing[] {
  const $ = cheerio.load(html);
  const listings: CarGurusListing[] = [];
  
  $('.cg-dealFinder-result, .listing-row, [data-cg-ft="car-blade"]').each((index, element) => {
    try {
      const $item = $(element);
      
      const listingId = $item.attr('data-listing-id') || 
                       $item.attr('id') || 
                       `cargurus-${index}`;
      
      const titleText = $item.find('.cg-dealFinder-result-model, .listing-title, h4, h3').first().text().trim();
      const { year, make, model, trim } = parseTitle(titleText);
      
      const priceText = $item.find('.cg-dealFinder-result-price, .price-section, [class*="price"]').first().text().trim();
      const price = parsePrice(priceText);
      
      const mileageText = $item.find('.cg-dealFinder-result-stats, .mileage, [class*="mileage"]').first().text().trim();
      const mileage = parseMileage(mileageText);
      
      const dealerName = $item.find('.cg-dealFinder-result-dealer, .dealer-name, [class*="dealer"]').first().text().trim() || 'Unknown Dealer';
      const dealerLocation = $item.find('.cg-dealFinder-result-location, .dealer-location, [class*="location"]').first().text().trim() || '';
      
      const dealerRatingText = $item.find('.dealer-rating, [class*="rating"]').first().text().trim();
      const dealerRating = parseFloat(dealerRatingText) || undefined;
      
      const reviewCountText = $item.find('.review-count, [class*="review"]').first().text().trim();
      const reviewCount = parseInt(reviewCountText.replace(/[^0-9]/g, '')) || undefined;
      
      const imageUrl = $item.find('img').first().attr('src') || 
                      $item.find('img').first().attr('data-src') || 
                      $item.find('img').first().attr('data-cg-src') || 
                      '';
      
      const relativeUrl = $item.find('a').first().attr('href') || '';
      const absoluteUrl = relativeUrl.startsWith('http') 
        ? relativeUrl 
        : `https://www.cargurus.ca${relativeUrl}`;
      
      const dealRatingText = $item.find('.deal-rating, .deal-badge, [class*="deal"]').first().text().trim();
      const isGoodDeal = dealRatingText.toLowerCase().includes('good') || 
                        dealRatingText.toLowerCase().includes('great') ||
                        dealRatingText.toLowerCase().includes('fair');
      
      const transmission = $item.find('[class*="transmission"]').first().text().trim();
      const bodyStyle = $item.find('[class*="body"]').first().text().trim();
      const drivetrain = $item.find('[class*="drivetrain"], [class*="drive"]').first().text().trim();
      const fuelType = $item.find('[class*="fuel"]').first().text().trim();
      const exteriorColor = $item.find('[class*="exterior"], [class*="color"]').first().text().trim();
      const engine = $item.find('[class*="engine"]').first().text().trim();
      
      const daysOnMarketText = $item.find('[class*="days"], [class*="listed"]').first().text().trim();
      const daysOnMarket = parseInt(daysOnMarketText.replace(/[^0-9]/g, '')) || undefined;
      
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
            rating: dealerRating,
            reviewCount: reviewCount,
          },
          images: imageUrl ? [imageUrl] : [],
          url: absoluteUrl,
          condition: year >= new Date().getFullYear() - 1 ? 'new' : 'used',
          bodyStyle: bodyStyle || undefined,
          transmission: transmission || undefined,
          drivetrain: drivetrain || undefined,
          fuelType: fuelType || undefined,
          exteriorColor: exteriorColor || undefined,
          engine: engine || undefined,
          dealRating: dealRatingText || undefined,
          daysOnMarket: daysOnMarket,
          priceAnalysis: dealRatingText ? {
            isGoodDeal,
            dealRating: dealRatingText,
            priceVsMarket: 0,
          } : undefined,
        });
      }
    } catch (error: any) {
      logger.warn('Failed to parse CarGurus listing', { error: error.message, index });
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

export function convertToVehicle(listing: CarGurusListing): Vehicle {
  return {
    id: listing.id,
    vin: listing.vin || '',
    year: listing.year,
    make: listing.make,
    model: listing.model,
    trim: listing.trim || '',
    mileage: listing.mileage,
    color: listing.exteriorColor,
    engine: listing.engine || 'Unknown',
    transmission: listing.transmission || 'Unknown',
    blackBookValue: 0,
    yourCost: 0,
    suggestedPrice: listing.price,
    inStock: true,
    imageUrl: listing.images[0],
    imageUrls: listing.images,
  };
}

export async function searchMarketData(
  year: number,
  make: string,
  model: string,
  radius: number = 250,
  postalCode: string = 'T5J'
): Promise<{ 
  average: number; 
  min: number; 
  max: number; 
  count: number; 
  goodDeals: number;
  listings: CarGurusListing[] 
}> {
  try {
    const listings = await scrapeCarGurusCA({
      make,
      model,
      yearMin: year,
      yearMax: year,
      postalCode,
      radius,
      limit: 50,
    });
    
    if (listings.length === 0) {
      return { average: 0, min: 0, max: 0, count: 0, goodDeals: 0, listings: [] };
    }
    
    const prices = listings.map(l => l.price).filter(p => p > 0);
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const goodDeals = listings.filter(l => l.priceAnalysis?.isGoodDeal).length;
    
    return {
      average: Math.round(average),
      min,
      max,
      count: listings.length,
      goodDeals,
      listings,
    };
  } catch (error: any) {
    logger.error('CarGurus market data search failed', { error: error.message });
    throw error;
  }
}

export async function compareWithMarket(
  year: number,
  make: string,
  model: string,
  yourPrice: number,
  radius: number = 250,
  postalCode: string = 'T5J'
): Promise<{
  yourPrice: number;
  marketAverage: number;
  difference: number;
  percentageDifference: number;
  isCompetitive: boolean;
  ranking: string;
  totalListings: number;
  betterDeals: number;
  worseDeals: number;
}> {
  try {
    const marketData = await searchMarketData(year, make, model, radius, postalCode);
    
    if (marketData.count === 0) {
      return {
        yourPrice,
        marketAverage: 0,
        difference: 0,
        percentageDifference: 0,
        isCompetitive: false,
        ranking: 'No market data available',
        totalListings: 0,
        betterDeals: 0,
        worseDeals: 0,
      };
    }
    
    const difference = yourPrice - marketData.average;
    const percentageDifference = (difference / marketData.average) * 100;
    const isCompetitive = yourPrice <= marketData.average;
    
    const betterDeals = marketData.listings.filter(l => l.price < yourPrice).length;
    const worseDeals = marketData.listings.filter(l => l.price > yourPrice).length;
    
    let ranking = 'Average';
    if (percentageDifference <= -10) ranking = 'Excellent Deal';
    else if (percentageDifference <= -5) ranking = 'Good Deal';
    else if (percentageDifference <= 0) ranking = 'Fair Deal';
    else if (percentageDifference <= 5) ranking = 'Slightly Above Market';
    else if (percentageDifference <= 10) ranking = 'Above Market';
    else ranking = 'Well Above Market';
    
    return {
      yourPrice,
      marketAverage: marketData.average,
      difference: Math.round(difference),
      percentageDifference: Math.round(percentageDifference * 100) / 100,
      isCompetitive,
      ranking,
      totalListings: marketData.count,
      betterDeals,
      worseDeals,
    };
  } catch (error: any) {
    logger.error('Market comparison failed', { error: error.message });
    throw error;
  }
}
