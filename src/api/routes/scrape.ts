import express, { Request, Response } from 'express';
import axios from 'axios';
import { Vehicle } from '../../types/types';

const router = express.Router();

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
  const html = await axios.get(url, { timeout: 15000 }).then((r) => r.data as string);
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

  const unique = Array.from(new Set(urls)).slice(0, limit);
  for (let i = 0; i < unique.length; i++) {
    try {
      const u = unique[i].startsWith('http') ? unique[i] : new URL(unique[i], url).href;
      const h = await axios.get(u, { timeout: 15000 }).then((r) => r.data as string);
      const bs = extractJsonLd(h);
      for (let j = 0; j < bs.length; j++) {
        const v = normalizeVehicleFromJsonLd(bs[j], j, u);
        if (v && (v.vin || v.make || v.model)) { out.push(v); break; }
      }
    } catch (_e) {}
  }

  return out.slice(0, limit);
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
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

export default router;
