/**
 * EXPRESS SERVER ENTRY POINT
 * Starts Finance-in-a-Box API server
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import router from './api';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', router);

// Serve static assets from dist/public with no-store caching to avoid stale JS
app.use(
  '/public',
  express.static(path.join(process.cwd(), 'dist', 'public'), {
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store');
    },
  })
);

// Redirect root to dashboard so visiting the base domain shows the UI
app.get('/', (_req, res) => {
  res.redirect('/dashboard');
});

app.get('/health', (req, res) => {
  res.json({ status: 'Finance-in-a-Box API is running' });
});

app.get('/dashboard', (_req, res) => {
  // Set a permissive-but-safe CSP so external fonts and images from HTTPS are allowed
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
      /* Modern UI */
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
      /* Inventory table */
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
    
    <div id="helpModal" class="modal hidden">
      <div class="modal-backdrop"></div>
      <div class="modal-body">
        <h3 style="margin:0">Help & Getting Started</h3>
        <div style="color:var(--muted);font-size:14px;line-height:1.5;margin-top:6px;">
          <ol style="margin:6px 0 0 18px;">
            <li>Step 1: Upload your Inventory (CSV or paste)</li>
            <li>Step 2: Upload your Lender Rules (PDF preferred)</li>
            <li>Step 3: Upload an Approval (PDF or paste)</li>
            <li>Step 4: Click Calculate Deals and open Details</li>
          </ol>
        </div>
        <div class="modal-actions" style="justify-content:space-between;">
          <div style="display:flex; gap:8px;">
            <button class="btn" id="helpOpenInventory">Open Inventory Upload</button>
            <button class="btn" id="helpOpenRules">Open Rules Upload</button>
            <button class="btn" id="helpOpenApproval">Open Approval Upload</button>
          </div>
          <button class="btn" id="closeHelp">Close</button>
        </div>
      </div>
    </div>
      </div>
      <div class="actions">
        <button class="btn" id="uploadInventory">Step 1: Inventory</button>
        <button class="btn" id="uploadRules">Step 2: Lender Rules</button>
        <button class="btn" id="uploadApproval">Step 3: Approval</button>
        <button class="btn" id="load">Reload Approval</button>
        <button class="btn primary" id="score" disabled>Step 4: Calculate Deals</button>
        <button class="btn" id="openHelp">Help</button>
      </div>
    </div>
    <div class="container">
      <div id="meta" class="meta"></div>
      <div id="stepGuide" class="panel" style="margin-bottom:16px;">
        <div style="font-weight:700;margin-bottom:6px;">Quick Start</div>
        <ol style="margin:0;padding-left:18px;color:var(--muted)">
          <li>Step 1: Upload your Inventory CSV or paste it.</li>
          <li>Step 2: Upload your Lender Rules PDF (we parse and suggest).</li>
          <li>Step 3: Upload Approval PDF or paste details.</li>
          <li>Step 4: Click Calculate Deals, then open Details.</li>
        </ol>
      </div>
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
          <button class="btn" id="loadSampleInventory">Load Sample</button>
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
          <button class="btn" id="loadSampleApproval">Load Sample</button>
        </div>
        <textarea id="approvalText" class="textarea" placeholder='{
  "contactId": "CONTACT_ID",
  "locationId": "LOCATION_ID",
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

// Serve a tiny no-content favicon to avoid 404
app.get('/favicon.ico', (_req, res) => { res.status(204).end(); });

// Externalized dashboard JS served from built assets (fallback route)
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

// CSV template fallback route (served from dist/public or src/public)
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

app.listen(PORT, () => {
  console.log(`✅ Finance-in-a-Box API listening on port ${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   POST   /api/deals/find         - Find best deals`);
  console.log(`   GET    /api/lenders            - List all lenders`);
  console.log(`   POST   /api/inventory/upload   - Upload CSV inventory`);
  console.log(`   GET    /api/inventory          - Get current inventory`);
  console.log(`   GET    /api/inventory/mirrored - Get mirrored inventory`);
  console.log(`   POST   /api/approvals/ingest   - Ingest lender approval`);
  console.log(`   GET    /api/approvals/last     - Get last ingested approval`);
  console.log(`   POST   /api/approvals/score    - Score inventory for approval`);
  console.log(`   GET    /api/rules              - List lender rules`);
  console.log(`   POST   /api/rules/upload       - Upload lender rules`);
  console.log(`   POST   /api/ghl/push-selected  - Push selected deal to GHL incoming webhook`);
  console.log(`   POST   /api/deals/save-to-ghl  - Save to GoHighLevel`);
});

export default app;
