import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('req', { method: req.method, path: req.path, status: res.statusCode, duration });
  });
  next();
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  logger.error('error', { message: err?.message, stack: err?.stack, path: req.path });
  const status = err?.status || err?.statusCode || 500;
  res.status(status).json({ success: false, error: err?.message || 'Internal Server Error' });
}

export function healthCheck(_req: Request, res: Response) {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}
