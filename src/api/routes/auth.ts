import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// OAuth 2.0 configuration for GHL
const GHL_OAUTH_CONFIG = {
  clientId: process.env.GHL_CLIENT_ID || '',
  clientSecret: process.env.GHL_CLIENT_SECRET || '',
  redirectUri: process.env.GHL_REDIRECT_URI || 'http://localhost:10000/api/auth/callback',
  authorizationUrl: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
  tokenUrl: 'https://services.leadconnectorhq.com/oauth/token',
  scopes: [
    'contacts.readonly',
    'contacts.write',
    'opportunities.readonly',
    'opportunities.write',
    'locations/customFields.readonly',
    'locations/customFields.write'
  ]
};

// In-memory token storage (will move to Supabase in multi-tenant implementation)
interface TokenStore {
  [locationId: string]: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    locationId: string;
    companyId: string;
  };
}

const tokenStore: TokenStore = {};

/**
 * Step 1: Redirect user to GHL OAuth authorization page
 */
router.get('/login', (req: Request, res: Response) => {
  const state = Math.random().toString(36).substring(7);
  
  const authUrl = new URL(GHL_OAUTH_CONFIG.authorizationUrl);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', GHL_OAUTH_CONFIG.clientId);
  authUrl.searchParams.append('redirect_uri', GHL_OAUTH_CONFIG.redirectUri);
  authUrl.searchParams.append('scope', GHL_OAUTH_CONFIG.scopes.join(' '));
  authUrl.searchParams.append('state', state);
  
  // Store state in session for CSRF protection
  // TODO: Implement proper session management
  
  res.redirect(authUrl.toString());
});

/**
 * Step 2: Handle OAuth callback from GHL
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code not provided');
    }
    
    // TODO: Verify state for CSRF protection
    
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(GHL_OAUTH_CONFIG.tokenUrl, {
      client_id: GHL_OAUTH_CONFIG.clientId,
      client_secret: GHL_OAUTH_CONFIG.clientSecret,
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: GHL_OAUTH_CONFIG.redirectUri
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const {
      access_token,
      refresh_token,
      expires_in,
      locationId,
      companyId
    } = tokenResponse.data;
    
    // Get or create dealership in Supabase
    const { getOrCreateDealership, storeDealershipTokens } = await import('../../modules/multi-tenant');
    const dealership = await getOrCreateDealership(locationId, companyId);
    
    if (!dealership) {
      return res.status(500).send('Failed to create dealership record');
    }
    
    // Store OAuth tokens in dealership record
    await storeDealershipTokens(dealership.id, access_token, refresh_token, expires_in);
    
    // Store tokens in memory for backward compatibility
    tokenStore[locationId] = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (expires_in * 1000),
      locationId,
      companyId
    };
    
    // Create JWT for dealership context
    const { createDealershipToken } = await import('../middleware/dealership-context');
    const token = createDealershipToken({
      dealershipId: dealership.id,
      locationId: dealership.ghl_location_id,
      companyId: dealership.ghl_company_id,
    });
    
    // Set JWT as cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax',
    });
    
    // Redirect based on onboarding status
    if (dealership.onboarding_complete) {
      res.redirect('/dashboard?auth=success');
    } else {
      res.redirect('/onboarding?auth=success');
    }
  } catch (error: any) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.status(500).send('Authentication failed: ' + (error.response?.data?.error || error.message));
  }
});

/**
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { locationId } = req.body;
    
    if (!locationId || !tokenStore[locationId]) {
      return res.status(400).json({
        success: false,
        error: 'Location ID not provided or not found'
      });
    }
    
    const { refreshToken } = tokenStore[locationId];
    
    const tokenResponse = await axios.post(GHL_OAUTH_CONFIG.tokenUrl, {
      client_id: GHL_OAUTH_CONFIG.clientId,
      client_secret: GHL_OAUTH_CONFIG.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const {
      access_token,
      refresh_token: new_refresh_token,
      expires_in
    } = tokenResponse.data;
    
    // Update stored tokens
    tokenStore[locationId] = {
      ...tokenStore[locationId],
      accessToken: access_token,
      refreshToken: new_refresh_token || refreshToken,
      expiresAt: Date.now() + (expires_in * 1000)
    };
    
    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });
  } catch (error: any) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token: ' + (error.response?.data?.error || error.message)
    });
  }
});

/**
 * Get current authentication status
 */
router.get('/status', (req: Request, res: Response) => {
  // TODO: Get locationId from session or JWT
  const locationId = req.query.locationId as string;
  
  if (!locationId || !tokenStore[locationId]) {
    return res.json({
      authenticated: false
    });
  }
  
  const token = tokenStore[locationId];
  const isExpired = Date.now() >= token.expiresAt;
  
  res.json({
    authenticated: !isExpired,
    locationId: token.locationId,
    companyId: token.companyId,
    expiresAt: token.expiresAt
  });
});

/**
 * Logout - clear tokens
 */
router.post('/logout', (req: Request, res: Response) => {
  const { locationId } = req.body;
  
  if (locationId && tokenStore[locationId]) {
    delete tokenStore[locationId];
  }
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Get access token for a location (for internal use)
 */
export function getAccessToken(locationId: string): string | null {
  const token = tokenStore[locationId];
  
  if (!token) {
    return null;
  }
  
  // Check if token is expired
  if (Date.now() >= token.expiresAt) {
    return null;
  }
  
  return token.accessToken;
}

export default router;
