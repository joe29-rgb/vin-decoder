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
    let image = Array.isArray(obj.image) ? obj.image[0] : obj.image;
    const stock = obj.sku || obj.productID || obj.identifier || obj.serialNumber || vin || `SCR-${Date.now()}-${idx}`;

    // Resolve relative image URL
    try {
      if (image && typeof image === 'string' && baseUrl && !/^https?:\/\//i.test(image)) {
        image = new URL(String(image), baseUrl).href;
      }
    } catch(_e) {}

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
      imageUrl: image,
      blackBookValue: undefined,
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
  const detailUrls: string[] = [];
  const visitedListing = new Set<string>();
  let pageUrl = url;
  // Crawl listing pages until we collect enough detail URLs
  while (detailUrls.length < limit && pageUrl && !visitedListing.has(pageUrl)) {
    visitedListing.add(pageUrl);
    const html = await fetchHtml(pageUrl);
    const blocks = extractJsonLd(html);
    // Prefer SearchResultsPage itemListElement URLs
    for (const b of blocks) {
      const type = b['@type'];
      const t = type ? (Array.isArray(type) ? type.map(String) : [String(type)]) : [];
      if (t.some((x: string) => x.toLowerCase().includes('searchresultspage'))) {
        const items = (b as any).itemListElement || (b as any).hasPart?.itemListElement || [];
        if (Array.isArray(items)) {
          for (const it of items) {
            const u = it?.url || it?.item?.url || it?.mainEntityOfPage?.url;
            if (u) detailUrls.push(String(u));
          }
        }
      }
    }
    // If JSON-LD didn’t expose results, use DOM to discover links
    if (detailUrls.length === 0) {
      try {
        const $ = cheerioLoad(html);
        $('a[href]').each((_i: number, el: any) => {
          const href = String($(el).attr('href') || '');
          if (!href) return;
          const h = href.toLowerCase();
          if (h.includes('/used') || h.includes('/new') || h.includes('/vehicle') || h.includes('/inventory')) {
            const abs = href.startsWith('http') ? href : new URL(href, pageUrl).href;
            if (abs.includes('devonchrysler.com')) detailUrls.push(abs);
          }
        });
      } catch (_e) {}
    }
    // Find next page if available
    try {
      const $ = cheerioLoad(html);
      let nextHref = $('a[rel="next"]').attr('href') || $('a:contains("Next")').attr('href') || '';
      if (nextHref) {
        pageUrl = nextHref.startsWith('http') ? nextHref : new URL(nextHref, pageUrl).href;
      } else {
        // Try page=N heuristic
        const u = new URL(pageUrl);
        const cur = Number(u.searchParams.get('page') || '1');
        if (!isNaN(cur)) {
          u.searchParams.set('page', String(cur + 1));
          pageUrl = u.href;
        } else {
          pageUrl = '';
        }
      }
    } catch (_e) { pageUrl = ''; }
  }
  const unique = Array.from(new Set(detailUrls)).slice(0, limit);
  for (let i = 0; i < unique.length; i++) {
    try {
      const u = unique[i].startsWith('http') ? unique[i] : new URL(unique[i], url).href;
      const h = await fetchHtml(u, url);
      const bs = extractJsonLd(h);
      let pushed = false;
      for (let j = 0; j < bs.length; j++) {
        const v = normalizeVehicleFromJsonLd(bs[j], j, u);
        if (v && (v.vin || v.make || v.model)) { out.push(v); pushed = true; break; }
      }
      if (!pushed) {
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
    // Image
    let image = $('meta[property="og:image"]').attr('content') || $('img[src]').first().attr('src') || '';
    try {
      if (image && !/^https?:/i.test(image)) image = new URL(image, pageUrl).href;
    } catch(_e) {}
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
      imageUrl: image || undefined,
      blackBookValue: undefined,
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

export default router;
