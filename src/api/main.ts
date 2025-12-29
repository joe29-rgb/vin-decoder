/**
 * EXPRESS SERVER ENTRY POINT
 * Starts Finance-in-a-Box API server
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import router from './api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', router);

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
      </div>
      <div id="grid" class="grid"></div>
    </div>

    <div id="toast" class="toast"></div>

    <div id="inventoryModal" class="modal hidden">
      <div class="modal-backdrop"></div>
      <div class="modal-body">
        <h3 style="margin:0">Inventory Upload</h3>
        <p style="margin:0;color:var(--muted)">Upload a .csv file or paste CSV content. Columns supported: stock, vin, year, make, model, trim, mileage, color, engine, transmission, your_cost, suggested_price, in_stock, image_url, cbb_wholesale, cbb_retail.</p>
        <div class="uploader">
          <input type="file" id="inventoryFile" accept=".csv,text/csv" />
        </div>
        <textarea id="inventoryText" class="textarea" placeholder="stock,vin,year,make,model,your_cost,suggested_price,image_url\nSTK001,2HGFC2F59MH000001,2021,Honda,Civic,18000,21995,https://.../civic.jpg"></textarea>
        <div class="modal-actions">
          <button class="btn" id="closeInventory">Cancel</button>
          <button class="btn primary" id="saveInventory">Upload</button>
        </div>
      </div>
    </div>

    <div id="approvalModal" class="modal hidden">
      <div class="modal-backdrop"></div>
      <div class="modal-body">
        <h3 style="margin:0">Approval Upload</h3>
        <p style="margin:0;color:var(--muted)">Paste approval JSON matching the /api/approvals/ingest schema.</p>
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
        <p style="margin:0;color:var(--muted)">Paste JSON array or upload a .json file.</p>
        <div class="uploader">
          <input type="file" id="rulesFile" accept="application/json" />
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
      var meta = document.getElementById('meta');
      var grid = document.getElementById('grid');
      var toastEl = document.getElementById('toast');
      var rulesModal = document.getElementById('rulesModal');
      var rulesInput = document.getElementById('rulesInput');
      var rulesFile = document.getElementById('rulesFile');
      var inventoryModal = document.getElementById('inventoryModal');
      var inventoryFile = document.getElementById('inventoryFile');
      var inventoryText = document.getElementById('inventoryText');
      var approvalModal = document.getElementById('approvalModal');
      var approvalText = document.getElementById('approvalText');
      var sortBy = document.getElementById('sortBy');
      var search = document.getElementById('search');
      var lastApproval = null;
      var currentRows = [];
      var fileTextCache = '';
      var invFileTextCache = '';

      function toast(msg){
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(function(){ toastEl.classList.remove('show'); }, 2200);
      }

      function openRules(){ rulesModal.classList.remove('hidden'); }
      function closeRules(){ rulesModal.classList.add('hidden'); }
      function openInventory(){ inventoryModal.classList.remove('hidden'); }
      function closeInventory(){ inventoryModal.classList.add('hidden'); }
      function openApproval(){ approvalModal.classList.remove('hidden'); }
      function closeApproval(){ approvalModal.classList.add('hidden'); }

      function fmt$(n){ try{ return '$' + Number(n||0).toLocaleString(); }catch(e){ return '$' + n; } }

      function renderRows(){
        var q = (search.value||'').trim().toLowerCase();
        var arr = currentRows.slice();
        if (q) arr = arr.filter(function(r){ return (r.vin||'').toLowerCase().indexOf(q)>=0 || (r.title||'').toLowerCase().indexOf(q)>=0; });
        var key = (sortBy.value||'total');
        arr.sort(function(a,b){
          if (key==='front') return (b.frontGross||0) - (a.frontGross||0);
          if (key==='back') return (b.backGross||0) - (a.backGross||0);
          if (key==='payment') return (a.monthlyPayment||0) - (b.monthlyPayment||0);
          return (b.totalGross||0) - (a.totalGross||0);
        });
        grid.innerHTML = '';
        for (var i=0;i<arr.length;i++){
          var row = arr[i];
          var card = document.createElement('div');
          card.className = 'card';
          var img = document.createElement('img');
          img.src = row.imageUrl || '';
          img.alt = row.title || '';
          card.appendChild(img);
          var body = document.createElement('div');
          body.className = 'body';
          body.innerHTML =
            '<div class="row"><div>' + (row.title||'') + '</div><div class="chip">' + (row.vin||'') + '</div></div>' +
            '<div class="row"><div>Sale Price</div><div>' + fmt$(row.salePrice) + '</div></div>' +
            '<div class="row"><div>Payment</div><div>' + fmt$(row.monthlyPayment) + '/mo</div></div>' +
            '<div class="row"><div>Front</div><div>' + fmt$(row.frontGross) + '</div></div>' +
            '<div class="row"><div>Back</div><div>' + fmt$(row.backGross) + '</div></div>' +
            '<div class="row gross"><div>Total Gross</div><div>' + fmt$(row.totalGross) + '</div></div>' +
            '<div class="flags">' + ((row.flags||[]).join(', ')) + '</div>';
          var btn = document.createElement('button');
          btn.className = 'btn primary';
          btn.textContent = 'Push to GHL';
          btn.onclick = (function(r){ return async function(){
            var payload = { contactId: (lastApproval && lastApproval.contactId) || '', selected: r };
            var resp = await fetch('/api/ghl/push-selected', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            var jj = await resp.json();
            toast(jj.success ? 'Pushed to GHL' : ('Push failed: ' + (jj.error || 'unknown')));
          };})(row);
          body.appendChild(btn);
          card.appendChild(body);
          grid.appendChild(card);
        }
      }

      async function refreshMeta(){
        try {
          var r = await fetch('/api/inventory');
          var j = await r.json();
          var inv = j && j.total != null ? j.total : 0;
          meta.textContent = '';
          var span = document.createElement('span');
          span.className = 'chip';
          span.textContent = inv + ' vehicles loaded';
          meta.appendChild(span);
        } catch (e) { /* ignore */ }
      }

      async function loadApproval(){
        meta.textContent = 'Loading approval...';
        var r = await fetch('/api/approvals/last');
        var j = await r.json();
        if (!j.hasApproval) { meta.textContent = 'No approval ingested yet. Trigger your GHL workflow.'; return; }
        lastApproval = j.lastApproval;
        var a = lastApproval.approval;
        meta.innerHTML = '<span class="chip">' + a.bank + '</span> <span class="chip">' + a.program + '</span> <span class="chip">' + a.termMonths + ' mo</span> <span class="chip">' + a.apr + '%</span> <span class="chip">$' + a.paymentMin + ' - $' + a.paymentMax + '</span>';
        document.getElementById('score').disabled = false;
        toast('Approval loaded');
      }

      async function score(){
        grid.innerHTML = '';
        meta.insertAdjacentHTML('beforeend', '<div style="margin-top:6px;color:var(--muted)">Scoring inventory...</div>');
        var r = await fetch('/api/approvals/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        var j = await r.json();
        if (!j.success) { grid.textContent = 'Error: ' + (j.error || 'unknown'); return; }
        currentRows = j.rows || [];
        renderRows();
      }

      document.getElementById('load').onclick = loadApproval;
      document.getElementById('score').onclick = score;
      document.getElementById('uploadInventory').onclick = function(){ openInventory(); };
      document.getElementById('uploadRules').onclick = function(){ openRules(); };
      document.getElementById('uploadApproval').onclick = function(){ openApproval(); };
      document.getElementById('closeRules').onclick = function(){ closeRules(); };
      document.getElementById('closeApproval').onclick = function(){ closeApproval(); };
      document.getElementById('closeInventory').onclick = function(){ closeInventory(); };
      document.getElementById('loadSample').onclick = function(){
        var sample = '[\n  {\n    "bank": "EdenPark",\n    "program": "Ride 5",\n    "frontCapFactor": 1.40,\n    "reserve": {\n      "fixedByFinancedAmount": [\n        { "minFinanced": 45001, "maxFinanced": 999999, "amount": 750 }\n      ]\n    },\n    "maxPayCall": 950\n  }\n]';
        rulesInput.value = sample;
      };
      document.getElementById('saveRules').onclick = async function(){
        var txt = (rulesInput.value||'').trim();
        if (!txt && fileTextCache) txt = fileTextCache;
        if (!txt) { toast('Provide JSON via text or file'); return; }
        var body;
        try { body = JSON.parse(txt); } catch(e) { toast('Invalid JSON'); return; }
        var resp = await fetch('/api/rules/upload', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        var jr = await resp.json();
        if (jr.success) { toast('Rules loaded: ' + jr.total); closeRules(); }
        else { toast('Failed: ' + (jr.error||'unknown')); }
      };
      rulesFile.onchange = function(ev){
        var f = rulesFile.files && rulesFile.files[0];
        if (!f) return; var reader = new FileReader();
        reader.onload = function(){ fileTextCache = String(reader.result||''); rulesInput.value = fileTextCache; };
        reader.readAsText(f);
      };

      document.getElementById('saveInventory').onclick = async function(){
        var txt = (inventoryText.value||'').trim();
        if (!txt && invFileTextCache) txt = invFileTextCache;
        if (!txt) { toast('Provide CSV via text or file'); return; }
        var resp = await fetch('/api/inventory/upload', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ csvContent: txt }) });
        var jr = await resp.json();
        if (jr.success) { toast(jr.message || 'Inventory uploaded'); closeInventory(); await refreshMeta(); }
        else { toast('Failed: ' + (jr.error||'unknown')); }
      };
      inventoryFile.onchange = function(){
        var f = inventoryFile.files && inventoryFile.files[0];
        if (!f) return; var reader = new FileReader();
        reader.onload = function(){ invFileTextCache = String(reader.result||''); inventoryText.value = invFileTextCache; };
        reader.readAsText(f);
      };
      document.getElementById('saveApproval').onclick = async function(){
        var txt = (approvalText.value||'').trim();
        if (!txt) { toast('Provide approval JSON'); return; }
        var body;
        try { body = JSON.parse(txt); } catch(e) { toast('Invalid JSON'); return; }
        var resp = await fetch('/api/approvals/ingest', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        var jr = await resp.json();
        if (jr.success) { toast('Approval ingested'); closeApproval(); await loadApproval(); }
        else { toast('Failed: ' + (jr.error||'unknown')); }
      };
      sortBy.onchange = renderRows; search.oninput = function(){ renderRows(); };

      // Initial load
      refreshMeta();
    </script>
  </body>
</html>`);
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
