import express, { Request, Response } from 'express';
import axios from 'axios';
import { load as cheerioLoad } from 'cheerio';
import { Vehicle } from '../../types/types';

const router = express.Router();

const http = axios.create({
  timeout: 20000,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

async function fetchHtmlHeadless(url: string, referer?: string): Promise<string> {
  let browser: any = null;
  try {
    const mod: any = await import('puppeteer');
    const puppeteer = mod.default || mod;
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36');
    const extra: Record<string,string> = { 'Accept-Language': 'en-CA,en-US;q=0.9,en;q=0.8' };
    if (referer) extra['Referer'] = referer;
    await page.setExtraHTTPHeaders(extra);
    await page.setRequestInterception(true);
    page.on('request', (req: any) => {
      const rt = req.resourceType();
      if (rt === 'image' || rt === 'font' || rt === 'media' || rt === 'stylesheet') return req.abort();
      req.continue();
    });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await page.waitForSelector('body', { timeout: 15000 });
    return await page.content();
  } finally {
    if (browser) { try { await browser.close(); } catch(_e) {} }
  }
}

async function fetchHtml(url: string, referer?: string): Promise<string> {
  try {
    const resp = await http.get(url, { headers: referer ? { Referer: referer } : undefined });
    return resp.data as string;
  } catch(_e) {
    // Fallback to headless browser to bypass bot protection
    return await fetchHtmlHeadless(url, referer);
  }
}

function extractJsonLd(html: string): any[] {
  const results: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    // Some sites wrap multiple JSON objects without array; attempt to parse robustly
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch (_e) {
      // Try to recover malformed JSON-LD by locating first/last braces
      try {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
          const frag = raw.slice(start, end + 1);
          const parsed = JSON.parse(frag);
          if (Array.isArray(parsed)) results.push(...parsed);
          else results.push(parsed);
        }
      } catch (__e) {}
    }
  }
  return results;
}

function toNumber(input: any): number | undefined {
  if (input === undefined || input === null || input === '') return undefined;
  let s = String(input);
  const neg = /^\(.*\)$/.test(s);
  s = s.replace(/[,$]/g, '').replace(/^\(|\)$/g, '').replace(/\$/g, '');
  const n = parseFloat(s);
  if (isNaN(n)) return undefined;
  return neg ? -n : n;
}

function normalizeVehicleFromJsonLd(obj: any, idx: number, baseUrl?: string): Vehicle | null {
  try {
    const ldType = obj['@type'];
    if (Array.isArray(ldType)) {
      if (!ldType.some((t) => String(t).toLowerCase().includes('vehicle') || String(t).toLowerCase().includes('product'))) {
        // not a vehicle-ish schema
      }
    } else if (ldType && !String(ldType).toLowerCase().includes('vehicle') && !String(ldType).toLowerCase().includes('product')) {
      // pass, may still contain nested vehicle data
    }

    const vin = obj.vehicleIdentificationNumber || obj.vin || obj.hasVIN || '';
    const brand = obj.brand?.name || obj.brand || obj.manufacturer || '';
    const model = obj.model || obj.vehicleModel?.name || '';
    const modelDate = obj.modelDate || obj.productionDate || '';
    const year = Number.parseInt(String(modelDate)) || inferYearFromName(obj.name) || 0;
    const name = obj.name || '';
    const price = toNumber(obj.offers?.price ?? obj.price ?? obj.offers?.[0]?.price);
    const mileage = toNumber(obj.mileageFromOdometer?.value);
    
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
        } catch(_e) {}
      }
    }
    
    const stock = obj.sku || obj.productID || obj.identifier || obj.serialNumber || vin || `SCR-${Date.now()}-${idx}`;

    const vehicle: Vehicle = {
      id: String(stock),
      vin: String(vin || ''),
      year: year || 0,
      make: String(brand || 'Unknown'),
      model: String(model || (name ? name.split(' ').slice(1).join(' ') : 'Unknown')),
      trim: '',
      mileage: mileage ?? 0,
      color: undefined,
      engine: 'Unknown',
      transmission: 'Unknown',
      cbbWholesale: 0,
      cbbRetail: 0,
      yourCost: 0,
      suggestedPrice: price ?? 0,
      inStock: true,
      imageUrl: imageUrls[0] || undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    };

    return vehicle;
  } catch (_e) {
    return null;
  }
}

function inferYearFromName(name?: string): number | undefined {
  if (!name) return undefined;
  const m = name.match(/\b(20\d{2}|19\d{2})\b/);
  return m ? Number.parseInt(m[1]) : undefined;
}

async function fetchVehiclesFromListing(url: string, limit = 20): Promise<Vehicle[]> {
  const out: Vehicle[] = [];
  const html = await fetchHtml(url);
  const blocks = extractJsonLd(html);
  // 1) try direct Vehicle objects in JSON-LD
  const direct: Vehicle[] = [];
  blocks.forEach((b, i) => {
    const v = normalizeVehicleFromJsonLd(b, i, url);
    if (v && (v.vin || v.make || v.model)) direct.push(v);
  });
  if (direct.length > 0) return direct.slice(0, limit);

  // 2) find SearchResultsPage -> itemListElement -> url; fetch detail pages
  const urls: string[] = [];
  for (const b of blocks) {
    const type = b['@type'];
    if (!type) continue;
    const t = Array.isArray(type) ? type.map(String) : [String(type)];
    if (t.some((x) => x.toLowerCase().includes('searchresultspage'))) {
      // Dealer sites vary: try a few shapes
      const items = b.itemListElement || b.hasPart?.itemListElement || [];
      if (Array.isArray(items)) {
        for (const it of items) {
          const u = it?.url || it?.item?.url || it?.mainEntityOfPage?.url;
          if (u) urls.push(String(u));
        }
      }
    }
  }

  // 3) If we still have no URLs, fallback to DOM link discovery with Cheerio
  if (urls.length === 0) {
    try {
      const $ = cheerioLoad(html);
      const candidates = new Set<string>();
      $('a[href]').each((_i: number, el: any) => {
        const href = String($(el).attr('href') || '');
        if (!href) return;
        // Filter likely vehicle detail links
        const h = href.toLowerCase();
        if (h.includes('/used') || h.includes('/new') || h.includes('/vehicle') || h.includes('/inventory')) {
          candidates.add(href);
        }
      });
      const abs = Array.from(candidates)
        .map((h) => (h.startsWith('http') ? h : new URL(h, url).href))
        .filter((h) => h.includes('devonchrysler.com'));
      urls.push(...Array.from(new Set(abs)));
    } catch (_e) {}
  }

  const unique = Array.from(new Set(urls)).slice(0, limit);
  for (let i = 0; i < unique.length; i++) {
    try {
      const u = unique[i].startsWith('http') ? unique[i] : new URL(unique[i], url).href;
      const h = await fetchHtml(u, url);
      const bs = extractJsonLd(h);
      for (let j = 0; j < bs.length; j++) {
        const v = normalizeVehicleFromJsonLd(bs[j], j, u);
        if (v && (v.vin || v.make || v.model)) { out.push(v); break; }
      }
      // If JSON-LD did not produce a vehicle, try DOM parsing heuristics
      if (out.length < i + 1) {
        const domVeh = normalizeVehicleFromDom(h, u, i);
        if (domVeh) out.push(domVeh);
      }
    } catch (_e) {}
  }

  return out.slice(0, limit);
}

function normalizeVehicleFromDom(html: string, pageUrl: string, idx: number): Vehicle | null {
  try {
    const $ = cheerioLoad(html);
    // Name/year/make/model
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const title = ogTitle || $('title').text().trim();
    const year = inferYearFromName(title) || 0;
    
    // Capture ALL images from gallery/carousel and fallback to og:image
    const imageUrls: string[] = [];
    const gallerySelectors = [
      '.vehicle-gallery img[src]',
      '.image-gallery img[src]',
      '.carousel img[src]',
      '.slider img[src]',
      '[class*="gallery"] img[src]',
      '[class*="photo"] img[src]',
      '[id*="gallery"] img[src]',
      '[data-gallery] img[src]'
    ];
    
    for (const selector of gallerySelectors) {
      $(selector).each((_i: number, el: any) => {
        let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy');
        if (src && !src.includes('placeholder') && !src.includes('loading')) {
          try {
            if (!/^https?:/i.test(src)) src = new URL(src, pageUrl).href;
            if (!imageUrls.includes(src)) imageUrls.push(src);
          } catch(_e) {}
        }
      });
    }
    
    // Fallback to og:image and first img if no gallery found
    if (imageUrls.length === 0) {
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) {
        try {
          const resolved = !/^https?:/i.test(ogImage) ? new URL(ogImage, pageUrl).href : ogImage;
          imageUrls.push(resolved);
        } catch(_e) {}
      }
      
      $('img[src]').each((_i: number, el: any) => {
        if (imageUrls.length >= 10) return false;
        let src = $(el).attr('src');
        if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('placeholder')) {
          try {
            if (!/^https?:/i.test(src)) src = new URL(src, pageUrl).href;
            if (!imageUrls.includes(src)) imageUrls.push(src);
          } catch(_e) {}
        }
      });
    }
    
    // Price heuristics
    let price: number | undefined;
    const priceMeta = $('meta[itemprop="price"]').attr('content') || $('meta[property="product:price:amount"]').attr('content');
    if (priceMeta) price = toNumber(priceMeta) as number | undefined;
    if (price === undefined) {
      // Find largest numeric under elements containing 'price'
      const priceTexts: string[] = [];
      $('[class*="price"], [id*="price"], .price, .final-price').each((_i: number, el: any) => {
        const t = $(el).text(); if (t) priceTexts.push(t);
      });
      const nums = priceTexts.map((t) => toNumber(t)).filter((n) => typeof n === 'number') as number[];
      if (nums.length) price = Math.max(...nums);
    }
    // VIN & Stock & Mileage heuristics
    const whole = $('body').text();
    let vin = '';
    const mVin = whole.match(/\bVIN[:\s]*([A-HJ-NPR-Z0-9]{17})\b/i);
    if (mVin) vin = mVin[1].toUpperCase();
    let stock = '';
    const mStk = whole.match(/\bStock[:#\s]*([A-Za-z0-9-]+)\b/i);
    if (mStk) stock = mStk[1];
    let mileage = 0;
    const mMil = whole.match(/([0-9][0-9,\.]*)\s*(km|kms|kilometers|kilometres)\b/i);
    if (mMil) {
      const n = parseFloat(mMil[1].replace(/[,\.]/g, ''));
      if (!isNaN(n)) mileage = n;
    }
    // Make/Model from title tokens if possible
    let make = '';
    let model = '';
    if (title) {
      const parts = title.split(/\s+/);
      const yIdx = parts.findIndex((p: string) => /^(19|20)\d{2}$/.test(p));
      const after = yIdx >= 0 ? parts.slice(yIdx + 1) : parts;
      if (after.length) {
        make = after[0];
        model = after.slice(1).join(' ');
      }
    }
    const id = stock || vin || `SCR-DOM-${Date.now()}-${idx}`;
    const vehicle: Vehicle = {
      id: id,
      vin: vin,
      year: year,
      make: make || 'Unknown',
      model: model || 'Unknown',
      trim: '',
      mileage: mileage,
      color: undefined,
      engine: 'Unknown',
      transmission: 'Unknown',
      cbbWholesale: 0,
      cbbRetail: 0,
      yourCost: 0,
      suggestedPrice: price ?? 0,
      inStock: true,
      imageUrl: imageUrls[0] || undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    };
    return vehicle;
  } catch(_e) {
    return null;
  }
}

router.get('/devon', async (req: Request, res: Response) => {
  try {
    const base = 'https://www.devonchrysler.com';
    const path = (req.query.path as string) || '/inventory/';
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const url = new URL(path, base).href;
    const vehicles = await fetchVehiclesFromListing(url, limit);
    res.json({ success: true, total: vehicles.length, vehicles });
  } catch (e) {
    const err: any = e;
    const status = err?.response?.status;
    const statusText = err?.response?.statusText;
    res.status(500).json({ success: false, error: (err?.message || 'scrape failed'), status, statusText });
  }
});

router.get('/autotrader', async (req: Request, res: Response) => {
  try {
    const { scrapeAutoTraderCA, convertToVehicle } = await import('../../modules/scrapers/autotrader-ca');
    
    const params = {
      make: req.query.make as string,
      model: req.query.model as string,
      yearMin: req.query.yearMin ? Number(req.query.yearMin) : undefined,
      yearMax: req.query.yearMax ? Number(req.query.yearMax) : undefined,
      priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
      priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
      location: (req.query.location as string) || 'Alberta',
      radius: req.query.radius ? Number(req.query.radius) : 250,
      limit: Math.min(Math.max(Number(req.query.limit) || 20, 1), 100),
    };
    
    const listings = await scrapeAutoTraderCA(params);
    const vehicles = listings.map(convertToVehicle);
    
    res.json({ 
      success: true, 
      total: listings.length, 
      vehicles,
      listings,
      params 
    });
  } catch (e: any) {
    res.status(500).json({ 
      success: false, 
      error: e.message || 'AutoTrader scrape failed' 
    });
  }
});

router.get('/autotrader/pricing', async (req: Request, res: Response) => {
  try {
    const { searchCompetitorPricing } = await import('../../modules/scrapers/autotrader-ca');
    
    const year = Number(req.query.year);
    const make = req.query.make as string;
    const model = req.query.model as string;
    const radius = req.query.radius ? Number(req.query.radius) : 250;
    const location = (req.query.location as string) || 'Alberta';
    
    if (!year || !make || !model) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: year, make, model'
      });
    }
    
    const result = await searchCompetitorPricing(year, make, model, radius, location);
    
    res.json({
      success: true,
      year,
      make,
      model,
      location,
      radius,
      pricing: {
        average: result.average,
        min: result.min,
        max: result.max,
        count: result.count,
      },
      listings: result.listings,
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      error: e.message || 'Pricing search failed'
    });
  }
});

router.get('/cargurus', async (req: Request, res: Response) => {
  try {
    const { scrapeCarGurusCA, convertToVehicle } = await import('../../modules/scrapers/cargurus-ca');
    
    const params = {
      make: req.query.make as string,
      model: req.query.model as string,
      yearMin: req.query.yearMin ? Number(req.query.yearMin) : undefined,
      yearMax: req.query.yearMax ? Number(req.query.yearMax) : undefined,
      priceMin: req.query.priceMin ? Number(req.query.priceMin) : undefined,
      priceMax: req.query.priceMax ? Number(req.query.priceMax) : undefined,
      mileageMax: req.query.mileageMax ? Number(req.query.mileageMax) : undefined,
      postalCode: (req.query.postalCode as string) || 'T5J',
      radius: req.query.radius ? Number(req.query.radius) : 250,
      limit: Math.min(Math.max(Number(req.query.limit) || 20, 1), 100),
    };
    
    const listings = await scrapeCarGurusCA(params);
    const vehicles = listings.map(convertToVehicle);
    
    res.json({ 
      success: true, 
      total: listings.length, 
      vehicles,
      listings,
      params 
    });
  } catch (e: any) {
    res.status(500).json({ 
      success: false, 
      error: e.message || 'CarGurus scrape failed' 
    });
  }
});

router.get('/cargurus/market', async (req: Request, res: Response) => {
  try {
    const { searchMarketData } = await import('../../modules/scrapers/cargurus-ca');
    
    const year = Number(req.query.year);
    const make = req.query.make as string;
    const model = req.query.model as string;
    const radius = req.query.radius ? Number(req.query.radius) : 250;
    const postalCode = (req.query.postalCode as string) || 'T5J';
    
    if (!year || !make || !model) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: year, make, model'
      });
    }
    
    const result = await searchMarketData(year, make, model, radius, postalCode);
    
    res.json({
      success: true,
      year,
      make,
      model,
      postalCode,
      radius,
      marketData: {
        average: result.average,
        min: result.min,
        max: result.max,
        count: result.count,
        goodDeals: result.goodDeals,
      },
      listings: result.listings,
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      error: e.message || 'Market data search failed'
    });
  }
});

router.get('/cargurus/compare', async (req: Request, res: Response) => {
  try {
    const { compareWithMarket } = await import('../../modules/scrapers/cargurus-ca');
    
    const year = Number(req.query.year);
    const make = req.query.make as string;
    const model = req.query.model as string;
    const yourPrice = Number(req.query.price);
    const radius = req.query.radius ? Number(req.query.radius) : 250;
    const postalCode = (req.query.postalCode as string) || 'T5J';
    
    if (!year || !make || !model || !yourPrice) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: year, make, model, price'
      });
    }
    
    const comparison = await compareWithMarket(year, make, model, yourPrice, radius, postalCode);
    
    res.json({
      success: true,
      vehicle: { year, make, model },
      comparison,
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      error: e.message || 'Market comparison failed'
    });
  }
});

export default router;
