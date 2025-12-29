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
  // Set a permissive-but-safe CSP so external fonts are blocked but images from HTTPS are allowed
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:");
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
    </style>
  </head>
  <body>
    <header>
      <h2>Finance-in-a-Box</h2>
      <button id="load">Load Approval</button>
      <button id="score" disabled>Calculate Matrix</button>
      <button id="uploadRules">Upload Rules</button>
    </header>
    <div style="margin-bottom:10px">
      <textarea id="rulesInput" rows="8" style="width:100%;font-family:monospace" placeholder='Paste lender rules JSON here (array or {"rules": [...]})'></textarea>
    </div>
    <div id="meta"></div>
    <div id="grid" class="grid"></div>
    <script>
      const meta = document.getElementById('meta');
      const grid = document.getElementById('grid');
      let lastApproval = null;

      async function loadApproval() {
        meta.textContent = 'Loading approval...';
        const r = await fetch('/api/approvals/last');
        const j = await r.json();
        if (!j.hasApproval) { meta.textContent = 'No approval ingested yet. Trigger your GHL workflow.'; return; }
        lastApproval = j.lastApproval;
        meta.innerHTML = '<b>Approval:</b> ' + lastApproval.approval.bank + ' / ' + lastApproval.approval.program + ' · ' + lastApproval.approval.termMonths + ' mo · ' + lastApproval.approval.apr + '% · Payment ' + lastApproval.approval.paymentMin + '-' + lastApproval.approval.paymentMax + ' | Contact ' + lastApproval.contactId;
        document.getElementById('score').disabled = false;
      }

      async function score() {
        grid.innerHTML = '';
        meta.insertAdjacentHTML('beforeend', '<div>Scoring inventory...</div>');
        const r = await fetch('/api/approvals/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        const j = await r.json();
        if (!j.success) { grid.textContent = 'Error: ' + (j.error || 'unknown'); return; }
        grid.innerHTML = '';
        for (const row of j.rows) {
          const card = document.createElement('div');
          card.className = 'card';
          const img = document.createElement('img');
          img.src = row.imageUrl || '';
          img.alt = row.title;
          card.appendChild(img);
          const body = document.createElement('div');
          body.className = 'body';
          body.innerHTML =
            '<div class="row"><div>' + row.title + '</div><div>' + row.vin + '</div></div>' +
            '<div class="row"><div>Sale Price</div><div>$' + row.salePrice.toLocaleString() + '</div></div>' +
            '<div class="row"><div>Payment</div><div>$' + row.monthlyPayment.toLocaleString() + '/mo</div></div>' +
            '<div class="row"><div>Front</div><div>$' + row.frontGross.toLocaleString() + '</div></div>' +
            '<div class="row"><div>Back</div><div>$' + row.backGross.toLocaleString() + '</div></div>' +
            '<div class="row gross"><div>Total Gross</div><div>$' + row.totalGross.toLocaleString() + '</div></div>' +
            '<div class="flags">' + (row.flags || []).join(', ') + '</div>';
          const btn = document.createElement('button');
          btn.textContent = 'Push to GHL';
          btn.onclick = async () => {
            const payload = { contactId: lastApproval?.contactId, selected: row };
            const resp = await fetch('/api/ghl/push-selected', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const jj = await resp.json();
            alert(jj.success ? 'Pushed to GHL' : ('Push failed: ' + (jj.error || 'unknown')));
          };
          body.appendChild(btn);
          card.appendChild(body);
          grid.appendChild(card);
        }
      }

      document.getElementById('load').onclick = loadApproval;
      document.getElementById('score').onclick = score;
      document.getElementById('uploadRules').onclick = async () => {
        const txt = (document.getElementById('rulesInput') as HTMLTextAreaElement).value.trim();
        if (!txt) { alert('Paste rules JSON first'); return; }
        let body;
        try { body = JSON.parse(txt); } catch(e) { alert('Invalid JSON: ' + e); return; }
        const r = await fetch('/api/rules/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json();
        alert(j.success ? ('Rules loaded: ' + j.total) : ('Failed: ' + (j.error||'unknown')));
      };
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
  console.log(`   POST   /api/deals/save-to-ghl  - Save to GoHighLevel`);
});

export default app;
