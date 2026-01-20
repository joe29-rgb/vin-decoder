(function(){
  'use strict';

  try { console.log('dashboard.js loaded'); } catch(_e) {}
  try { window.addEventListener('error', function(e){ try{ console.error('dashboard error', e.error || e.message || e); var t=document.getElementById('toast'); if(t){ t.textContent='Error: ' + (e.message || 'check console'); t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); }, 3000);} }catch(_ee){} }); } catch(_e) {}

  var meta = document.getElementById('meta') || document.createElement('div');
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
  var inventorySource = document.getElementById('inventorySource');
  var inventoryPdf = document.getElementById('inventoryPdf');
  var parseInventoryPdf = document.getElementById('parseInventoryPdf');
  var saveInventoryFile = document.getElementById('saveInventoryFile');

  var approvalModal = document.getElementById('approvalModal');
  var approvalText = document.getElementById('approvalText');
  var approvalPdf = document.getElementById('approvalPdf');
  var parseApprovalPdf = document.getElementById('parseApprovalPdf');
  var manualApprovalTab = document.getElementById('manualApprovalTab');
  var pdfApprovalTab = document.getElementById('pdfApprovalTab');
  var manualApprovalForm = document.getElementById('manualApprovalForm');
  var pdfApprovalForm = document.getElementById('pdfApprovalForm');
  var lenderApprovalsList = document.getElementById('lenderApprovalsList');
  var addLenderApproval = document.getElementById('addLenderApproval');
  
  // Store multiple lender approvals
  var lenderApprovals = [];

  var sortBy = document.getElementById('sortBy');
  var search = document.getElementById('search');
  var sourceFilter = document.getElementById('sourceFilter');

  var lastApproval = null;
  var currentRows = [];
  var currentInventory = [];
  var fileTextCache = '';
  var invFileTextCache = '';

  function toast(msg){
    try{ toastEl.textContent = msg; toastEl.classList.add('show'); setTimeout(function(){ toastEl.classList.remove('show'); }, 2200); }catch(_e){}
  }

  function openRules(){ rulesModal.classList.add('show'); }
  function closeRules(){ rulesModal.classList.remove('show'); }
  function openInventory(){ inventoryModal.classList.add('show'); }
  function closeInventory(){ inventoryModal.classList.remove('show'); }
  function openApproval(){ 
    approvalModal.classList.add('show'); 
    if (manualApprovalTab) manualApprovalTab.click();
  }
  function closeApproval(){ approvalModal.classList.remove('show'); }

  // Lender program mappings
  var lenderPrograms = {
    'TD': ['2-Key', '3-Key', '4-Key', '5-Key', '6-Key', 'Holiday Special', 'Eco', 'Standard Fixed'],
    'SDA': ['Star 1', 'Star 2', 'Star 3', 'Star 4', 'Star 5', 'Star 6', 'Star 7', 'StartRight'],
    'Santander': ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Tier 6', 'Tier 7', 'Tier 8'],
    'RIFCO': ['Standard', 'Preferred Tier 1', 'Preferred Tier 2', 'Preferred Tier 3'],
    'IAAutoFinance': ['1st Gear', '2nd Gear', '3rd Gear', '4th Gear', '5th Gear', '6th Gear'],
    'EdenPark': ['2 Ride', '3 Ride', '4 Ride', '5 Ride', '6 Ride', 'EP Ride+', 'EP No Hit'],
    'AutoCapital': ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Tier 6'],
    'LendCare': ['Tier 1', 'Tier 2', 'Tier 3'],
    'Northlake': ['Titanium', 'Platinum', 'Gold', 'Standard', 'U-Drive'],
    'Prefera': ['P1', 'P2', 'P3', 'P4']
  };

  if (manualApprovalTab) {
    manualApprovalTab.onclick = function(){
      manualApprovalForm.style.display = 'block';
      pdfApprovalForm.style.display = 'none';
      manualApprovalTab.classList.add('btn-primary');
      pdfApprovalTab.classList.remove('btn-primary');
    };
  }

  if (pdfApprovalTab) {
    pdfApprovalTab.onclick = function(){
      manualApprovalForm.style.display = 'none';
      pdfApprovalForm.style.display = 'block';
      pdfApprovalTab.classList.add('btn-primary');
      manualApprovalTab.classList.remove('btn-primary');
    };
  }

  // Add lender approval card
  function addLenderApprovalCard() {
    var id = 'lender-' + Date.now();
    var card = document.createElement('div');
    card.id = id;
    card.style.cssText = 'background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px;';
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h5 style="color: var(--accent-secondary); margin: 0;">Lender Approval</h5>
        <button class="btn btn-sm btn-danger" onclick="removeLenderApproval('${id}')" style="padding: 4px 8px;">✕ Remove</button>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Lender <span style="color: var(--danger);">*</span></label>
          <select class="form-select lender-select" data-id="${id}">
            <option value="">Select Lender</option>
            <option value="TD">TD Auto Finance</option>
            <option value="SDA">Scotia Dealer Advantage</option>
            <option value="Santander">Santander</option>
            <option value="RIFCO">RIFCO</option>
            <option value="IAAutoFinance">iA Auto Finance</option>
            <option value="EdenPark">Eden Park</option>
            <option value="AutoCapital">AutoCapital</option>
            <option value="LendCare">LendCare</option>
            <option value="Northlake">Northlake</option>
            <option value="Prefera">Prefera</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Program/Tier (Optional)</label>
          <select class="form-select program-select" data-id="${id}">
            <option value="">Not specified</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Max Payment (Paycall) <span style="color: var(--danger);">*</span></label>
          <input type="number" class="form-input payment-max" data-id="${id}" placeholder="450" />
        </div>
        <div class="form-group">
          <label class="form-label">Interest Rate (APR %) <span style="color: var(--danger);">*</span></label>
          <input type="number" class="form-input apr-input" data-id="${id}" placeholder="8.99" step="0.01" />
        </div>
        <div class="form-group">
          <label class="form-label">Term (Months)</label>
          <input type="number" class="form-input term-input" data-id="${id}" placeholder="72" value="72" />
        </div>
      </div>
    `;
    
    lenderApprovalsList.appendChild(card);
    
    // Add event listener for lender change to update programs
    var lenderSelect = card.querySelector('.lender-select');
    var programSelect = card.querySelector('.program-select');
    lenderSelect.onchange = function() {
      var lender = this.value;
      programSelect.innerHTML = '<option value="">Not specified</option>';
      if (lender && lenderPrograms[lender]) {
        lenderPrograms[lender].forEach(function(prog) {
          var opt = document.createElement('option');
          opt.value = prog;
          opt.textContent = prog;
          programSelect.appendChild(opt);
        });
      }
    };
  }

  // Remove lender approval card
  window.removeLenderApproval = function(id) {
    var card = document.getElementById(id);
    if (card) card.remove();
  };

  // Add first lender approval on load
  if (addLenderApproval) {
    addLenderApproval.onclick = addLenderApprovalCard;
    addLenderApprovalCard();
  }

  function fmt$(n){ try{ return '$' + Number(n||0).toLocaleString(); }catch(e){ return '$' + n; } }

  function updateStats(){
    if (!currentRows || currentRows.length === 0) {
      document.getElementById('statVehicles').textContent = '0';
      document.getElementById('statAvgPayment').textContent = '$0';
      document.getElementById('statTotalGross').textContent = '$0';
      document.getElementById('statBestDeal').textContent = '$0';
      return;
    }
    var totalPayment = 0;
    var totalGross = 0;
    var bestDeal = 0;
    for (var i=0; i<currentRows.length; i++){
      totalPayment += (currentRows[i].monthlyPayment || 0);
      totalGross += (currentRows[i].totalGross || 0);
      if ((currentRows[i].totalGross || 0) > bestDeal) bestDeal = currentRows[i].totalGross || 0;
    }
    var avgPayment = currentRows.length > 0 ? totalPayment / currentRows.length : 0;
    document.getElementById('statVehicles').textContent = currentRows.length;
    document.getElementById('statAvgPayment').textContent = fmt$(avgPayment);
    document.getElementById('statTotalGross').textContent = fmt$(totalGross);
    document.getElementById('statBestDeal').textContent = fmt$(bestDeal);
  }

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
    updateStats();
    grid.innerHTML = '';
    if (arr.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚗</div><div class="empty-state-title">No Vehicles Found</div><div class="empty-state-description">Upload inventory or run a scrape to get started</div></div>';
      return;
    }
    for (var i=0;i<arr.length;i++){
      var row = arr[i];
      var card = document.createElement('div');
      card.className = 'vehicle-card';

      var img = document.createElement('img');
      img.className = 'vehicle-image';
      img.src = row.imageUrl || '';
      img.alt = row.title || '';
      card.appendChild(img);

      var body = document.createElement('div');
      body.className = 'vehicle-body';
      body.innerHTML =
        '<div class="vehicle-header"><div class="vehicle-title">' + (row.title||'Unknown Vehicle') + '</div><div class="chip">' + (row.vin||'No VIN') + '</div></div>' +
        '<div class="vehicle-details">' +
        '<div class="detail-row"><span class="detail-label">Sale Price</span><span class="detail-value">' + fmt$(row.salePrice) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Payment</span><span class="detail-value highlight">' + fmt$(row.monthlyPayment) + '/mo</span></div>' +
        '<div class="detail-row"><span class="detail-label">Front Gross</span><span class="detail-value">' + fmt$(row.frontGross) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Back Gross</span><span class="detail-value">' + fmt$(row.backGross) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Total Gross</span><span class="detail-value highlight">' + fmt$(row.totalGross) + '</span></div>' +
        '</div>';
      
      if (row.flags && row.flags.length > 0) {
        body.innerHTML += '<div class="vehicle-flags">' + row.flags.join(', ') + '</div>';
      }

      var actions = document.createElement('div');
      actions.className = 'vehicle-actions';
      
      var pushBtn = document.createElement('button');
      pushBtn.className = 'btn btn-primary btn-sm';
      pushBtn.innerHTML = '<span>✓</span> Push to GHL';
      pushBtn.onclick = (function(r){ return async function(){
        var payload = { 
          contactId: (lastApproval && lastApproval.contactId) || '', 
          locationId: (lastApproval && lastApproval.locationId) || 'manual',
          selected: r 
        };
        var resp = await fetch('/api/ghl/push-selected', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        var jj = await resp.json();
        toast(jj.success ? 'Pushed to GHL' : ('Push failed: ' + (jj.error || 'unknown')));
      };})(row);
      actions.appendChild(pushBtn);

      var detBtn = document.createElement('button');
      detBtn.className = 'btn btn-sm';
      detBtn.innerHTML = '<span>📋</span> Details';
      detBtn.onclick = (function(r){ return function(){ openDetails(r); };})(row);
      actions.appendChild(detBtn);
      
      body.appendChild(actions);


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
    grid.innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner" style="margin:0 auto 16px;"></div><div style="color:var(--muted);">Scoring inventory against approval criteria...</div></div>';
    try {
      var r = await fetch('/api/approvals/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      var j = await r.json();
      if (!j.success) { 
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Scoring Failed</div><div class="empty-state-description">' + (j.error || 'Unknown error occurred') + '</div></div>';
        toast('Scoring failed: ' + (j.error || 'unknown'));
        return; 
      }
      currentRows = j.rows || [];
      if (currentRows.length === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚗</div><div class="empty-state-title">No Matching Vehicles</div><div class="empty-state-description">No vehicles in inventory meet the approval criteria. Try uploading more inventory or adjusting the approval parameters.</div></div>';
        toast('No vehicles matched approval criteria');
      } else {
        renderRows();
        toast('Scored ' + currentRows.length + ' vehicles');
      }
    } catch(e) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">Network Error</div><div class="empty-state-description">' + (e.message || 'Failed to connect to server') + '</div></div>';
      toast('Error: ' + (e.message || 'unknown'));
    }
  }

  document.getElementById('score').onclick = score;
  document.getElementById('uploadInventory').onclick = function(){ openInventory(); };
  document.getElementById('uploadRules').onclick = function(){ openRules(); };
  document.getElementById('uploadApproval').onclick = function(){ openApproval(); };
  var scrapeBtn = document.getElementById('scrapeDevon');
  if (scrapeBtn) {
    try { console.log('Scrape button found, attaching handler'); } catch(_e){}
    scrapeBtn.onclick = async function(){
      try {
        try { console.log('Scrape button clicked'); } catch(_e){}
        scrapeBtn.disabled = true;
        scrapeBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:8px;"></span>Scraping...';
        if (meta && meta.textContent !== undefined) meta.textContent = 'Scraping Devon Chrysler inventory (used + new)...';
        toast('Starting scrape...');
        
        var usedPath = 'https://www.devonchrysler.com/search/used-devon-ab/?cy=t9g_1b2&tp=used';
        var newPath = 'https://www.devonchrysler.com/search/new-chrysler-dodge-jeep-ram-devon-ab/?cy=t9g_1b2&tp=new';
        
        try { console.log('Fetching used vehicles...'); } catch(_e){}
        var u = await fetch('/api/scrape/devon?limit=200&path=' + encodeURIComponent(usedPath));
        var ju = await u.json();
        try { console.log('Used scrape result:', ju); } catch(_e){}
        if (!ju.success) { toast('Used scrape failed: ' + (ju.error||'unknown')); }
        
        try { console.log('Fetching new vehicles...'); } catch(_e){}
        var n = await fetch('/api/scrape/devon?limit=200&path=' + encodeURIComponent(newPath));
        var jn = await n.json();
        try { console.log('New scrape result:', jn); } catch(_e){}
        if (!jn.success) { toast('New scrape failed: ' + (jn.error||'unknown')); }
        
        var all = ([]).concat((ju.vehicles||[]),(jn.vehicles||[]));
        try { console.log('Total vehicles scraped:', all.length); } catch(_e){}
        
        var seen = {};
        var vehicles = [];
        for (var i=0;i<all.length;i++){
          var key = (all[i].vin||'') + '|' + (all[i].id||'');
          if (!seen[key]) { seen[key]=true; vehicles.push(all[i]); }
        }
        
        try { console.log('Unique vehicles after dedup:', vehicles.length); } catch(_e){}
        toast('Scraped ' + vehicles.length + ' vehicles, enriching existing inventory...');
        
        // Enrich existing inventory with scraped data (images, VIN, mileage, engine, transmission)
        try { console.log('Enriching inventory with scraped data...'); } catch(_e){}
        var enrichResp = await fetch('/api/inventory/enrich', { 
          method:'POST', 
          headers:{'Content-Type':'application/json'}, 
          body: JSON.stringify({ vehicles: vehicles }) 
        });
        var uploadResult = await enrichResp.json();
        
        await refreshMeta();
        renderInventoryTable();
        if (uploadResult.success) {
          toast(uploadResult.message || ('Enriched ' + (uploadResult.enriched || 0) + ' vehicles'));
        } else {
          toast('Enrichment failed: ' + (uploadResult.error || 'unknown'));
        }
        if (meta && meta.textContent !== undefined) meta.textContent = '';
      } catch(e){ 
        try { console.error('Scrape error:', e); } catch(_e){}
        toast('Scrape error: ' + (e.message || 'unknown')); 
      }
      finally { 
        scrapeBtn.disabled = false; 
        scrapeBtn.innerHTML = '🔄 Scrape Devon Inventory';
      }
    };
  } else {
    try { console.error('Scrape button NOT found!'); } catch(_e){}
  }
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
    try { body = JSON.parse(txt); } catch(e) { toast('Invalid JSON format'); return; }
    var resp = await fetch('/api/rules/upload', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    var jr = await resp.json();
    if (jr.success) { 
      toast('✓ Rules loaded successfully: ' + jr.total);
      closeRules(); 
    } else { 
      toast('Failed to load rules: ' + (jr.error||'unknown')); 
    }
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

  document.getElementById('saveApproval').onclick = async function(){
    if (manualApprovalForm.style.display !== 'none') {
      // Manual entry mode - collect all lender approvals
      var customerName = document.getElementById('approvalCustomerName').value;
      var province = document.getElementById('approvalProvince').value;
      var isNativeStatus = document.getElementById('approvalNativeStatus').checked;
      var downPayment = parseFloat(document.getElementById('approvalDownPayment').value) || 0;
      var tradeAllowance = parseFloat(document.getElementById('approvalTradeAllowance').value) || 0;
      var tradeACV = parseFloat(document.getElementById('approvalTradeACV').value) || 0;
      var tradeLien = parseFloat(document.getElementById('approvalTradeLien').value) || 0;
      
      // Collect all lender approvals from cards
      var lenderCards = lenderApprovalsList.querySelectorAll('[id^="lender-"]');
      var approvals = [];
      
      for (var i = 0; i < lenderCards.length; i++) {
        var card = lenderCards[i];
        var lender = card.querySelector('.lender-select').value;
        var program = card.querySelector('.program-select').value;
        var paymentMax = parseFloat(card.querySelector('.payment-max').value);
        var apr = parseFloat(card.querySelector('.apr-input').value);
        var term = parseInt(card.querySelector('.term-input').value) || 72;
        
        if (!lender || !paymentMax || !apr) {
          toast('Please fill in Lender, Max Payment, and Interest Rate for all approvals');
          return;
        }
        
        approvals.push({
          bank: lender,
          program: program || 'Not Specified',
          apr: apr,
          termMonths: term,
          paymentMin: 0,
          paymentMax: paymentMax
        });
      }
      
      if (approvals.length === 0) {
        toast('Add at least one lender approval');
        return;
      }
      
      // Use the first approval as primary, store others for comparison
      var primaryApproval = approvals[0];
      primaryApproval.downPayment = downPayment;
      primaryApproval.province = province;
      primaryApproval.isNativeStatus = isNativeStatus;
      primaryApproval.customerName = customerName;
      primaryApproval.alternativeApprovals = approvals.slice(1);
      
      var payload = {
        contactId: 'manual-' + Date.now(),
        locationId: 'manual',
        approval: primaryApproval,
        trade: {
          allowance: tradeAllowance,
          acv: tradeACV,
          lienBalance: tradeLien
        }
      };
      
      var resp = await fetch('/api/approvals/ingest', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      var jr = await resp.json();
      if (jr.success) { 
        toast('✓ Approval created with ' + approvals.length + ' lender(s)');
        closeApproval();
        // Clear form
        lenderApprovalsList.innerHTML = '';
        addLenderApprovalCard();
        document.getElementById('score').disabled = false;
      } else { 
        toast('Failed: ' + (jr.error||'unknown')); 
      }
    } else {
      // PDF mode - no JSON parsing needed, just upload
      toast('PDF parsing not yet implemented - use Manual Entry');
    }
  };

  document.getElementById('saveInventory').onclick = async function(){
    var txt = (inventoryText.value||'').trim();
    if (!txt && invFileTextCache) txt = invFileTextCache;
    if (!txt) { toast('Provide CSV via text or file'); return; }
    var source = inventorySource ? inventorySource.value : 'manual';
    var resp = await fetch('/api/inventory/upload', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ csvContent: txt, source: source }) });
    var jr = await resp.json();
    if (jr.success) { toast(jr.message || 'Inventory uploaded'); closeInventory(); await refreshMeta(); renderInventoryTable(); inventorySection.classList.remove('hidden'); }
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
    if (jr.success) { toast(jr.message || 'Inventory uploaded'); closeInventory(); await refreshMeta(); renderInventoryTable(); inventorySection.classList.remove('hidden'); }
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
    var parsed;
    try { parsed = JSON.parse(txt); } catch(e) { toast('Invalid JSON'); return; }
    
    var payload = {
      contactId: parsed.contactId || parsed.customer?.applicationNumber || 'MANUAL-' + Date.now(),
      locationId: parsed.locationId || 'DEFAULT-LOCATION',
      approval: parsed.approval || {},
      trade: parsed.trade || {}
    };
    
    if (parsed.vehicle) payload.approval.vehicle = parsed.vehicle;
    if (parsed.customer) payload.approval.customer = parsed.customer;
    
    var resp = await fetch('/api/approvals/ingest', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    var jr = await resp.json();
    if (jr.success) { 
      toast('Approval ingested'); 
      closeApproval(); 
      lastApproval = payload;
      var scoreBtn = document.getElementById('score');
      if (scoreBtn) scoreBtn.disabled = false;
    }
    else { toast('Failed: ' + (jr.error||'unknown')); }
  };

  if (parseApprovalPdf) parseApprovalPdf.onclick = async function(){
    if (!approvalPdf || !approvalPdf.files || !approvalPdf.files[0]) { toast('Select an approval PDF'); return; }
    parseApprovalPdf.disabled = true;
    parseApprovalPdf.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:8px;"></span>Parsing...';
    try {
      var fd = new FormData(); fd.append('file', approvalPdf.files[0]);
      var resp = await fetch('/api/approvals/parse-pdf', { method:'POST', body: fd });
      var jr = await resp.json();
      if (jr.success) {
        if (jr.suggestion) { try { approvalText.value = JSON.stringify(jr.suggestion, null, 2); } catch(_e) { approvalText.value = String(jr.text||''); } }
        else { approvalText.value = String(jr.text||''); }
        toast('✓ Parsed approval PDF successfully');
      } else { toast('Failed to parse PDF: ' + (jr.error||'unknown')); }
    } catch(e) {
      toast('Error parsing PDF: ' + (e.message || 'unknown'));
    } finally {
      parseApprovalPdf.disabled = false;
      parseApprovalPdf.innerHTML = '📄 Parse PDF';
    }
  };

  sortBy.onchange = renderRows; 
  search.oninput = function(){ renderRows(); };
  if (sourceFilter) sourceFilter.onchange = function(){ renderInventoryTable(); };

  function renderInventoryTable(){
    try {
      var tbody = inventoryTable.querySelector('tbody');
      if (!tbody) return;
      tbody.innerHTML = '';
      
      var selectedSource = sourceFilter ? sourceFilter.value : 'all';
      var filtered = currentInventory;
      if (selectedSource && selectedSource !== 'all') {
        filtered = currentInventory.filter(function(v){ return v.source === selectedSource; });
      }
      
      for (var i=0; i<filtered.length; i++){
        var v = filtered[i];
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
        var b2 = document.createElement('button'); b2.className='btn'; b2.textContent='Upload Photo'; b2.style.marginLeft='8px'; b2.onclick=(function(vv, imgEl){ return function(){
          var input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = async function(){
            if (!input.files || !input.files[0]) { return; }
            var fd = new FormData();
            fd.append('file', input.files[0]);
            if (vv.vin) fd.append('vin', vv.vin);
            if (vv.id) fd.append('id', String(vv.id));
            var resp = await fetch('/api/inventory/upload-image', { method:'POST', body: fd });
            var jr = await resp.json();
            if (jr && jr.success) {
              var nextSrc = vv.vin ? ('/api/inventory/image-by-vin/' + encodeURIComponent(vv.vin)) : (vv.id ? ('/api/inventory/image/' + encodeURIComponent(String(vv.id))) : '');
              if (nextSrc) { imgEl.src = nextSrc + '?t=' + Date.now(); }
              toast('Photo uploaded');
            } else {
              toast('Photo upload failed: ' + (jr && jr.error || 'unknown'));
            }
          };
          input.click();
        };})(v, img);
        act.appendChild(b2);
        var b3 = document.createElement('button'); b3.className='btn'; b3.textContent='Set BB'; b3.style.marginLeft='8px'; b3.onclick=(function(vv){ return async function(){
          try {
            var val = prompt('Enter Black Book value for '+ (vv.vin||vv.id) + ' (numbers only, e.g. 45250):', vv.blackBookValue!=null? String(vv.blackBookValue):'');
            if (val===null) return; // cancel
            var clean = String(val).replace(/[$,\s]/g,'');
            var num = parseFloat(clean);
            if (isNaN(num)) { toast('Invalid number'); return; }
            var resp = await fetch('/api/inventory/sync', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: vv.id, blackBookValue: num }) });
            var jr = await resp.json();
            if (jr.success) { vv.blackBookValue = num; renderInventoryTable(); toast('Black Book updated'); }
            else { toast('Update failed: ' + (jr.error||'unknown')); }
          } catch(e){ toast('Update failed'); }
        };})(v);
        act.appendChild(b3);
        tr.appendChild(act);
        tbody.appendChild(tr);
      }
    } catch(_e){}
  }

  function openDetails(row){
    detailsModal.classList.add('show');
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
      html += '</div></div></div>';
      if (row.flags && row.flags.length > 0) {
        html += '<div style="margin-top:12px;padding:8px;background:rgba(248,81,73,0.1);border:1px solid rgba(248,81,73,0.2);border-radius:8px;color:var(--danger);font-size:12px;">' + row.flags.join(', ') + '</div>';
      }
      detailsContent.innerHTML = html;
    } catch(_e) {
      detailsContent.textContent = JSON.stringify(row, null, 2);
    }
  }

  document.getElementById('closeDetails').onclick = function(){ detailsModal.classList.remove('show'); };

  var modalBackdrops = document.querySelectorAll('.modal-backdrop');
  for (var i=0; i<modalBackdrops.length; i++){
    modalBackdrops[i].onclick = function(e){
      var modal = e.target.closest('.modal');
      if (modal) modal.classList.remove('show');
    };
  }

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
