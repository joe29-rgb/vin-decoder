import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import config from './config/config';
import logger from './utils/logger';
import { requestLogger, errorHandler, healthCheck } from './api/middleware';
import dealsRouter from './api/routes/deals';
import inventoryRouter from './api/routes/inventory';
import webhooksRouter from './api/routes/webhooks';

dotenv.config();

const app = express();
// Allow a separate NEW_PORT so we can run alongside the existing server for verification.
const PORT = Number(process.env.NEW_PORT || process.env.PORT || config.PORT || 10001);

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// API routes (skeletons)
app.use('/api/deals', dealsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/webhooks', webhooksRouter);
// Backward-compatibility mounts for legacy paths
app.use('/api', dealsRouter);      // provides /api/lenders, /api/deals/*
app.use('/api', webhooksRouter);   // provides /api/rules/*, /api/approvals/*, /api/ghl/*

// Health
app.get('/health', healthCheck);

// Static assets (no-store to avoid stale JS)
app.use(
  '/public',
  express.static(path.join(process.cwd(), 'dist', 'public'), {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store');
    },
  })
);

// Global error handler last
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`server listening`, { port: PORT });
});

export default app;
