/**
 * GHL OAuth and Webhook Routes
 * Handles authentication, token management, and webhook processing
 */

import { Router, Request, Response } from 'express';
import { storeToken, clearToken, hasToken } from '../../modules/ghl-oauth';
import { verifyWebhookSignature, parseWebhookEvent, processWebhook } from '../../modules/ghl-webhook';
import { saveDealToGHL } from '../../modules/ghl-integration';
import logger from '../../utils/logger';

const router = Router();

router.post('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, location_id } = req.body;
    
    if (!code || !location_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing code or location_id' 
      });
    }
    
    const clientId = process.env.GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;
    const redirectUri = process.env.GHL_REDIRECT_URI || 'https://your-domain.com/ghl/callback';
    
    if (!clientId || !clientSecret) {
      return res.status(500).json({
        success: false,
        error: 'GHL OAuth not configured'
      });
    }
    
    const axios = require('axios');
    const tokenResponse = await axios.post(
      'https://services.leadconnectorhq.com/oauth/token',
      {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    storeToken(location_id, access_token, refresh_token, expires_in);
    
    logger.info('GHL OAuth successful', { location_id });
    
    res.json({
      success: true,
      message: 'Authentication successful',
      location_id,
      expires_in,
    });
  } catch (error: any) {
    logger.error('GHL OAuth callback failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/oauth/disconnect', async (req: Request, res: Response) => {
  try {
    const { location_id } = req.body;
    
    if (!location_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing location_id'
      });
    }
    
    clearToken(location_id);
    
    logger.info('GHL OAuth disconnected', { location_id });
    
    res.json({
      success: true,
      message: 'Disconnected successfully'
    });
  } catch (error: any) {
    logger.error('GHL disconnect failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/save-deal', async (req: Request, res: Response) => {
  try {
    const { contactId, locationId, deal } = req.body;
    
    if (!contactId || !locationId || !deal) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contactId, locationId, deal'
      });
    }
    
    if (!hasToken(locationId)) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with GHL. Please connect first.'
      });
    }
    
    logger.info('Saving deal to GHL', { contactId, locationId });
    
    const result = await saveDealToGHL(contactId, locationId, deal);
    
    res.json({
      success: true,
      message: 'Deal saved to GHL successfully',
      result
    });
  } catch (error: any) {
    logger.error('Save deal to GHL failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/oauth/status', async (req: Request, res: Response) => {
  try {
    const { location_id } = req.query;
    
    if (!location_id || typeof location_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing location_id'
      });
    }
    
    const connected = hasToken(location_id);
    
    res.json({
      success: true,
      connected,
      location_id
    });
  } catch (error: any) {
    logger.error('GHL status check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-ghl-signature'] as string;
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.warn('GHL_WEBHOOK_SECRET not configured, skipping signature verification');
    } else if (!signature) {
      logger.warn('Webhook received without signature');
      return res.status(401).json({
        success: false,
        error: 'Missing signature'
      });
    } else {
      const payload = JSON.stringify(req.body);
      const isValid = verifyWebhookSignature(payload, signature, webhookSecret);
      
      if (!isValid) {
        logger.warn('Invalid webhook signature');
        return res.status(401).json({
          success: false,
          error: 'Invalid signature'
        });
      }
    }
    
    const event = parseWebhookEvent(req.body);
    
    if (!event) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook payload'
      });
    }
    
    logger.info('Webhook received', {
      type: event.type,
      locationId: event.locationId,
      contactId: event.contactId
    });
    
    const result = await processWebhook(event);
    
    res.json(result);
  } catch (error: any) {
    logger.error('Webhook processing error', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/push-selected', async (req: Request, res: Response) => {
  try {
    const { contactId, locationId, selected } = req.body;
    
    if (!contactId || !locationId || !selected) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contactId, locationId, selected'
      });
    }
    
    if (!hasToken(locationId)) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with GHL. Please connect your account first.'
      });
    }
    
    const deal = {
      id: selected.vehicleId || selected.vin,
      vehicle: {
        id: selected.vehicleId || selected.vin,
        vin: selected.vin,
        year: selected.year || 0,
        make: selected.make || 'Unknown',
        model: selected.model || 'Unknown',
      },
      salePrice: selected.salePrice || 0,
      downPayment: selected.downPayment || 0,
      financeAmount: selected.financeAmount || selected.salePrice || 0,
      monthlyPayment: selected.monthlyPayment || 0,
      lender: selected.lender || 'Unknown',
      tier: selected.tier || 'Unknown',
      compliance: {
        dsr: selected.dsr || 0,
        dsrPass: true,
        ltv: selected.ltv || 0,
        ltvPass: true,
        overall: true,
      },
      grossProfit: {
        vehicleGross: selected.frontGross || 0,
        lenderReserve: selected.backGross || 0,
        rateUpsell: 0,
        productMargin: 0,
        total: selected.totalGross || 0,
      },
    };
    
    const result = await saveDealToGHL(deal as any, contactId, locationId);
    
    res.json(result);
  } catch (error: any) {
    logger.error('Push to GHL failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
