import { Router, Request, Response } from 'express';
import { state } from '../state';

const router = Router();

interface DealershipConfig {
  dealershipName: string;
  websiteUrl: string;
  usedInventoryPath: string;
  newInventoryPath: string;
  location: string;
  postalCode: string;
  province: string;
  competitorRadiusKm: number;
  logoUrl?: string;
}

// In-memory config for now (will move to Supabase in multi-tenant implementation)
let dealershipConfig: DealershipConfig = {
  dealershipName: 'My Dealership',
  websiteUrl: '',
  usedInventoryPath: '/search/used/',
  newInventoryPath: '/search/new/',
  location: 'Alberta',
  postalCode: 'T5J',
  province: 'AB',
  competitorRadiusKm: 100,
};

router.get('/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    ...dealershipConfig
  });
});

router.post('/config', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    if (updates.dealershipName) dealershipConfig.dealershipName = updates.dealershipName;
    if (updates.websiteUrl) dealershipConfig.websiteUrl = updates.websiteUrl;
    if (updates.usedInventoryPath) dealershipConfig.usedInventoryPath = updates.usedInventoryPath;
    if (updates.newInventoryPath) dealershipConfig.newInventoryPath = updates.newInventoryPath;
    if (updates.location) dealershipConfig.location = updates.location;
    if (updates.postalCode) dealershipConfig.postalCode = updates.postalCode;
    if (updates.province) dealershipConfig.province = updates.province;
    if (updates.competitorRadiusKm) dealershipConfig.competitorRadiusKm = Number(updates.competitorRadiusKm);
    if (updates.logoUrl !== undefined) dealershipConfig.logoUrl = updates.logoUrl;
    
    res.json({
      success: true,
      message: 'Dealership configuration updated',
      config: dealershipConfig
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
