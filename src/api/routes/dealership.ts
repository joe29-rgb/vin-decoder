import { Router, Request, Response } from 'express';
import { loadConfig, saveConfig, updateConfig } from '../../modules/dealership-config';
import { getDealershipById, updateDealershipConfig } from '../../modules/multi-tenant';

const router = Router();

router.get('/config', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    
    // If dealership context available, load from Supabase
    if (dealershipId) {
      const dealership = await getDealershipById(dealershipId);
      if (dealership) {
        return res.json({
          success: true,
          dealershipName: dealership.name,
          websiteUrl: dealership.website_url,
          usedInventoryPath: dealership.used_inventory_path,
          newInventoryPath: dealership.new_inventory_path,
          location: dealership.location,
          postalCode: dealership.postal_code,
          province: dealership.province,
          competitorRadiusKm: dealership.competitor_radius_km,
          docFee: dealership.doc_fee,
          cbbApiKey: dealership.cbb_api_key,
          cbbApiUrl: dealership.cbb_api_url,
          logoUrl: dealership.logo_url,
        });
      }
    }
    
    // Fallback to file-based config for backward compatibility
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

router.post('/config', async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const dealershipId = req.dealershipId;
    
    // Build updates object with proper type conversions
    const configUpdates: any = {};
    
    if (updates.dealershipName) configUpdates.name = updates.dealershipName;
    if (updates.websiteUrl) configUpdates.website_url = updates.websiteUrl;
    if (updates.usedInventoryPath) configUpdates.used_inventory_path = updates.usedInventoryPath;
    if (updates.newInventoryPath) configUpdates.new_inventory_path = updates.newInventoryPath;
    if (updates.location) configUpdates.location = updates.location;
    if (updates.postalCode) configUpdates.postal_code = updates.postalCode;
    if (updates.province) configUpdates.province = updates.province;
    if (updates.competitorRadiusKm !== undefined) configUpdates.competitor_radius_km = Number(updates.competitorRadiusKm);
    if (updates.docFee !== undefined) configUpdates.doc_fee = Number(updates.docFee);
    if (updates.cbbApiKey !== undefined) configUpdates.cbb_api_key = updates.cbbApiKey;
    if (updates.cbbApiUrl !== undefined) configUpdates.cbb_api_url = updates.cbbApiUrl;
    if (updates.logoUrl !== undefined) configUpdates.logo_url = updates.logoUrl;
    
    // If dealership context available, save to Supabase
    if (dealershipId) {
      const updatedDealership = await updateDealershipConfig(dealershipId, configUpdates);
      if (updatedDealership) {
        return res.json({
          success: true,
          message: 'Dealership configuration saved successfully',
          config: {
            dealershipName: updatedDealership.name,
            websiteUrl: updatedDealership.website_url,
            usedInventoryPath: updatedDealership.used_inventory_path,
            newInventoryPath: updatedDealership.new_inventory_path,
            location: updatedDealership.location,
            postalCode: updatedDealership.postal_code,
            province: updatedDealership.province,
            competitorRadiusKm: updatedDealership.competitor_radius_km,
            docFee: updatedDealership.doc_fee,
            cbbApiKey: updatedDealership.cbb_api_key,
            cbbApiUrl: updatedDealership.cbb_api_url,
            logoUrl: updatedDealership.logo_url,
          }
        });
      }
    }
    
    // Fallback to file-based config for backward compatibility
    const fileUpdates: any = {};
    if (updates.dealershipName) fileUpdates.dealershipName = updates.dealershipName;
    if (updates.websiteUrl) fileUpdates.websiteUrl = updates.websiteUrl;
    if (updates.usedInventoryPath) fileUpdates.usedInventoryPath = updates.usedInventoryPath;
    if (updates.newInventoryPath) fileUpdates.newInventoryPath = updates.newInventoryPath;
    if (updates.location) fileUpdates.location = updates.location;
    if (updates.postalCode) fileUpdates.postalCode = updates.postalCode;
    if (updates.province) fileUpdates.province = updates.province;
    if (updates.competitorRadiusKm !== undefined) fileUpdates.competitorRadiusKm = Number(updates.competitorRadiusKm);
    if (updates.docFee !== undefined) fileUpdates.docFee = Number(updates.docFee);
    if (updates.cbbApiKey !== undefined) fileUpdates.cbbApiKey = updates.cbbApiKey;
    if (updates.cbbApiUrl !== undefined) fileUpdates.cbbApiUrl = updates.cbbApiUrl;
    if (updates.logoUrl !== undefined) fileUpdates.logoUrl = updates.logoUrl;
    
    const updatedConfig = updateConfig(fileUpdates);
    
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

router.post('/complete-onboarding', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    
    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required'
      });
    }
    
    const updated = await updateDealershipConfig(dealershipId, {
      onboarding_complete: true,
      onboarding_step: 4
    });
    
    if (updated) {
      res.json({
        success: true,
        message: 'Onboarding marked as complete'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update dealership'
      });
    }
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
