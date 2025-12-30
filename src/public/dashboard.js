(function(){
  'use strict';

  try { console.log('dashboard.js loaded'); } catch(_e) {}
  try { window.addEventListener('error', function(e){ try{ console.error('dashboard error', e.error || e.message || e); var t=document.getElementById('toast'); if(t){ t.textContent='Error: ' + (e.message || 'check console'); t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); }, 3000);} }catch(_ee){} }); } catch(_e) {}

  var meta = document.getElementById('meta');
  var grid = document.getElementById('grid');
  var toastEl = document.getElementById('toast');

  var rulesModal = document.getElementById('rulesModal');
  var rulesInput = document.getElementById('rulesInput');
  var rulesFile = document.getElementById('rulesFile');
  var rulesPdf = document.getElementById('rulesPdf');
  var parseRulesPdf = document.getElementById('parseRulesPdf');

  var inventoryModal = document.getElementById('inventoryModal');
  var inventoryFile = document.getElementById('inventoryFile');
  var inventoryText = document.getElementById('inventoryText');
  var inventoryPdf = document.getElementById('inventoryPdf');
  var parseInventoryPdf = document.getElementById('parseInventoryPdf');
  var saveInventoryFile = document.getElementById('saveInventoryFile');

  var approvalModal = document.getElementById('approvalModal');
  var approvalText = document.getElementById('approvalText');
  var approvalPdf = document.getElementById('approvalPdf');
  var parseApprovalPdf = document.getElementById('parseApprovalPdf');

  var sortBy = document.getElementById('sortBy');
  var search = document.getElementById('search');

  var lastApproval = null;
  var currentRows = [];
  var fileTextCache = '';
  var invFileTextCache = '';

  function toast(msg){
    try{ toastEl.textContent = msg; toastEl.classList.add('show'); setTimeout(function(){ toastEl.classList.remove('show'); }, 2200); }catch(_e){}
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

      var pushBtn = document.createElement('button');
      pushBtn.className = 'btn primary';
      pushBtn.textContent = 'Push to GHL';
      pushBtn.onclick = (function(r){ return async function(){
        var payload = { contactId: (lastApproval && lastApproval.contactId) || '', selected: r };
        var resp = await fetch('/api/ghl/push-selected', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        var jj = await resp.json();
        toast(jj.success ? 'Pushed to GHL' : ('Push failed: ' + (jj.error || 'unknown')));
      };})(row);
      body.appendChild(pushBtn);

      var upBtn = document.createElement('button');
      upBtn.className = 'btn';
      upBtn.textContent = 'Upload Photo';
      upBtn.style.marginLeft = '8px';
      upBtn.onclick = (function(r, imgEl){ return function(){
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async function(){
          if (!input.files || !input.files[0]) { return; }
          var fd = new FormData();
          fd.append('file', input.files[0]);
          if (r.vin) fd.append('vin', r.vin);
          if (r.vehicleId) fd.append('id', String(r.vehicleId));
          var resp = await fetch('/api/inventory/upload-image', { method:'POST', body: fd });
          var jr = await resp.json();
          if (jr && jr.success) {
            var nextSrc = r.vin ? ('/api/inventory/image-by-vin/' + encodeURIComponent(r.vin)) : (r.vehicleId ? ('/api/inventory/image/' + encodeURIComponent(String(r.vehicleId))) : '');
            if (nextSrc) { imgEl.src = nextSrc + '?t=' + Date.now(); }
            toast('Photo uploaded');
          } else {
            toast('Photo upload failed: ' + (jr && jr.error || 'unknown'));
          }
        };
        input.click();
      };})(row, img);
      body.appendChild(upBtn);

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
    } catch (e) { }
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
  try { console.log('dashboard: handlers bound'); } catch(_e) {}

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

  rulesFile.onchange = function(){
    var f = rulesFile.files && rulesFile.files[0];
    if (!f) return; var reader = new FileReader();
    reader.onload = function(){ fileTextCache = String(reader.result||''); rulesInput.value = fileTextCache; };
    reader.readAsText(f);
  };

  if (parseRulesPdf) parseRulesPdf.onclick = async function(){
    if (!rulesPdf || !rulesPdf.files || !rulesPdf.files[0]) { toast('Select a rules PDF'); return; }
    var fd = new FormData(); fd.append('file', rulesPdf.files[0]);
    var resp = await fetch('/api/rules/parse-pdf', { method:'POST', body: fd });
    var jr = await resp.json();
    if (jr.success) { rulesInput.value = jr.text || ''; toast('Parsed rules PDF'); }
    else { toast('Failed: ' + (jr.error||'unknown')); }
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

  if (saveInventoryFile) saveInventoryFile.onclick = async function(){
    if (!inventoryFile || !inventoryFile.files || !inventoryFile.files[0]) { toast('Select a CSV file'); return; }
    var fd = new FormData(); fd.append('file', inventoryFile.files[0]);
    var resp = await fetch('/api/inventory/upload-file', { method:'POST', body: fd });
    var jr = await resp.json();
    if (jr.success) { toast(jr.message || 'Inventory uploaded'); closeInventory(); await refreshMeta(); }
    else { toast('Failed: ' + (jr.error||'unknown')); }
  };

  if (parseInventoryPdf) parseInventoryPdf.onclick = async function(){
    if (!inventoryPdf || !inventoryPdf.files || !inventoryPdf.files[0]) { toast('Select a PDF'); return; }
    var fd = new FormData(); fd.append('file', inventoryPdf.files[0]);
    var resp = await fetch('/api/inventory/parse-pdf', { method:'POST', body: fd });
    var jr = await resp.json();
    if (jr.success) { inventoryText.value = jr.text || ''; toast('Parsed inventory PDF'); }
    else { toast('Failed: ' + (jr.error||'unknown')); }
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

  if (parseApprovalPdf) parseApprovalPdf.onclick = async function(){
    if (!approvalPdf || !approvalPdf.files || !approvalPdf.files[0]) { toast('Select an approval PDF'); return; }
    var fd = new FormData(); fd.append('file', approvalPdf.files[0]);
    var resp = await fetch('/api/approvals/parse-pdf', { method:'POST', body: fd });
    var jr = await resp.json();
    if (jr.success) {
      if (jr.suggestion) { try { approvalText.value = JSON.stringify(jr.suggestion, null, 2); } catch(_e) { approvalText.value = String(jr.text||''); } }
      else { approvalText.value = String(jr.text||''); }
      toast('Parsed approval PDF');
    } else { toast('Failed: ' + (jr.error||'unknown')); }
  };

  sortBy.onchange = renderRows; search.oninput = function(){ renderRows(); };

  refreshMeta();
  try { console.log('dashboard: init complete'); } catch(_e) {}
})();
