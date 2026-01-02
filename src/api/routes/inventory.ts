import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import { state } from '../state';
import { Vehicle } from '../../types/types';
import { loadInventoryFromCSV, enrichWithVinAuditValuations } from '../../modules/inventory-manager';
import { saveInventoryToSupabase, fetchInventoryFromSupabase } from '../../modules/supabase';

const router = Router();

// Merge helper: unify by VIN if present, otherwise by ID; later values override
function mergeVehicles(base: Vehicle[], incoming: Vehicle[]): Vehicle[] {
  const map = new Map<string, Vehicle>();
  const keyOf = (v: Partial<Vehicle>) => (v.vin && v.vin.length ? `VIN:${v.vin}` : `ID:${v.id}`);
  for (const v of base) map.set(keyOf(v), v);
  for (const v of incoming) {
    const k = keyOf(v);
    const prev = map.get(k) || ({} as Vehicle);
    map.set(k, { ...prev, ...v } as Vehicle);
  }
  return Array.from(map.values());
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

router.get('/ping', (_req: Request, res: Response) => {
  res.json({ success: true, scope: 'inventory', pong: true });
});

router.post('/upload-file', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, error: 'No file provided' });
    const text = file.buffer.toString('utf8');
    let parsed = loadInventoryFromCSV(text);
    parsed = await enrichWithVinAuditValuations(parsed);
    const mode = String((req.query.mode as any) || 'append').toLowerCase() === 'replace' ? 'replace' : 'append';
    state.inventory = mode === 'append' ? mergeVehicles(state.inventory, parsed) : parsed;
    // Keep mirrored in sync so scoring uses latest data
    state.mirroredInventory = mergeVehicles(state.mirroredInventory, state.inventory);
    try { await saveInventoryToSupabase(state.inventory); } catch(_e){}
    res.json({ success: true, message: `Loaded ${parsed.length} vehicles (${mode})`, total: state.inventory.length });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.post('/upload-image', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    const fields = (req as any).body || {};
    if (!file) return res.status(400).json({ success: false, error: 'No file provided' });
    const keyVin = fields.vin ? String(fields.vin).trim() : '';
    const keyId = fields.id ? String(fields.id).trim() : '';
    const entry = { mime: (file as any).mimetype || 'image/jpeg', buf: file.buffer };
    if (keyVin) state.imageStoreByVin.set(keyVin, entry);
    if (keyId) state.imageStoreById.set(keyId, entry);
    if (keyVin) {
      const url = `/api/inventory/image-by-vin/${encodeURIComponent(keyVin)}`;
      for (let i = 0; i < state.inventory.length; i++) if (state.inventory[i].vin === keyVin) state.inventory[i] = { ...state.inventory[i], imageUrl: url };
      for (let i = 0; i < state.mirroredInventory.length; i++) if (state.mirroredInventory[i].vin === keyVin) state.mirroredInventory[i] = { ...state.mirroredInventory[i], imageUrl: url };
    }
    if (keyId) {
      const url2 = `/api/inventory/image/${encodeURIComponent(keyId)}`;
      for (let i = 0; i < state.inventory.length; i++) if (String(state.inventory[i].id) === keyId) state.inventory[i] = { ...state.inventory[i], imageUrl: url2 };
      for (let i = 0; i < state.mirroredInventory.length; i++) if (String(state.mirroredInventory[i].id) === keyId) state.mirroredInventory[i] = { ...state.mirroredInventory[i], imageUrl: url2 };
    }
    res.json({ success: true, message: 'Image uploaded', byVin: !!keyVin, byId: !!keyId });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.post('/parse-pdf', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, error: 'No file provided' });
    const data = await pdf(file.buffer);
    const text = data.text || '';
    res.json({ success: true, text });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.get('/image-by-vin/:vin', (req: Request, res: Response) => {
  const vin = String(req.params.vin || '');
  const entry = state.imageStoreByVin.get(vin);
  if (!entry) return res.status(404).end();
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', entry.mime);
  res.send(entry.buf);
});

router.get('/image/:id', (req: Request, res: Response) => {
  const id = String(req.params.id || '');
  const entry = state.imageStoreById.get(id);
  if (!entry) return res.status(404).end();
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', entry.mime);
  res.send(entry.buf);
});

router.post('/upload', async (req: Request, res: Response) => {
  try {
    const { csvContent, mode: bodyMode } = req.body;
    if (!csvContent) {
      return res.status(400).json({ success: false, error: 'CSV content required' });
    }
    let parsed = loadInventoryFromCSV(csvContent);
    parsed = await enrichWithVinAuditValuations(parsed);
    const mode = String(bodyMode || 'append').toLowerCase() === 'replace' ? 'replace' : 'append';
    state.inventory = mode === 'append' ? mergeVehicles(state.inventory, parsed) : parsed;
    state.mirroredInventory = mergeVehicles(state.mirroredInventory, state.inventory);
    try { await saveInventoryToSupabase(state.inventory); } catch(_e){}
    res.json({ success: true, message: `Loaded ${parsed.length} vehicles (${mode})`, total: state.inventory.length });
  } catch (error) {
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

router.get('/', (_req: Request, res: Response) => {
  (async () => {
    try {
      const rows = await fetchInventoryFromSupabase();
      if (rows && rows.length > 0) {
        state.inventory = rows;
      }
    } catch(_e){}
    res.json({ success: true, total: state.inventory.length, vehicles: state.inventory });
  })();
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const id = String(b.id || b.stock || b.vehicleId || b.vehicle_id || b.vin || `WEB-${Date.now()}`);
    const updates: Partial<Vehicle> = {};
    if (b.vin !== undefined) updates.vin = String(b.vin);
    if (b.year !== undefined || b.vehicle_year !== undefined) updates.year = Number(b.year || b.vehicle_year);
    if (b.make !== undefined || b.vehicle_make !== undefined) updates.make = String(b.make || b.vehicle_make);
    if (b.model !== undefined || b.vehicle_model !== undefined) updates.model = String(b.model || b.vehicle_model);
    if (b.trim !== undefined) updates.trim = b.trim;
    if (b.mileage !== undefined) updates.mileage = Number(b.mileage);
    if (b.color !== undefined) updates.color = b.color;
    if (b.engine !== undefined) updates.engine = b.engine;
    if (b.transmission !== undefined) updates.transmission = b.transmission;
    if (b.cbbWholesale !== undefined) updates.cbbWholesale = Number(b.cbbWholesale);
    if (b.cbbRetail !== undefined) updates.cbbRetail = Number(b.cbbRetail);
    if (b.cost !== undefined || b.yourCost !== undefined) updates.yourCost = Number(b.cost || b.yourCost);
    if (b.suggestedPrice !== undefined || b.price !== undefined) updates.suggestedPrice = Number(b.suggestedPrice || b.price);
    if (b.inStock !== undefined) updates.inStock = String(b.inStock).toLowerCase() !== 'false';
    if (b.imageUrl !== undefined || b.image_url !== undefined || b.photoUrl !== undefined) updates.imageUrl = b.imageUrl || b.image_url || b.photoUrl;
    if (b.blackBookValue !== undefined || b.black_book_value !== undefined) {
      const bbv = Number(b.blackBookValue ?? b.black_book_value);
      if (!isNaN(bbv)) {
        updates.blackBookValue = Math.min(10000000, Math.max(1, bbv));
      }
    }

    // Update mirrored inventory (always upsert)
    const mi = state.mirroredInventory.findIndex(x => x.id === id);
    const mirrored = mi >= 0
      ? ({ ...state.mirroredInventory[mi], ...updates } as Vehicle)
      : ({ id, ...(updates as any) } as Vehicle);
    if (mi >= 0) state.mirroredInventory[mi] = mirrored; else state.mirroredInventory.push(mirrored);

    // Also update primary inventory (always upsert to keep inventory visible on refresh)
    const pi = state.inventory.findIndex(x => x.id === id);
    const primary = pi >= 0
      ? ({ ...state.inventory[pi], ...updates } as Vehicle)
      : ({ id, ...(updates as any) } as Vehicle);
    if (pi >= 0) state.inventory[pi] = primary; else state.inventory.push(primary);

    // Persist to Supabase if configured (best-effort, non-blocking for rest of system)
    try { await saveInventoryToSupabase([primary]); } catch(_e){}

    res.json({ success: true, message: 'Vehicle upserted', vehicleId: id });
  } catch (e) {
    res.status(400).json({ success: false, error: (e as Error).message });
  }
});

router.get('/mirrored', (_req: Request, res: Response) => {
  res.json({ success: true, total: state.mirroredInventory.length, vehicles: state.mirroredInventory });
});

export default router;
