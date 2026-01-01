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

// UI routes
app.get('/', (_req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', (_req, res) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data: https:");
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Finance-in-a-Box Dashboard</title>
    <style>
      body { font-family: system-ui, Arial, sans-serif; margin: 20px; }
      header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
      button { padding: 8px 12px; border: 1px solid #444; background: #111; color: #fff; border-radius: 6px; cursor: pointer; }
      button:disabled { opacity: .5; cursor: default; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
      .card { border: 1px solid #ddd; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.05); background: #fff; }
      .card img { width: 100%; height: 180px; object-fit: cover; background: #f2f2f2; }
      .card .body { padding: 12px; display: grid; gap: 6px; }
      .row { display: flex; justify-content: space-between; font-size: 14px; }
      .gross { font-weight: 700; }
      .flags { color: #b30000; font-size: 12px; }
      :root{ --bg:#0b0d10; --panel:#12161b; --muted:#9aa4b2; --text:#e7edf5; --accent:#6ee7b7; --accent2:#60a5fa; --danger:#ef4444; --border:#1f2430; }
      html,body{ background: linear-gradient(180deg,#0b0d10 0%,#0e1217 100%); color: var(--text); margin:0; }
      .container{ max-width: 1200px; margin: 24px auto; padding: 0 16px; }
      .topbar{ position: sticky; top:0; z-index:10; display:flex; justify-content:space-between; align-items:center; padding:14px 20px; background:rgba(10,12,15,.7); backdrop-filter: blur(8px); border-bottom:1px solid var(--border); }
      .brand{ display:flex; align-items:center; gap:12px; }
      .logo{ width:36px; height:36px; border-radius:8px; background: linear-gradient(135deg,var(--accent),var(--accent2)); display:flex; align-items:center; justify-content:center; color:#001b12; font-weight:800; }
      .title{ font-weight:700; letter-spacing:.3px; }
      .subtitle{ color: var(--muted); font-size:12px; margin-top:2px; }
      .actions{ display:flex; gap:10px; }
      .btn{ padding:10px 14px; border-radius:8px; border:1px solid var(--border); background:#11161d; color:var(--text); transition: all .15s ease; }
      .btn:hover{ transform: translateY(-1px); border-color:#2a3242; }
      .btn.primary{ background: linear-gradient(135deg,var(--accent),#22c55e); color:#052015; border:0; font-weight:700; }
      .meta{ margin:16px 0; color:var(--muted); }
      .toolbar{ display:flex; justify-content:space-between; align-items:center; gap:12px; background:var(--panel); padding:12px; border:1px solid var(--border); border-radius:12px; margin-bottom:16px; }
      .select,.search{ background:#0e1319; color:var(--text); border:1px solid var(--border); border-radius:8px; padding:10px 12px; }
      .search{ min-width:240px; }
      .grid{ grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:18px; }
      .card{ background:var(--panel); border:1px solid var(--border); border-radius:14px; box-shadow: 0 6px 18px rgba(0,0,0,.2); overflow:hidden; }
      .card img{ height:190px; }
      .card .body{ padding:14px; }
      .chip{ display:inline-block; padding:4px 8px; border-radius:999px; border:1px solid var(--border); color:var(--muted); font-size:12px; }
      .flags{ color: var(--danger); font-size:12px; }
      .toast{ position: fixed; right: 18px; bottom: 18px; background:#0e1319; border:1px solid var(--border); border-radius:10px; padding:12px 14px; display:none; }
      .toast.show{ display:block; }
      .modal.hidden{ display:none; }
      .modal{ position:fixed; inset:0; display:grid; place-items:center; }
      .modal-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,.6); }
      .modal-body{ position:relative; z-index:1; width:min(920px,90vw); background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:16px; display:grid; gap:10px; }
      .textarea{ width:100%; min-height:220px; background:#0e1319; color:var(--text); border:1px solid var(--border); border-radius:10px; padding:10px; font-family: ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      .uploader{ display:flex; gap:10px; align-items:center; }
      .modal-actions{ display:flex; justify-content:flex-end; gap:10px; }
      .panel{ background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:12px; }
      .table{ width:100%; border-collapse: collapse; font-size:13px; }
      .table th,.table td{ border-bottom:1px solid var(--border); padding:8px; text-align:left; }
      .table th{ color:var(--muted); font-weight:600; }
      .hidden{ display:none; }
    </style>
  </head>
  <body>
    <div class="topbar">
      <div class="brand">
        <div class="logo">FiB</div>
        <div>
          <div class="title">Finance‑in‑a‑Box</div>
          <div class="subtitle">Deal Matrix</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn" id="uploadInventory">Upload Inventory CSV</button>
        <button class="btn" id="uploadRules">Upload Rules</button>
        <button class="btn" id="uploadApproval">Upload Approval</button>
        <button class="btn" id="load">Load Approval</button>
        <button class="btn primary" id="score" disabled>Calculate Matrix</button>
      </div>
    </div>
    <div class="container">
      <div id="meta" class="meta"></div>
      <div class="toolbar">
        <div>
          <label for="sortBy" style="color:var(--muted); font-size:12px;">Sort</label>
          <select id="sortBy" class="select">
            <option value="total">Total Gross</option>
            <option value="front">Front Gross</option>
            <option value="back">Back Gross</option>
            <option value="payment">Payment</option>
          </select>
        </div>
        <input id="search" class="search" placeholder="Search VIN, Make, Model" />
        <button class="btn" id="toggleInventory">View Inventory</button>
      </div>
      <div id="grid" class="grid"></div>
      <div id="inventorySection" class="panel hidden">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="font-weight:700;">Inventory</div>
          <div style="color:var(--muted); font-size:12px;">Persisted via Supabase (if configured)</div>
        </div>
        <div style="overflow:auto;">
          <table id="inventoryTable" class="table">
            <thead>
              <tr>
                <th>Stock</th>
                <th>VIN</th>
                <th>Year</th>
                <th>Make</th>
                <th>Model</th>
                <th>Cost</th>
                <th>Price</th>
                <th>BB</th>
                <th>CBB W/R</th>
                <th>Image</th>
                <th></th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="toast" class="toast"></div>

    <div id="inventoryModal" class="modal hidden">
      <div class="modal-backdrop"></div>
      <div class="modal-body">
        <h3 style="margin:0">Inventory Upload</h3>
        <p style="margin:0;color:var(--muted)">Upload a .csv file or paste CSV content. Columns supported: stock, vin, year, make, model, trim, mileage, color, engine, transmission, your_cost, suggested_price, in_stock, image_url, black_book_value, cbb_wholesale, cbb_retail. Common aliases are also accepted (e.g. cost/price/kms/bb_wholesale/bb_retail). You can also parse a PDF to extract text.</p>
        <div class="uploader">
          <input type="file" id="inventoryFile" accept=".csv,text/csv" />
          <input type="file" id="inventoryPdf" accept="application/pdf" />
          <button class="btn" id="parseInventoryPdf">Parse PDF</button>
          <a class="btn" href="/public/inventory-template.csv" download target="_blank">Download CSV Template</a>
        </div>
        <textarea id="inventoryText" class="textarea" placeholder="stock,vin,year,make,model,your_cost,suggested_price,image_url\nSTK001,2HGFC2F59MH000001,2021,Honda,Civic,18000,21995,https://.../civic.jpg"></textarea>
        <div class="modal-actions">
          <button class="btn" id="closeInventory">Cancel</button>
          <button class="btn" id="saveInventoryFile">Upload File</button>
          <button class="btn primary" id="saveInventory">Upload</button>
        </div>
      </div>
    </div>

    <div id="detailsModal" class="modal hidden">
      <div class="modal-backdrop"></div>
      <div class="modal-body">
        <h3 style="margin:0">Deal Details</h3>
        <div id="detailsContent" class="textarea" style="min-height:140px;">
        </div>
        <div class="modal-actions">
          <button class="btn" id="closeDetails">Close</button>
        </div>
      </div>
    </div>

    <div id="approvalModal" class="modal hidden">
      <div class="modal-backdrop"></div>
      <div class="modal-body">
        <h3 style="margin:0">Approval Upload</h3>
        <p style="margin:0;color:var(--muted)">Paste approval JSON matching the /api/approvals/ingest schema or parse from a PDF.</p>
        <div class="uploader">
          <input type="file" id="approvalPdf" accept="application/pdf" />
          <button class="btn" id="parseApprovalPdf">Parse PDF</button>
        </div>
        <textarea id="approvalText" class="textarea" placeholder='{
  "contactId": "",
  "locationId": "",
  "approval": { "bank": "EdenPark", "program": "Ride 5", "apr": 12.99, "termMonths": 72, "paymentMin": 350, "paymentMax": 450, "frontCapFactor": 1.4, "province": "AB", "downPayment": 0 },
  "trade": { "allowance": 5000, "acv": 4500, "lienBalance": 1000 }
}'></textarea>
        <div class="modal-actions">
          <button class="btn" id="closeApproval">Cancel</button>
          <button class="btn primary" id="saveApproval">Upload</button>
        </div>
      </div>
    </div>

    <div id="rulesModal" class="modal hidden">
      <div class="modal-backdrop"></div>
      <div class="modal-body">
        <h3 style="margin:0">Lender Rules</h3>
        <p style="margin:0;color:var(--muted)">Paste JSON array, upload a .json file, or parse a PDF to extract text.</p>
        <div class="uploader">
          <input type="file" id="rulesFile" accept="application/json" />
          <input type="file" id="rulesPdf" accept="application/pdf" />
          <button class="btn" id="parseRulesPdf">Parse PDF</button>
          <button class="btn" id="loadSample">Load Sample</button>
        </div>
        <textarea id="rulesInput" class="textarea" placeholder="[ {\n  \"bank\": \"EdenPark\",\n  \"program\": \"Ride 5\"\n} ]"></textarea>
        <div class="modal-actions">
          <button class="btn" id="closeRules">Cancel</button>
          <button class="btn primary" id="saveRules">Upload</button>
        </div>
      </div>
    </div>
    <script>
      (function(){
        try {
          var u = '/dashboard.js?ts=' + Date.now();
          fetch(u).then(function(r){
            try {
              console.log('dashboard: fetch /dashboard.js status', r.status, 'ct', r.headers.get('content-type'));
            } catch(_e){}
            return r.text();
          }).then(function(txt){
            try { console.log('dashboard: preview', (txt||'').slice(0,160)); } catch(_e){}
            var s = document.createElement('script');
            s.src = u;
            s.onload = function(){ try { console.log('dashboard: script injected'); } catch(_e){} };
            s.onerror = function(){ try { console.error('dashboard: failed to load /dashboard.js'); } catch(_e){} };
            document.body.appendChild(s);
          }).catch(function(err){ try { console.error('dashboard: fetch failed', err); } catch(_e){} });
        } catch(_e) { try { console.error('dashboard: injection error', _e); } catch(__){} }
      })();
    </script>
  </body>
</html>`);
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
