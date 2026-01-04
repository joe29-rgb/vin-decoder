import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import config from './config/config';
import logger from './utils/logger';
import { requestLogger, errorHandler, healthCheck } from './api/middleware';
import dealsRouter from './api/routes/deals';
import inventoryRouter from './api/routes/inventory';
import webhooksRouter from './api/routes/webhooks';
import scrapeRouter from './api/routes/scrape';
import ghlRouter from './api/routes/ghl';
import carfaxRouter from './api/routes/carfax';
import geolocationRouter from './api/routes/geolocation';

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
app.use('/api/scrape', scrapeRouter);
app.use('/api/ghl', ghlRouter);
app.use('/api/carfax', carfaxRouter);
app.use('/api/location', geolocationRouter);
// Backward-compatibility mounts for legacy paths
app.use('/api', dealsRouter);      // provides /api/lenders, /api/deals/*
app.use('/api', webhooksRouter);   // provides /api/rules/*, /api/approvals/*

// Health
app.get('/health', healthCheck);

// UI routes
app.get('/', (_req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', (_req, res) => {
  const htmlPath = path.join(process.cwd(), 'src', 'views', 'dashboard.html');
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

app.listen(PORT, () => {
  logger.info(`server listening`, { port: PORT });
});

export default app;
