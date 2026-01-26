import { Router, Request, Response } from 'express';
import { loadConfig, saveConfig, updateConfig } from '../../modules/dealership-config';

const router = Router();

router.get('/config', (_req: Request, res: Response) => {
  try {
    const config = loadConfig();
    res.json({
      success: true,
      ...config
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/config', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    // Build updates object with proper type conversions
    const configUpdates: any = {};
    
    if (updates.dealershipName) configUpdates.dealershipName = updates.dealershipName;
    if (updates.websiteUrl) configUpdates.websiteUrl = updates.websiteUrl;
    if (updates.usedInventoryPath) configUpdates.usedInventoryPath = updates.usedInventoryPath;
    if (updates.newInventoryPath) configUpdates.newInventoryPath = updates.newInventoryPath;
    if (updates.location) configUpdates.location = updates.location;
    if (updates.postalCode) configUpdates.postalCode = updates.postalCode;
    if (updates.province) configUpdates.province = updates.province;
    if (updates.competitorRadiusKm !== undefined) configUpdates.competitorRadiusKm = Number(updates.competitorRadiusKm);
    if (updates.docFee !== undefined) configUpdates.docFee = Number(updates.docFee);
    if (updates.ppsaFee !== undefined) configUpdates.ppsaFee = Number(updates.ppsaFee);
    if (updates.cbbApiKey !== undefined) configUpdates.cbbApiKey = updates.cbbApiKey;
    if (updates.cbbApiUrl !== undefined) configUpdates.cbbApiUrl = updates.cbbApiUrl;
    if (updates.logoUrl !== undefined) configUpdates.logoUrl = updates.logoUrl;
    
    const updatedConfig = updateConfig(configUpdates);
    
    res.json({
      success: true,
      message: 'Dealership configuration saved successfully',
      config: updatedConfig
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
