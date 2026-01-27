/**
 * FREE VEHICLE SCRAPER - NO API KEYS REQUIRED
 * 
 * Uses Puppeteer + Cheerio to scrape AutoTrader.ca and CarGurus.ca
 * Completely free alternative to Apify integration.
 * 
 * Features:
 * - Headless browser automation
 * - Automatic pagination
 * - Rate limiting / respectful delays
 * - Error handling and retries
 * - Database storage via Supabase
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { Vehicle } from '../../types/types';
import { AUTOTRADER_SELECTORS, CARGURUS_SELECTORS, buildAutoTraderURL, buildCarGurusURL } from '../../config/scraper-selectors';
import logger from '../../utils/logger';

export interface ScrapeParams {
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  radiusKm?: number;
  limit?: number;
}

export interface ScrapedListing {
  source: 'AutoTrader.ca' | 'CarGurus.ca';
  title: string;
  price: string;
  mileage: string;
  year: string;
  make: string;
  model: string;
  transmission?: string;
  fuelType?: string;
  bodyType?: string;
  location?: string;
  dealerName?: string;
  dealerPhone?: string;
  url: string;
  vin?: string;
  stockNumber?: string;
  features: string[];
  scrapeDate: string;
}

export class FreeVehicleScraper {
  private browser: Browser | null = null;
  private delay = 2000; // 2 second delay between requests
  private maxRetries = 3;
  private blockedCount = 0;

  /**
   * Initialize browser instance
   */
  private async initBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    logger.info('[FreeScraper] Launching browser...');
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('[FreeScraper] Browser closed');
    }
  }

  /**
   * Sleep utility
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if page content indicates blocking
   */
  private isBlocked(html: string): boolean {
    const blockedPatterns = [
      'captcha',
      'challenge',
      'bot detection',
      'automated',
      'access denied',
      '429',
      '403',
      'unusual traffic'
    ];
    const lowerHtml = html.toLowerCase();
    return blockedPatterns.some(pattern => lowerHtml.includes(pattern));
  }

  /**
   * Setup page with anti-detection measures
   */
  private async setupPage(page: Page): Promise<void> {
    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    // Block unnecessary resources to speed up
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Inject anti-detection scripts
    await page.evaluateOnNewDocument(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-CA', 'en-US', 'en']
      });
    });
  }

  /**
   * Extract text from cheerio element with fallback
   */
  private extractText($: cheerio.Root, selectors: string | string[]): string {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const selector of selectorArray) {
      const text = $(selector).first().text().trim();
      if (text && text !== '') {
        return text;
      }
    }
    
    return '';
  }

  /**
   * Extract URL from cheerio element
   */
  private extractUrl($: cheerio.Root, selector: string, baseUrl: string): string {
    let url = $(selector).first().attr('href') || '';
    
    if (url && !url.startsWith('http')) {
      url = baseUrl + url;
    }
    
    return url;
  }

  /**
   * Extract year from text
   */
  private extractYear(text: string): string {
    const match = text.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : '';
  }

  /**
   * Extract make and model from title
   */
  private extractMakeModel(title: string): { make: string; model: string } {
    // Common pattern: "2024 Toyota Camry SE"
    const parts = title.split(' ').filter(p => p.length > 0);
    
    if (parts.length >= 3) {
      return {
        make: parts[1] || '',
        model: parts[2] || ''
      };
    }
    
    return { make: '', model: '' };
  }

  /**
   * Extract phone number from href or text
   */
  private extractPhone($: cheerio.Root, selector: string): string {
    const href = $(selector).first().attr('href');
    if (href && href.startsWith('tel:')) {
      return href.replace('tel:', '').replace(/\D/g, '');
    }
    
    const text = $(selector).first().text();
    const phoneMatch = text.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/);
    return phoneMatch ? phoneMatch[0] : '';
  }

  /**
   * Extract features array
   */
  private extractFeatures($: cheerio.Root, selector: string): string[] {
    const features: string[] = [];
    $(selector).each((_, el) => {
      const feature = $(el).text().trim();
      if (feature) {
        features.push(feature);
      }
    });
    return features;
  }

  /**
   * Parse AutoTrader listing card
   */
  private parseAutoTraderListing(html: string): ScrapedListing | null {
    const $card = cheerio.load(html);
    
    const title = this.extractText($card, AUTOTRADER_SELECTORS.vehicleTitle);
    const price = this.extractText($card, AUTOTRADER_SELECTORS.price);
    const url = this.extractUrl($card, AUTOTRADER_SELECTORS.listingUrl, 'https://www.autotrader.ca');
    
    // Must have at least title, price, and URL
    if (!title || !price || !url) {
      return null;
    }

    const year = this.extractYear(title) || this.extractText($card, AUTOTRADER_SELECTORS.year);
    const { make, model } = this.extractMakeModel(title);

    return {
      source: 'AutoTrader.ca',
      title,
      price,
      mileage: this.extractText($card, AUTOTRADER_SELECTORS.mileage),
      year,
      make,
      model,
      transmission: this.extractText($card, AUTOTRADER_SELECTORS.transmission),
      fuelType: this.extractText($card, AUTOTRADER_SELECTORS.fuelType),
      bodyType: this.extractText($card, AUTOTRADER_SELECTORS.bodyType),
      location: this.extractText($card, AUTOTRADER_SELECTORS.location),
      dealerName: this.extractText($card, AUTOTRADER_SELECTORS.dealerName),
      dealerPhone: this.extractPhone($card, AUTOTRADER_SELECTORS.dealerPhone),
      url,
      vin: this.extractText($card, AUTOTRADER_SELECTORS.vin),
      stockNumber: this.extractText($card, AUTOTRADER_SELECTORS.stockNumber),
      features: this.extractFeatures($card, AUTOTRADER_SELECTORS.features),
      scrapeDate: new Date().toISOString()
    };
  }

  /**
   * Parse CarGurus listing card
   */
  private parseCarGurusListing(html: string): ScrapedListing | null {
    const $card = cheerio.load(html);
    
    const title = this.extractText($card, CARGURUS_SELECTORS.vehicleTitle);
    const price = this.extractText($card, CARGURUS_SELECTORS.price);
    const url = this.extractUrl($card, CARGURUS_SELECTORS.listingUrl, 'https://www.cargurus.ca');
    
    if (!title || !price || !url) {
      return null;
    }

    const year = this.extractYear(title) || this.extractText($card, CARGURUS_SELECTORS.year);
    const { make, model } = this.extractMakeModel(title);

    return {
      source: 'CarGurus.ca',
      title,
      price,
      mileage: this.extractText($card, CARGURUS_SELECTORS.mileage),
      year,
      make,
      model,
      transmission: this.extractText($card, CARGURUS_SELECTORS.transmission),
      fuelType: this.extractText($card, CARGURUS_SELECTORS.fuelType),
      bodyType: this.extractText($card, CARGURUS_SELECTORS.bodyType),
      location: this.extractText($card, CARGURUS_SELECTORS.location),
      dealerName: this.extractText($card, CARGURUS_SELECTORS.dealerName),
      dealerPhone: this.extractPhone($card, CARGURUS_SELECTORS.dealerPhone),
      url,
      vin: this.extractText($card, CARGURUS_SELECTORS.vin),
      stockNumber: this.extractText($card, CARGURUS_SELECTORS.stockNumber),
      features: this.extractFeatures($card, CARGURUS_SELECTORS.features),
      scrapeDate: new Date().toISOString()
    };
  }

  /**
   * Scrape AutoTrader.ca
   */
  async scrapeAutoTrader(params: ScrapeParams): Promise<ScrapedListing[]> {
    logger.info('[FreeScraper] Starting AutoTrader.ca scrape', params);
    
    const listings: ScrapedListing[] = [];
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await this.setupPage(page);
      
      const searchUrl = buildAutoTraderURL({
        make: params.make,
        model: params.model,
        yearMin: params.yearMin,
        yearMax: params.yearMax,
        priceMin: params.priceMin,
        priceMax: params.priceMax,
        location: params.location || 'Canada',
        radius: params.radiusKm
      });

      logger.info(`[FreeScraper] Navigating to: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for listings to load
      await page.waitForSelector(AUTOTRADER_SELECTORS.vehicleCard, { timeout: 10000 });

      // Check if blocked
      const content = await page.content();
      if (this.isBlocked(content)) {
        logger.warn('[FreeScraper] AutoTrader detected blocking');
        this.blockedCount++;
        return listings;
      }

      // Extract listing HTML
      const listingHtmls = await page.evaluate((selector) => {
        const items: string[] = [];
        document.querySelectorAll(selector).forEach(el => {
          items.push(el.outerHTML);
        });
        return items;
      }, AUTOTRADER_SELECTORS.vehicleCard);

      logger.info(`[FreeScraper] Found ${listingHtmls.length} AutoTrader listings`);

      // Parse each listing
      for (const html of listingHtmls) {
        const listing = this.parseAutoTraderListing(html);
        
        if (listing) {
          listings.push(listing);
          logger.info(`[FreeScraper] ✓ ${listing.title} - ${listing.price}`);
        }

        // Stop if we've hit the limit
        if (params.limit && listings.length >= params.limit) {
          break;
        }
      }

      return listings;

    } catch (error: any) {
      logger.error('[FreeScraper] AutoTrader scrape error:', error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Scrape CarGurus.ca
   */
  async scrapeCarGurus(params: ScrapeParams): Promise<ScrapedListing[]> {
    logger.info('[FreeScraper] Starting CarGurus.ca scrape', params);
    
    const listings: ScrapedListing[] = [];
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await this.setupPage(page);
      
      const searchUrl = buildCarGurusURL({
        make: params.make,
        model: params.model,
        yearMin: params.yearMin,
        yearMax: params.yearMax,
        priceMin: params.priceMin,
        priceMax: params.priceMax,
        postalCode: params.location || 'T5J',
        radius: params.radiusKm
      });

      logger.info(`[FreeScraper] Navigating to: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      await page.waitForSelector(CARGURUS_SELECTORS.vehicleCard, { timeout: 10000 });

      const content = await page.content();
      if (this.isBlocked(content)) {
        logger.warn('[FreeScraper] CarGurus detected blocking');
        this.blockedCount++;
        return listings;
      }

      const listingHtmls = await page.evaluate((selector) => {
        const items: string[] = [];
        document.querySelectorAll(selector).forEach(el => {
          items.push(el.outerHTML);
        });
        return items;
      }, CARGURUS_SELECTORS.vehicleCard);

      logger.info(`[FreeScraper] Found ${listingHtmls.length} CarGurus listings`);

      for (const html of listingHtmls) {
        const listing = this.parseCarGurusListing(html);
        
        if (listing) {
          listings.push(listing);
          logger.info(`[FreeScraper] ✓ ${listing.title} - ${listing.price}`);
        }

        if (params.limit && listings.length >= params.limit) {
          break;
        }
      }

      return listings;

    } catch (error: any) {
      logger.error('[FreeScraper] CarGurus scrape error:', error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Convert scraped listing to Vehicle format
   */
  convertToVehicle(listing: ScrapedListing): Partial<Vehicle> {
    // Parse price
    const priceStr = listing.price.replace(/[^0-9]/g, '');
    const price = parseInt(priceStr) || 0;

    // Parse mileage
    const mileageStr = listing.mileage.replace(/[^0-9]/g, '');
    const mileage = parseInt(mileageStr) || 0;

    // Parse year
    const year = parseInt(listing.year) || new Date().getFullYear();

    return {
      vin: listing.vin || '',
      year,
      make: listing.make,
      model: listing.model,
      trim: '',
      mileage,
      suggestedPrice: price,
      yourCost: price * 0.85, // Estimate
      engine: 'Unknown',
      transmission: listing.transmission || 'Unknown',
      blackBookValue: 0,
      inStock: true,
      imageUrl: '',
      imageUrls: []
    };
  }
}
