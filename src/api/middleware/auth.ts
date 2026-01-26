import { Request, Response, NextFunction } from 'express';
import { getAccessToken } from '../routes/auth';

/**
 * Authentication middleware for protected routes
 * Verifies that the user has a valid access token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // TODO: Get locationId from session or JWT
  const locationId = req.headers['x-location-id'] as string || req.query.locationId as string;
  
  if (!locationId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Location ID not provided'
    });
  }
  
  const accessToken = getAccessToken(locationId);
  
  if (!accessToken) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Invalid or expired access token. Please log in again.'
    });
  }
  
  // Attach locationId and token to request for downstream use
  (req as any).locationId = locationId;
  (req as any).accessToken = accessToken;
  
  next();
}

/**
 * Optional authentication middleware
 * Allows the request to proceed even if not authenticated
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const locationId = req.headers['x-location-id'] as string || req.query.locationId as string;
  
  if (locationId) {
    const accessToken = getAccessToken(locationId);
    
    if (accessToken) {
      (req as any).locationId = locationId;
      (req as any).accessToken = accessToken;
    }
  }
  
  next();
}
