(function(){
  'use strict';

  try { console.log('dashboard.js loaded'); } catch(_e) {}
  try { window.addEventListener('error', function(e){ try{ console.error('dashboard error', e.error || e.message || e); var t=document.getElementById('toast'); if(t){ t.textContent='Error: ' + (e.message || 'check console'); t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); }, 3000);} }catch(_ee){} }); } catch(_e) {}

  var meta = document.getElementById('meta');
  var grid = document.getElementById('grid');
  var toastEl = document.getElementById('toast');
  var toggleInventoryBtn = document.getElementById('toggleInventory');
  var inventorySection = document.getElementById('inventorySection');
  var inventoryTable = document.getElementById('inventoryTable');

  var detailsModal = document.getElementById('detailsModal');
  var detailsContent = document.getElementById('detailsContent');
  var closeDetails = document.getElementById('closeDetails');

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
  var currentInventory = [];
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

      var detBtn = document.createElement('button');
      detBtn.className = 'btn';
      detBtn.textContent = 'Details';
      detBtn.style.marginLeft = '8px';
      detBtn.onclick = (function(r){ return function(){ openDetails(r); };})(row);
      body.appendChild(detBtn);

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
      currentInventory = Array.isArray(j.vehicles) ? j.vehicles : [];
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

  async function parseRulesFromSelectedPdf(){
    if (!rulesPdf || !rulesPdf.files || !rulesPdf.files[0]) { toast('Select a rules PDF'); return; }
    var fd = new FormData(); fd.append('file', rulesPdf.files[0]);
    var resp = await fetch('/api/rules/parse-pdf', { method:'POST', body: fd });
    var jr = await resp.json();
    if (jr.success) {
      if (jr.suggestion && Array.isArray(jr.suggestion) && jr.suggestion.length) {
        rulesInput.value = JSON.stringify({ rules: jr.suggestion, mode: 'append' }, null, 2);
        toast('Parsed PDF → Rules suggestion ready. Click Upload.');
      } else {
        rulesInput.value = jr.text || '';
        toast('Parsed rules PDF to text');
      }
    } else { toast('Failed: ' + (jr.error||'unknown')); }
  }

  if (rulesPdf) rulesPdf.onchange = function(){ parseRulesFromSelectedPdf(); };
  if (parseRulesPdf) parseRulesPdf.onclick = parseRulesFromSelectedPdf;

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

  function renderInventoryTable(){
    try {
      var tbody = inventoryTable.querySelector('tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      for (var i=0; i<currentInventory.length; i++){
        var v = currentInventory[i];
        var tr = document.createElement('tr');
        function td(txt){ var d=document.createElement('td'); d.textContent = txt; return d; }
        tr.appendChild(td(v.id||''));
        tr.appendChild(td(v.vin||''));
        tr.appendChild(td(String(v.year||'')));
        tr.appendChild(td(v.make||''));
        tr.appendChild(td(v.model||''));
        tr.appendChild(td(fmt$(v.yourCost)));
        tr.appendChild(td(fmt$(v.suggestedPrice)));
        var bb = v.blackBookValue!=null? ('$'+Number(v.blackBookValue).toLocaleString()):''; tr.appendChild(td(bb));
        tr.appendChild(td((v.cbbWholesale||0) + ' / ' + (v.cbbRetail||0)));
        var imgTd = document.createElement('td');
        var img = document.createElement('img'); img.style.width='48px'; img.style.height='32px'; img.style.objectFit='cover'; img.src = v.imageUrl || ''; img.alt='';
        imgTd.appendChild(img); tr.appendChild(imgTd);
        var act = document.createElement('td');
        var b1 = document.createElement('button'); b1.className='btn'; b1.textContent='Details'; b1.onclick=(function(vv){ return function(){
          // try find a scored row by vin/id for payment/gross
          var r = currentRows.find(function(x){ return x.vin===vv.vin || String(x.vehicleId)===String(vv.id); });
          if (r) openDetails(r); else {
            // synthesize a minimal row-like object for details
            openDetails({ vin: vv.vin, title: vv.year+' '+vv.make+' '+vv.model, salePrice: vv.suggestedPrice, monthlyPayment: 0, frontGross: 0, backGross: 0, totalGross: 0, flags: [], vehicleId: vv.id, imageUrl: vv.imageUrl });
          }
        };})(v);
        act.appendChild(b1);
        tr.appendChild(act);
        tbody.appendChild(tr);
      }
    } catch(_e){}
  }

  function openDetails(row){
    try {
      var v = currentInventory.find(function(x){ return x.vin===row.vin || String(x.id)===String(row.vehicleId); }) || {};
      var html = '';
      html += '<div style="display:flex; gap:12px; align-items:flex-start;">';
      html += '<img src="' + (row.imageUrl||v.imageUrl||'') + '" style="width:180px;height:120px;object-fit:cover;border:1px solid var(--border);border-radius:8px;" />';
      html += '<div>';
      html += '<div style="font-weight:700;font-size:16px;">' + (row.title|| (v.year+' '+(v.make||'')+' '+(v.model||''))) + '</div>';
      html += '<div class="chip">' + (row.vin||v.vin||'') + '</div>';
      html += '<div style="margin-top:8px;color:var(--muted)">Sale Price: ' + fmt$(row.salePrice) + ' • Payment: ' + fmt$(row.monthlyPayment) + '/mo</div>';
      html += '<div style="margin-top:8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">';
      html += '<div>Front Gross</div><div style="text-align:right;">' + fmt$(row.frontGross) + '</div>';
      html += '<div>Back Gross</div><div style="text-align:right;">' + fmt$(row.backGross) + '</div>';
      html += '<div>Total Gross</div><div style="text-align:right;font-weight:700;">' + fmt$(row.totalGross) + '</div>';
      html += '<div>Your Cost</div><div style="text-align:right;">' + fmt$(v.yourCost) + '</div>';
      html += '<div>Black Book</div><div style="text-align:right;">' + (v.blackBookValue!=null?fmt$(v.blackBookValue):'') + '</div>';
      html += '<div>CBB Wholesale/Retail</div><div style="text-align:right;">' + (v.cbbWholesale||0) + ' / ' + (v.cbbRetail||0) + '</div>';
      html += '</div>';
      if (row.flags && row.flags.length){ html += '<div style="margin-top:8px;color:var(--danger)">' + row.flags.join(', ') + '</div>'; }
      html += '</div>';
      html += '</div>';
      detailsContent.innerHTML = html;
      detailsModal.classList.remove('hidden');
    } catch(_e){}
  }

  if (closeDetails) closeDetails.onclick = function(){ try { detailsModal.classList.add('hidden'); } catch(_e){} };
  if (toggleInventoryBtn) toggleInventoryBtn.onclick = async function(){
    var showing = !inventorySection.classList.contains('hidden');
    if (showing) { inventorySection.classList.add('hidden'); }
    else {
      if (!currentInventory || !currentInventory.length) { await refreshMeta(); }
      renderInventoryTable();
      inventorySection.classList.remove('hidden');
    }
  };

  refreshMeta();
  try { console.log('dashboard: init complete'); } catch(_e) {}
})();
