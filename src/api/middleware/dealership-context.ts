import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface DealershipContext {
  dealershipId: string;
  locationId: string;
  companyId?: string;
}

declare global {
  namespace Express {
    interface Request {
      dealershipId?: string;
      dealershipContext?: DealershipContext;
    }
  }
}

/**
 * Middleware to extract dealership context from JWT or headers
 * This runs on every request to identify which dealership is making the request
 */
export function injectDealershipContext(req: Request, res: Response, next: NextFunction) {
  try {
    console.log(`[DEALERSHIP-CONTEXT] Processing request: ${req.method} ${req.path}`);
    
    // Priority 1: JWT from cookie
    const token = req.cookies?.auth_token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as DealershipContext;
        req.dealershipId = decoded.dealershipId;
        req.dealershipContext = decoded;
        console.log(`[DEALERSHIP-CONTEXT] ✅ Set from JWT cookie: ${req.dealershipId}`);
        return next();
      } catch (error) {
        // Invalid token, continue to fallbacks
        console.log('[DEALERSHIP-CONTEXT] JWT cookie invalid, trying fallbacks...');
      }
    }

    // Priority 2: JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as DealershipContext;
        req.dealershipId = decoded.dealershipId;
        req.dealershipContext = decoded;
        console.log(`[DEALERSHIP-CONTEXT] ✅ Set from Authorization header: ${req.dealershipId}`);
        return next();
      } catch (error) {
        // Invalid token, continue to fallbacks
        console.log('[DEALERSHIP-CONTEXT] Authorization header invalid, trying fallbacks...');
      }
    }

    // Priority 3: Header (for testing/development)
    const headerDealershipId = req.headers['x-dealership-id'] as string;
    if (headerDealershipId) {
      req.dealershipId = headerDealershipId;
      req.dealershipContext = {
        dealershipId: headerDealershipId,
        locationId: 'test-location',
      };
      console.log(`[DEALERSHIP-CONTEXT] ✅ Set from x-dealership-id header: ${req.dealershipId}`);
      return next();
    }

    // Priority 4: Query param (for testing/development)
    const queryDealershipId = req.query.dealershipId as string;
    if (queryDealershipId) {
      req.dealershipId = queryDealershipId;
      req.dealershipContext = {
        dealershipId: queryDealershipId,
        locationId: 'test-location',
      };
      console.log(`[DEALERSHIP-CONTEXT] ✅ Set from query param: ${req.dealershipId}`);
      return next();
    }

    // Priority 5: Default dealership for development (prevents data loss)
    // In production, this should be removed and auth should be required
    const nodeEnv = process.env.NODE_ENV;
    console.log(`[DEALERSHIP-CONTEXT] NODE_ENV: ${nodeEnv || 'undefined'}`);
    
    if (nodeEnv !== 'production') {
      req.dealershipId = '00000000-0000-0000-0000-000000000001'; // Default to Calgary Auto Centre
      req.dealershipContext = {
        dealershipId: '00000000-0000-0000-0000-000000000001',
        locationId: 'default-location',
      };
      console.log(`[DEALERSHIP-CONTEXT] ✅ Set default for development: ${req.dealershipId}`);
      return next();
    }

    // No dealership context found - this is OK for public routes
    console.log('[DEALERSHIP-CONTEXT] ⚠️ No dealership context set (production mode or public route)');
    next();
  } catch (error) {
    console.error('Error in injectDealershipContext:', error);
    next();
  }
}

/**
 * Middleware to require dealership context
 * Use this on routes that MUST have a dealership context
 */
export function requireDealership(req: Request, res: Response, next: NextFunction) {
  if (!req.dealershipId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Dealership context not found. Please log in.',
    });
  }
  next();
}

/**
 * Create JWT token for dealership
 */
export function createDealershipToken(context: DealershipContext): string {
  return jwt.sign(context, JWT_SECRET, {
    expiresIn: '30d', // 30 days
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyDealershipToken(token: string): DealershipContext | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DealershipContext;
  } catch (error) {
    return null;
  }
}
