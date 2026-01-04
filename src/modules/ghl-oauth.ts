/**
 * GHL OAuth Token Management
 * Handles token refresh, storage, and automatic retry logic
 */

import axios from 'axios';
import logger from '../utils/logger';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  location_id?: string;
}

const tokenStore = new Map<string, TokenData>();

export async function getValidToken(locationId: string): Promise<string> {
  const stored = tokenStore.get(locationId);
  
  if (!stored) {
    throw new Error('No token found for location. Please authenticate first.');
  }
  
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000;
  
  if (stored.expires_at - now > bufferTime) {
    return stored.access_token;
  }
  
  logger.info('Token expiring soon, refreshing...', { locationId });
  const newToken = await refreshToken(stored.refresh_token, locationId);
  return newToken;
}

export async function refreshToken(refreshToken: string, locationId: string): Promise<string> {
  try {
    const clientId = process.env.GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('GHL_CLIENT_ID and GHL_CLIENT_SECRET must be set in environment');
    }
    
    const response = await axios.post(
      'https://services.leadconnectorhq.com/oauth/token',
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      }
    );
    
    const { access_token, refresh_token: new_refresh, expires_in } = response.data;
    
    const tokenData: TokenData = {
      access_token,
      refresh_token: new_refresh || refreshToken,
      expires_at: Date.now() + (expires_in * 1000),
      location_id: locationId,
    };
    
    tokenStore.set(locationId, tokenData);
    logger.info('Token refreshed successfully', { locationId });
    
    return access_token;
  } catch (error: any) {
    logger.error('Token refresh failed', { 
      locationId, 
      error: error.message,
      status: error.response?.status 
    });
    throw new Error(`Failed to refresh GHL token: ${error.message}`);
  }
}

export function storeToken(
  locationId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): void {
  const tokenData: TokenData = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Date.now() + (expiresIn * 1000),
    location_id: locationId,
  };
  
  tokenStore.set(locationId, tokenData);
  logger.info('Token stored', { locationId, expiresIn });
}

export function clearToken(locationId: string): void {
  tokenStore.delete(locationId);
  logger.info('Token cleared', { locationId });
}

export function hasToken(locationId: string): boolean {
  return tokenStore.has(locationId);
}
