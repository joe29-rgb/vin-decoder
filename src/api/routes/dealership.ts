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
  docFee: number;
  ppsaFee: number;
  cbbApiKey?: string;
  cbbApiUrl?: string;
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
  docFee: 799,
  ppsaFee: 38.73,
  cbbApiKey: '',
  cbbApiUrl: 'https://api.canadianblackbook.com/v1',
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
    if (updates.docFee !== undefined) dealershipConfig.docFee = Number(updates.docFee);
    if (updates.ppsaFee !== undefined) dealershipConfig.ppsaFee = Number(updates.ppsaFee);
    if (updates.cbbApiKey !== undefined) dealershipConfig.cbbApiKey = updates.cbbApiKey;
    if (updates.cbbApiUrl !== undefined) dealershipConfig.cbbApiUrl = updates.cbbApiUrl;
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

router.post('/test-blackbook', async (req: Request, res: Response) => {
  try {
    const { apiKey, apiUrl } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API key is required'
      });
    }
    
    // Test the Black Book API connection
    const axios = await import('axios');
    const testUrl = apiUrl || 'https://api.canadianblackbook.com/v1';
    
    // Make a test request to validate the API key
    const response = await axios.default.get(`${testUrl}/health`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    res.json({
      success: true,
      message: 'Black Book API connection successful',
      status: response.status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect to Black Book API',
      details: error.response?.data || 'Connection failed'
    });
  }
});

export default router;
