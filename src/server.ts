import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import config from './config/config';
import logger from './utils/logger';
import { requestLogger, errorHandler, healthCheck } from './api/middleware';
import { injectDealershipContext } from './api/middleware/dealership-context';
import dealsRouter from './api/routes/deals';
import inventoryRouter from './api/routes/inventory';
import webhooksRouter from './api/routes/webhooks';
import scrapeRouter from './api/routes/scrape';
import ghlRouter from './api/routes/ghl';
import carfaxRouter from './api/routes/carfax';
import geolocationRouter from './api/routes/geolocation';
import inventorySyncRouter from './api/routes/inventory-sync';
import reportsRouter from './api/routes/reports';
import dealershipsRouter from './api/routes/dealerships';
import smartsheetRouter from './api/routes/smartsheet';
import inventoryManagementRouter from './api/routes/inventory-management';
import dealsManagementRouter from './api/routes/deals-management';
import jobsRouter from './api/routes/jobs';
import dealershipRouter from './api/routes/dealership';
import authRouter from './api/routes/auth';
import hotDealsRouter from './api/routes/hot-deals';
import magicButtonRouter from './api/routes/magic-button';
import leaderboardRouter from './api/routes/leaderboard';
import predictiveScoringRouter from './api/routes/predictive-scoring';
import lenderProgramsRouter from './api/routes/lender-programs';

dotenv.config();

const app = express();
// Allow a separate NEW_PORT so we can run alongside the existing server for verification.
const PORT = Number(process.env.NEW_PORT || process.env.PORT || config.PORT || 10001);

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(requestLogger);
app.use(injectDealershipContext);

// API routes
app.use('/api/auth', authRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/scrape', scrapeRouter);
app.use('/api/ghl', ghlRouter);
app.use('/api/carfax', carfaxRouter);
app.use('/api/location', geolocationRouter);
app.use('/api/sync', inventorySyncRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/dealerships', dealershipsRouter);
app.use('/api/dealership', dealershipRouter);
app.use('/api/smartsheet', smartsheetRouter);
app.use('/api/inventory-management', inventoryManagementRouter);
app.use('/api/deals-management', dealsManagementRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/hot-deals', hotDealsRouter);
app.use('/api/magic-button', magicButtonRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/predictive-scoring', predictiveScoringRouter);
app.use('/api/lender-programs', lenderProgramsRouter);
// Backward-compatibility mounts for legacy paths
app.use('/api', dealsRouter);      // provides /api/lenders, /api/deals/*
app.use('/api', webhooksRouter);   // provides /api/rules/*, /api/approvals/*

// Health
app.get('/health', healthCheck);

// UI routes
app.get('/', (_req, res) => {
  res.redirect('/dashboard');
});

// Backward-compatibility routes for /upload, /sync (must come after specific routes)
app.post('/upload', inventoryRouter);
app.post('/sync', inventoryRouter);

app.get('/dashboard', (_req, res) => {
  const htmlPath = path.join(process.cwd(), 'src', 'views', 'dashboard.html');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:");
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.resolve(htmlPath));
});

app.get('/deal-calculator', (_req, res) => {
  const htmlPath = path.join(process.cwd(), 'src', 'views', 'deal-calculator.html');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:");
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.resolve(htmlPath));
});

app.get('/deal-worksheet', (_req, res) => {
  const htmlPath = path.join(process.cwd(), 'src', 'views', 'deal-worksheet.html');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:");
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.resolve(htmlPath));
});

app.get('/settings', (_req, res) => {
  const htmlPath = path.join(process.cwd(), 'src', 'views', 'settings.html');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:");
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.resolve(htmlPath));
});

app.get('/onboarding', (_req, res) => {
  const htmlPath = path.join(process.cwd(), 'src', 'views', 'onboarding.html');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:");
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.resolve(htmlPath));
});

app.get('/hot-deals', (_req, res) => {
  const htmlPath = path.join(process.cwd(), 'src', 'views', 'hot-deals-dashboard.html');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:");
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.resolve(htmlPath));
});

app.get('/leaderboard', (_req, res) => {
  const htmlPath = path.join(process.cwd(), 'src', 'views', 'leaderboard.html');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:");
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.resolve(htmlPath));
});

app.get('/inventory-insights', (_req, res) => {
  const htmlPath = path.join(process.cwd(), 'src', 'views', 'inventory-insights.html');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:");
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.resolve(htmlPath));
});

app.get('/multi-approval', (_req, res) => {
  const htmlPath = path.join(process.cwd(), 'src', 'views', 'multi-approval-scoring.html');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:");
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.resolve(htmlPath));
});

app.get('/dashboard.js', (_req, res) => {
  const distPath = path.join(process.cwd(), 'dist', 'public', 'dashboard.js');
  const srcPath = path.join(process.cwd(), 'src', 'public', 'dashboard.js');
  const p = fs.existsSync(distPath) ? distPath : srcPath;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.resolve(p), { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }, (err) => {
    if (err) {
      res.status(500).send("console.error('Failed to load dashboard.js');");
    }
  });
});

app.get('/deal-calculator.js', (_req, res) => {
  const distPath = path.join(process.cwd(), 'dist', 'public', 'deal-calculator.js');
  const srcPath = path.join(process.cwd(), 'src', 'public', 'deal-calculator.js');
  const p = fs.existsSync(distPath) ? distPath : srcPath;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.resolve(p), { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }, (err) => {
    if (err) {
      res.status(500).send("console.error('Failed to load deal-calculator.js');");
    }
  });
});

app.get('/deal-worksheet.js', (_req, res) => {
  const distPath = path.join(process.cwd(), 'dist', 'public', 'deal-worksheet.js');
  const srcPath = path.join(process.cwd(), 'src', 'public', 'deal-worksheet.js');
  const p = fs.existsSync(distPath) ? distPath : srcPath;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.resolve(p), { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }, (err) => {
    if (err) {
      res.status(500).send("console.error('Failed to load deal-worksheet.js');");
    }
  });
});

app.get('/settings.js', (_req, res) => {
  const distPath = path.join(process.cwd(), 'dist', 'public', 'settings.js');
  const srcPath = path.join(process.cwd(), 'src', 'public', 'settings.js');
  const p = fs.existsSync(distPath) ? distPath : srcPath;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.resolve(p), { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }, (err) => {
    if (err) {
      res.status(500).send("console.error('Failed to load settings.js');");
    }
  });
});

app.get('/onboarding.js', (_req, res) => {
  const distPath = path.join(process.cwd(), 'dist', 'public', 'onboarding.js');
  const srcPath = path.join(process.cwd(), 'src', 'public', 'onboarding.js');
  const p = fs.existsSync(distPath) ? distPath : srcPath;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.resolve(p), { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }, (err) => {
    if (err) {
      res.status(500).send("console.error('Failed to load onboarding.js');");
    }
  });
});

app.get('/public/inventory-template.csv', (_req, res) => {
  const distPath = path.join(process.cwd(), 'dist', 'public', 'inventory-template.csv');
  const srcPath = path.join(process.cwd(), 'src', 'public', 'inventory-template.csv');
  const p = fs.existsSync(distPath) ? distPath : srcPath;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.resolve(p), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } }, (err) => {
    if (err) {
      res.status(404).send('CSV template not found');
    }
  });
});

app.get('/favicon.ico', (_req, res) => { res.status(204).end(); });

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

// Initialize inventory from Supabase on startup
(async () => {
  try {
    const { fetchInventoryFromSupabase } = await import('./modules/supabase');
    const { state } = await import('./api/state');
    const inventory = await fetchInventoryFromSupabase();
    if (inventory && inventory.length > 0) {
      state.inventory = inventory;
      logger.info('Loaded inventory from Supabase', { count: inventory.length });
    }
  } catch (error) {
    logger.warn('Failed to load inventory on startup', { error: (error as Error).message });
  }
})();

app.listen(PORT, () => {
  logger.info(`server listening`, { port: PORT });
});

export default app;
