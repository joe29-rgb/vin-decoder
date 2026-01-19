/**
 * PRODUCTION DEALERSHIP SCRAPER
 * Implements all 7 critical fixes for robust, reliable vehicle data extraction
 * 
 * Fixes implemented:
 * 1. Pagination handling (query string, offset, next-link detection)
 * 2. Adjusted quality filtering (threshold 50, gradual scoring)
 * 3. Proper VIN check digit validation
 * 4. 6-layer extraction fallback strategy
 * 5. Smart image filtering
 * 6. Optimized timeouts (HTTP-first, 30s nav, 15s request)
 * 7. Stealth bot detection bypass
 */

import axios from 'axios';
import { load as cheerioLoad } from 'cheerio';
import { Vehicle } from '../types/types';

interface ScraperConfig {
  baseUrl: string;
  maxPages?: number;
  minScore?: number;
  headless?: boolean;
  useCache?: boolean;
}

interface PaginationPattern {
  type: 'query' | 'offset' | 'path' | 'next-link' | 'none';
  param?: string;
  pageSize?: number;
}

interface DataQualityScore {
  score: number;
  hasCriticalFields: boolean;
  missingFields: string[];
}

class ProductionDealershipScraper {
  private config: ScraperConfig;
  private allVehicles: Vehicle[] = [];
  private browser: any = null;
  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  ];

  constructor(config: ScraperConfig) {
    this.config = {
      maxPages: 10,
      minScore: 50,
      headless: true,
      useCache: true,
      ...config,
    };
  }

  /**
   * Main scraping method - orchestrates the entire process
   */
  async scrapeInventory(): Promise<Vehicle[]> {
    console.log(`[SCRAPER] Starting scrape of ${this.config.baseUrl}`);
    const startTime = Date.now();

    try {
      // STEP 1: Detect pagination pattern
      const paginationPattern = await this.detectPagination();
      console.log(`[SCRAPER] Detected pagination: ${paginationPattern.type}`);

      // STEP 2: Fetch all pages with pagination
      await this.fetchAllPages(paginationPattern);
      console.log(`[SCRAPER] Fetched ${this.allVehicles.length} total vehicles`);

      // STEP 3: Filter by quality score (adjusted thresholds)
      const filtered = this.filterByQuality();
      console.log(`[SCRAPER] Filtered to ${filtered.length} quality vehicles`);

      // STEP 4: Validate and enrich data
      const validated = this.validateVehicles(filtered);
      console.log(`[SCRAPER] Final validated count: ${validated.length}`);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[SCRAPER] Scrape completed in ${duration}s`);

      return validated;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * FIX #1: Detect pagination pattern from the listing page
   */
  private async detectPagination(): Promise<PaginationPattern> {
    try {
      const html = await this.fetchHtmlFast(this.config.baseUrl);
      const $ = cheerioLoad(html);

      // Look for pagination indicators
      const pageLinks = $('a[href*="page"], a[href*="offset"], a[href*="start"], a.next, a[rel="next"], .pagination a');

      if (pageLinks.length > 0) {
        const href = pageLinks.first().attr('href') || '';
        
        // Query string pagination
        if (href.includes('page=')) return { type: 'query', param: 'page' };
        if (href.includes('offset=')) return { type: 'query', param: 'offset', pageSize: 20 };
        if (href.includes('start=')) return { type: 'query', param: 'start', pageSize: 20 };
        
        // Path-based pagination
        if (/\/page\/\d+/.test(href)) return { type: 'path', param: 'page' };
        
        // Next-link pagination
        if (href.includes('next') || $('a[rel="next"]').length > 0) {
          return { type: 'next-link' };
        }
      }

      console.log('[SCRAPER] No pagination detected, single page scrape');
      return { type: 'none' };
    } catch (error) {
      console.error('[SCRAPER] Error detecting pagination:', error);
      return { type: 'none' };
    }
  }

  /**
   * FIX #1: Fetch all pages based on detected pagination pattern
   */
  private async fetchAllPages(pagination: PaginationPattern): Promise<void> {
    if (pagination.type === 'none') {
      const html = await this.fetchHtmlFast(this.config.baseUrl);
      const vehicles = await this.extractVehicles(html, this.config.baseUrl);
      this.allVehicles.push(...vehicles);
      return;
    }

    if (pagination.type === 'next-link') {
      await this.fetchWithNextLinks();
      return;
    }

    // Query string or path-based pagination
    for (let page = 1; page <= (this.config.maxPages || 10); page++) {
      const url = this.buildPaginatedUrl(page, pagination);
      console.log(`[SCRAPER] Fetching page ${page}: ${url}`);

      try {
        const html = await this.fetchHtmlFast(url);
        const vehicles = await this.extractVehicles(html, url);

        if (vehicles.length === 0) {
          console.log(`[SCRAPER] No vehicles on page ${page}, stopping pagination`);
          break;
        }

        this.allVehicles.push(...vehicles);

        // Respectful rate limiting with randomization
        await this.delay(500 + Math.random() * 500);
      } catch (error) {
        console.error(`[SCRAPER] Error on page ${page}:`, error);
        break;
      }
    }
  }

  /**
   * FIX #1: Fetch pages by following "next" links
   */
  private async fetchWithNextLinks(): Promise<void> {
    let currentUrl: string | null = this.config.baseUrl;
    let pageCount = 0;

    while (currentUrl && pageCount < (this.config.maxPages || 10)) {
      console.log(`[SCRAPER] Fetching page ${pageCount + 1}: ${currentUrl}`);

      try {
        const html = await this.fetchHtmlFast(currentUrl);
        const $ = cheerioLoad(html);

        // Extract vehicles from current page
        const vehicles = await this.extractVehicles(html, currentUrl);
        if (vehicles.length === 0) break;

        this.allVehicles.push(...vehicles);

        // Find next page link
        const nextLink = $('a[rel="next"], a.next, .pagination a:contains("Next")').first().attr('href');
        currentUrl = nextLink ? new URL(nextLink, currentUrl).href : null;

        pageCount++;
        await this.delay(500 + Math.random() * 500);
      } catch (error) {
        console.error(`[SCRAPER] Error following next link:`, error);
        break;
      }
    }
  }

  /**
   * Build paginated URL based on pattern
   */
  private buildPaginatedUrl(page: number, pagination: PaginationPattern): string {
    const url = new URL(this.config.baseUrl);

    if (pagination.type === 'query' && pagination.param) {
      if (pagination.param === 'offset' || pagination.param === 'start') {
        const offset = (page - 1) * (pagination.pageSize || 20);
        url.searchParams.set(pagination.param, offset.toString());
      } else {
        url.searchParams.set(pagination.param, page.toString());
      }
    } else if (pagination.type === 'path') {
      url.pathname = url.pathname.replace(/\/$/, '') + `/page/${page}`;
    }

    return url.toString();
  }

  /**
   * FIX #4: Extract vehicles using 6-layer fallback strategy
   */
  private async extractVehicles(html: string, baseUrl: string): Promise<Vehicle[]> {
    // Layer 1: JSON-LD structured data
    let vehicles = this.extractFromJsonLd(html, baseUrl);
    if (vehicles.length > 0) {
      console.log(`[SCRAPER] ✓ Extracted ${vehicles.length} from JSON-LD`);
      return vehicles;
    }

    // Layer 2: Open Graph meta tags
    vehicles = this.extractFromOpenGraph(html, baseUrl);
    if (vehicles.length > 0) {
      console.log(`[SCRAPER] ✓ Extracted ${vehicles.length} from Open Graph`);
      return vehicles;
    }

    // Layer 3: Microdata (Schema.org)
    vehicles = this.extractFromMicrodata(html, baseUrl);
    if (vehicles.length > 0) {
      console.log(`[SCRAPER] ✓ Extracted ${vehicles.length} from Microdata`);
      return vehicles;
    }

    // Layer 4: RDFa markup
    vehicles = this.extractFromRDFa(html, baseUrl);
    if (vehicles.length > 0) {
      console.log(`[SCRAPER] ✓ Extracted ${vehicles.length} from RDFa`);
      return vehicles;
    }

    // Layer 5: DOM parsing with multiple selector sets
    vehicles = this.extractFromDOM(html, baseUrl);
    if (vehicles.length > 0) {
      console.log(`[SCRAPER] ✓ Extracted ${vehicles.length} from DOM`);
      return vehicles;
    }

    // Layer 6: Regex-based extraction (last resort)
    vehicles = this.extractFromRegex(html, baseUrl);
    console.log(`[SCRAPER] ✓ Extracted ${vehicles.length} using regex patterns`);

    return vehicles;
  }

  /**
   * FIX #4 - Layer 1: Extract from JSON-LD
   */
  private extractFromJsonLd(html: string, baseUrl: string): Vehicle[] {
    const vehicles: Vehicle[] = [];
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = re.exec(html)) !== null) {
      try {
        const raw = match[1].trim();
        const parsed = JSON.parse(raw);
        const items = Array.isArray(parsed) ? parsed : [parsed];

        for (const item of items) {
          const type = item['@type'];
          if (type && (String(type).toLowerCase().includes('vehicle') || String(type).toLowerCase().includes('car'))) {
            const vehicle = this.normalizeVehicleFromJsonLd(item, baseUrl);
            if (vehicle) vehicles.push(vehicle);
          }
        }
      } catch (error) {
        // Try to recover malformed JSON
        try {
          const start = match[1].indexOf('{');
          const end = match[1].lastIndexOf('}');
          if (start >= 0 && end > start) {
            const frag = match[1].slice(start, end + 1);
            const parsed = JSON.parse(frag);
            const vehicle = this.normalizeVehicleFromJsonLd(parsed, baseUrl);
            if (vehicle) vehicles.push(vehicle);
          }
        } catch {}
      }
    }

    return vehicles;
  }

  /**
   * FIX #4 - Layer 2: Extract from Open Graph meta tags
   */
  private extractFromOpenGraph(html: string, baseUrl: string): Vehicle[] {
    const $ = cheerioLoad(html);
    const vehicle: Partial<Vehicle> = {};

    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogPrice = $('meta[property="og:price:amount"]').attr('content') || $('meta[property="product:price:amount"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogUrl = $('meta[property="og:url"]').attr('content');

    if (ogTitle) {
      const parsed = this.parseTitle(ogTitle);
      vehicle.year = parsed.year;
      vehicle.make = parsed.make;
      vehicle.model = parsed.model;
      vehicle.trim = parsed.trim;
    }

    if (ogPrice) {
      vehicle.suggestedPrice = parseFloat(ogPrice);
    }

    if (ogImage) {
      vehicle.imageUrl = ogImage;
      vehicle.imageUrls = [ogImage];
    }

    vehicle.id = `OG-${Date.now()}`;
    vehicle.vin = '';
    vehicle.mileage = 0;
    vehicle.engine = 'Unknown';
    vehicle.transmission = 'Unknown';
    vehicle.blackBookValue = 0;
    vehicle.yourCost = 0;
    vehicle.inStock = true;

    return (vehicle.make && vehicle.model && vehicle.suggestedPrice) ? [vehicle as Vehicle] : [];
  }

  /**
   * FIX #4 - Layer 3: Extract from Microdata (Schema.org)
   */
  private extractFromMicrodata(html: string, baseUrl: string): Vehicle[] {
    const $ = cheerioLoad(html);
    const vehicles: Vehicle[] = [];

    $('[itemtype*="schema.org/Vehicle"], [itemtype*="schema.org/Car"]').each((idx, el) => {
      const $el = $(el);
      const vehicle: Partial<Vehicle> = {
        id: `MD-${Date.now()}-${idx}`,
        make: $el.find('[itemprop="brand"]').text().trim() || 'Unknown',
        model: $el.find('[itemprop="model"]').text().trim() || 'Unknown',
        year: parseInt($el.find('[itemprop="modelDate"], [itemprop="productionDate"]').text().trim()) || 0,
        suggestedPrice: parseFloat($el.find('[itemprop="price"]').attr('content') || $el.find('[itemprop="price"]').text().replace(/[^0-9.]/g, '')) || 0,
        mileage: parseInt($el.find('[itemprop="mileageFromOdometer"]').text().replace(/[^0-9]/g, '')) || 0,
        vin: $el.find('[itemprop="vehicleIdentificationNumber"]').text().trim() || '',
        imageUrl: $el.find('[itemprop="image"]').attr('src') || $el.find('[itemprop="image"]').attr('content'),
        engine: 'Unknown',
        transmission: 'Unknown',
        blackBookValue: 0,
        yourCost: 0,
        inStock: true,
      };

      if (vehicle.make && vehicle.model) {
        vehicles.push(vehicle as Vehicle);
      }
    });

    return vehicles;
  }

  /**
   * FIX #4 - Layer 4: Extract from RDFa markup
   */
  private extractFromRDFa(html: string, baseUrl: string): Vehicle[] {
    const $ = cheerioLoad(html);
    const vehicles: Vehicle[] = [];

    $('[typeof*="Vehicle"], [typeof*="Car"]').each((idx, el) => {
      const $el = $(el);
      const vehicle: Partial<Vehicle> = {
        id: `RDFA-${Date.now()}-${idx}`,
        make: $el.find('[property="brand"]').text().trim() || 'Unknown',
        model: $el.find('[property="model"]').text().trim() || 'Unknown',
        year: parseInt($el.find('[property="modelDate"]').text().trim()) || 0,
        suggestedPrice: parseFloat($el.find('[property="price"]').text().replace(/[^0-9.]/g, '')) || 0,
        vin: $el.find('[property="vehicleIdentificationNumber"]').text().trim() || '',
        engine: 'Unknown',
        transmission: 'Unknown',
        blackBookValue: 0,
        yourCost: 0,
        inStock: true,
      };

      if (vehicle.make && vehicle.model) {
        vehicles.push(vehicle as Vehicle);
      }
    });

    return vehicles;
  }

  /**
   * FIX #4 - Layer 5: Extract from DOM with multiple selector sets
   */
  private extractFromDOM(html: string, baseUrl: string): Vehicle[] {
    const $ = cheerioLoad(html);
    const vehicles: Vehicle[] = [];

    const selectorSets = [
      { card: 'div.vehicle-card, div.vehicle-listing, div[data-vehicle]', title: 'h2, h3, .title, .vehicle-title', price: '.price, .vehicle-price, [class*="price"]', mileage: '.mileage, .odometer, [class*="mileage"]', vin: '.vin, [data-vin]' },
      { card: 'article.vehicle, article.car, article[data-vehicle-id]', title: 'h2, h3, .heading', price: '.price, .cost', mileage: '.km, .kms', vin: '.vin' },
      { card: 'li.car-listing, li.vehicle-item', title: '.name, .title', price: '.price', mileage: '.mileage', vin: '.vin' },
      { card: 'div[class*="inventory"], div[class*="listing"]', title: 'h2, h3', price: '[class*="price"]', mileage: '[class*="mile"], [class*="km"]', vin: '[class*="vin"]' },
    ];

    for (const selectors of selectorSets) {
      $(selectors.card).each((idx, el) => {
        const $el = $(el);
        
        const titleText = $el.find(selectors.title).first().text().trim();
        const parsed = this.parseTitle(titleText);
        
        const priceText = $el.find(selectors.price).first().text().trim();
        const price = this.parsePrice(priceText);
        
        const mileageText = $el.find(selectors.mileage).first().text().trim();
        const mileage = this.parseMileage(mileageText);
        
        const vinText = $el.find(selectors.vin).first().text().trim() || $el.text();
        const vin = this.extractVin(vinText);
        
        const images = this.extractImages($el, baseUrl);

        const vehicle: Vehicle = {
          id: vin || `DOM-${Date.now()}-${idx}`,
          vin: vin || '',
          year: parsed.year || 0,
          make: parsed.make || 'Unknown',
          model: parsed.model || 'Unknown',
          trim: parsed.trim || '',
          mileage: mileage,
          color: undefined,
          engine: 'Unknown',
          transmission: 'Unknown',
          blackBookValue: 0,
          yourCost: 0,
          suggestedPrice: price,
          inStock: true,
          imageUrl: images[0],
          imageUrls: images.length > 0 ? images : undefined,
        };

        if (vehicle.make && vehicle.model && vehicle.suggestedPrice > 0) {
          vehicles.push(vehicle);
        }
      });

      if (vehicles.length > 0) break;
    }

    return vehicles;
  }

  /**
   * FIX #4 - Layer 6: Extract from regex patterns (last resort)
   */
  private extractFromRegex(html: string, baseUrl: string): Vehicle[] {
    const vehicles: Vehicle[] = [];
    
    // Extract all potential vehicle mentions
    const vehiclePattern = /(\d{4})\s+([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
    const pricePattern = /\$\s*([0-9,]+)/g;
    const vinPattern = /\b([A-HJ-NPR-Z0-9]{17})\b/g;
    
    let match;
    const potentialVehicles: any[] = [];
    
    while ((match = vehiclePattern.exec(html)) !== null) {
      potentialVehicles.push({
        year: parseInt(match[1]),
        make: match[2],
        model: match[3],
        position: match.index,
      });
    }
    
    // Try to match prices and VINs to vehicles based on proximity
    const prices: any[] = [];
    while ((match = pricePattern.exec(html)) !== null) {
      prices.push({
        price: parseFloat(match[1].replace(/,/g, '')),
        position: match.index,
      });
    }
    
    const vins: any[] = [];
    while ((match = vinPattern.exec(html)) !== null) {
      if (this.isValidVin(match[1])) {
        vins.push({
          vin: match[1],
          position: match.index,
        });
      }
    }
    
    // Match vehicles with nearby prices and VINs
    for (const pv of potentialVehicles) {
      const nearbyPrice = prices.find(p => Math.abs(p.position - pv.position) < 500);
      const nearbyVin = vins.find(v => Math.abs(v.position - pv.position) < 500);
      
      if (nearbyPrice) {
        vehicles.push({
          id: nearbyVin?.vin || `REGEX-${Date.now()}-${vehicles.length}`,
          vin: nearbyVin?.vin || '',
          year: pv.year,
          make: pv.make,
          model: pv.model,
          trim: '',
          mileage: 0,
          color: undefined,
          engine: 'Unknown',
          transmission: 'Unknown',
          blackBookValue: 0,
          yourCost: 0,
          suggestedPrice: nearbyPrice.price,
          inStock: true,
        });
      }
    }
    
    return vehicles;
  }

  /**
   * FIX #5: Smart image extraction with filtering
   */
  private extractImages($el: any, baseUrl: string): string[] {
    const allImages: string[] = [];
    const excludePatterns = [
      /logo/i,
      /icon/i,
      /spinner/i,
      /loading/i,
      /placeholder/i,
      /badge/i,
      /star/i,
      /arrow/i,
      /button/i,
      /nav/i,
      /social/i,
      /default/i,
      /thumb/i,
      /avatar/i,
      /banner/i,
    ];

    // Find images in gallery/carousel first
    const gallerySelectors = [
      '.vehicle-gallery img',
      '.image-gallery img',
      '.carousel img',
      '.slider img',
      '[class*="gallery"] img',
      '[class*="photo"] img',
      '[id*="gallery"] img',
      '[data-gallery] img',
    ];

    for (const selector of gallerySelectors) {
      $el.find(selector).each((_: number, img: any) => {
        let src = $el.constructor(img).attr('src') || 
                  $el.constructor(img).attr('data-src') || 
                  $el.constructor(img).attr('data-lazy') ||
                  $el.constructor(img).attr('data-original');
        
        if (src && !excludePatterns.some(p => p.test(src))) {
          try {
            if (!/^https?:/i.test(src)) {
              src = new URL(src, baseUrl).href;
            }
            if (!allImages.includes(src)) {
              allImages.push(src);
            }
          } catch {}
        }
      });
    }

    // Fallback to og:image
    if (allImages.length === 0) {
      const ogImage = $el.find('meta[property="og:image"]').attr('content');
      if (ogImage) {
        try {
          const resolved = !/^https?:/i.test(ogImage) ? new URL(ogImage, baseUrl).href : ogImage;
          allImages.push(resolved);
        } catch {}
      }
    }

    // Limit to top 10 images
    return allImages.slice(0, 10);
  }

  /**
   * FIX #3: Proper VIN validation with check digit
   */
  private isValidVin(vin: string): boolean {
    if (!vin || vin.length !== 17) return false;
    
    vin = vin.toUpperCase().trim();
    
    // Valid VIN character set (no I, O, Q)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return false;
    
    // VIN Check Digit Validation (position 9)
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const transliteration: { [key: string]: number } = {
      'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
      'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9, 'S': 2,
      'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
      '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9
    };
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const char = vin[i];
      const value = transliteration[char];
      if (value === undefined) return false;
      sum += value * weights[i];
    }
    
    const checkDigit = sum % 11;
    const actualCheckDigit = vin[8] === 'X' ? 10 : parseInt(vin[8]);
    
    return checkDigit === actualCheckDigit;
  }

  /**
   * FIX #3: Extract VIN with validation
   */
  private extractVin(text: string): string | null {
    const vinPatterns = [
      /\bVIN[:\s#]*([A-HJ-NPR-Z0-9]{17})\b/i,
      /\bVehicle\s+Identification\s+Number[:\s]*([A-HJ-NPR-Z0-9]{17})\b/i,
      /\bStock\s*#?:\s*([A-HJ-NPR-Z0-9]{17})\b/i,
      /\b([A-HJ-NPR-Z0-9]{17})\b/,
    ];

    for (const pattern of vinPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && this.isValidVin(match[1])) {
        return match[1].toUpperCase();
      }
    }

    return null;
  }

  /**
   * FIX #2: Quality filtering with adjusted thresholds
   */
  private filterByQuality(): Vehicle[] {
    return this.allVehicles.filter(v => {
      const qualityScore = this.calculateQualityScore(v);
      
      // Has all critical fields = keep regardless of score
      if (v.vin && v.make && v.model && v.suggestedPrice && v.year) {
        return true;
      }
      
      // Score-based filtering with gradual thresholds
      if (qualityScore.score >= 100) return true; // Excellent
      if (qualityScore.score >= 75) return true;  // Good
      if (qualityScore.score >= 50 && qualityScore.hasCriticalFields) return true; // Fair but usable
      
      return false;
    });
  }

  /**
   * FIX #2: Calculate quality score with gradual thresholds
   */
  private calculateQualityScore(vehicle: Vehicle): DataQualityScore {
    let score = 0;
    const missingFields: string[] = [];
    
    // CRITICAL FIELDS: 25 points each (125 total)
    if (vehicle.vin && this.isValidVin(vehicle.vin)) {
      score += 25;
    } else {
      missingFields.push('vin');
    }
    
    if (vehicle.year && vehicle.year > 1900 && vehicle.year <= new Date().getFullYear() + 1) {
      score += 25;
    } else {
      missingFields.push('year');
    }
    
    if (vehicle.make && vehicle.make !== 'Unknown') {
      score += 25;
    } else {
      missingFields.push('make');
    }
    
    if (vehicle.model && vehicle.model !== 'Unknown') {
      score += 25;
    } else {
      missingFields.push('model');
    }
    
    if (vehicle.suggestedPrice && vehicle.suggestedPrice > 0) {
      score += 25;
    } else {
      missingFields.push('price');
    }
    
    // IMPORTANT FIELDS: 10 points each (30 total)
    if (vehicle.mileage && vehicle.mileage > 0) score += 10;
    if (vehicle.engine && vehicle.engine !== 'Unknown') score += 10;
    if (vehicle.transmission && vehicle.transmission !== 'Unknown') score += 10;
    
    // NICE-TO-HAVE FIELDS: 5 points each (15 total)
    if (vehicle.imageUrl || (vehicle.imageUrls && vehicle.imageUrls.length > 0)) score += 5;
    if (vehicle.trim) score += 5;
    if (vehicle.color) score += 5;
    
    const hasCriticalFields = vehicle.vin && vehicle.make && vehicle.model && vehicle.suggestedPrice && vehicle.year ? true : false;
    
    return { score, hasCriticalFields, missingFields };
  }

  /**
   * Validate vehicles and clean up data
   */
  private validateVehicles(vehicles: Vehicle[]): Vehicle[] {
    return vehicles.filter(v => {
      // Validate VIN
      if (v.vin && !this.isValidVin(v.vin)) {
        v.vin = '';
      }
      
      // Validate price range
      if (!v.suggestedPrice || v.suggestedPrice < 1000 || v.suggestedPrice > 500000) {
        return false;
      }
      
      // Validate year range
      if (!v.year || v.year < 1990 || v.year > new Date().getFullYear() + 1) {
        return false;
      }
      
      // Must have make and model
      if (!v.make || !v.model || v.make === 'Unknown' || v.model === 'Unknown') {
        return false;
      }
      
      return true;
    });
  }

  /**
   * FIX #6: Optimized HTTP-first fetch with timeout
   */
  private async fetchHtmlFast(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      // TRY 1: Fast HTTP request with axios
      const response = await axios.get(url, {
        timeout: 10000,
        signal: controller.signal as any,
        headers: {
          'User-Agent': this.randomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://www.google.com/',
        },
        maxRedirects: 5,
      });
      
      clearTimeout(timeout);
      return response.data;
    } catch (error) {
      clearTimeout(timeout);
      console.log(`[SCRAPER] HTTP failed for ${url}, trying Puppeteer...`);
      
      // FALLBACK: Puppeteer with optimized settings
      return await this.fetchWithPuppeteer(url);
    }
  }

  /**
   * FIX #6 & #7: Puppeteer with stealth and optimized timeouts
   */
  private async fetchWithPuppeteer(url: string): Promise<string> {
    if (!this.browser) {
      const puppeteer = await import('puppeteer');
      this.browser = await puppeteer.default.launch({
        headless: this.config.headless !== false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });
    }

    const page = await this.browser.newPage();

    try {
      // FIX #7: Stealth settings
      await page.setUserAgent(this.randomUserAgent());
      
      // Randomize viewport
      await page.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 1080 + Math.floor(Math.random() * 100),
        deviceScaleFactor: 1 + Math.random() * 0.2,
      });
      
      // Set realistic headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
        'DNT': '1',
      });

      // Block unnecessary resources for speed
      await page.setRequestInterception(true);
      page.on('request', (request: any) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // FIX #6: Optimized navigation timeout
      await page.goto(url, {
        waitUntil: 'domcontentloaded', // Don't wait for all resources
        timeout: 30000, // 30s max
      });

      // Simulate human behavior
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

      const html = await page.content();
      await page.close();

      return html;
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * FIX #7: Random user agent selection
   */
  private randomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Helper: Parse title into year, make, model, trim
   */
  private parseTitle(title: string): { year: number; make: string; model: string; trim?: string } {
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

  /**
   * Helper: Parse price from text
   */
  private parsePrice(priceText: string): number {
    const cleaned = priceText.replace(/[^0-9.]/g, '');
    const price = parseFloat(cleaned);
    return isNaN(price) ? 0 : price;
  }

  /**
   * Helper: Parse mileage from text
   */
  private parseMileage(mileageText: string): number {
    const cleaned = mileageText.replace(/[^0-9]/g, '');
    const mileage = parseInt(cleaned);
    return isNaN(mileage) ? 0 : mileage;
  }

  /**
   * Helper: Normalize vehicle from JSON-LD
   */
  private normalizeVehicleFromJsonLd(obj: any, baseUrl: string): Vehicle | null {
    try {
      const vin = obj.vehicleIdentificationNumber || obj.vin || obj.hasVIN || '';
      const brand = obj.brand?.name || obj.brand || obj.manufacturer || '';
      const model = obj.model || obj.vehicleModel?.name || '';
      const modelDate = obj.modelDate || obj.productionDate || '';
      const year = parseInt(String(modelDate)) || this.parseTitle(obj.name || '').year || 0;
      const price = parseFloat(obj.offers?.price ?? obj.price ?? obj.offers?.[0]?.price ?? 0);
      const mileage = parseInt(obj.mileageFromOdometer?.value ?? obj.mileage ?? 0);

      const rawImages = Array.isArray(obj.image) ? obj.image : (obj.image ? [obj.image] : []);
      const imageUrls: string[] = [];
      for (const img of rawImages) {
        let imgUrl = typeof img === 'string' ? img : (img?.url || img?.contentUrl || '');
        if (imgUrl) {
          try {
            if (baseUrl && !/^https?:\/\//i.test(imgUrl)) {
              imgUrl = new URL(String(imgUrl), baseUrl).href;
            }
            imageUrls.push(imgUrl);
          } catch {}
        }
      }

      const stock = obj.sku || obj.productID || obj.identifier || obj.serialNumber || vin || `JSONLD-${Date.now()}`;

      const vehicle: Vehicle = {
        id: String(stock),
        vin: String(vin || ''),
        year: year || 0,
        make: String(brand || 'Unknown'),
        model: String(model || 'Unknown'),
        trim: obj.vehicleModelDate || obj.trim || '',
        mileage: mileage,
        color: obj.color || undefined,
        engine: obj.vehicleEngine?.name || 'Unknown',
        transmission: obj.vehicleTransmission || 'Unknown',
        blackBookValue: 0,
        yourCost: 0,
        suggestedPrice: price,
        inStock: true,
        imageUrl: imageUrls[0],
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      };

      return vehicle;
    } catch {
      return null;
    }
  }

  /**
   * Helper: Delay for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
      } catch (error) {
        console.error('[SCRAPER] Error closing browser:', error);
      }
    }
  }
}

export { ProductionDealershipScraper };
export default ProductionDealershipScraper;
