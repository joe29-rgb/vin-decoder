console.log('Deal worksheet loaded');

let dealData = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatCurrency(value) {
  return '$' + Math.round(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function loadDealData() {
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('id');
  
  if (!dealId) {
    showToast('No deal ID provided');
    return;
  }
  
  const storedDeal = sessionStorage.getItem('selectedDeal');
  if (!storedDeal) {
    showToast('Deal data not found');
    return;
  }
  
  try {
    dealData = JSON.parse(storedDeal);
    populateWorksheet(dealData);
  } catch (e) {
    console.error('Failed to parse deal data:', e);
    showToast('Failed to load deal data');
  }
}

function populateWorksheet(deal) {
  const vehicle = deal.vehicle || {};
  const approval = deal.approval || {};
  const trade = deal.trade || {};
  
  document.getElementById('vehicleImage').src = vehicle.imageUrl || vehicle.imageUrls?.[0] || '';
  document.getElementById('vehicleTitle').textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  document.getElementById('vehicleVin').textContent = vehicle.vin || '-';
  document.getElementById('vehicleStock').textContent = vehicle.id || '-';
  document.getElementById('vehicleMileage').textContent = vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : '-';
  document.getElementById('vehicleCondition').textContent = vehicle.year >= new Date().getFullYear() - 1 ? 'New' : 'Used';
  document.getElementById('vehicleBody').textContent = vehicle.bodyStyle || '4D Utility AWD';
  document.getElementById('vehicleTransmission').textContent = vehicle.transmission || 'Automatic';
  
  document.getElementById('dtVin').textContent = vehicle.vin || '-';
  document.getElementById('dtStock').textContent = vehicle.id || '-';
  document.getElementById('dtYear').textContent = vehicle.year || '-';
  document.getElementById('dtMake').textContent = vehicle.make || '-';
  document.getElementById('dtModel').textContent = vehicle.model || '-';
  document.getElementById('dtTrim').textContent = vehicle.trim || 'SLE';
  document.getElementById('dtBodyStyle').textContent = vehicle.bodyStyle || '4D Utility AWD';
  document.getElementById('dtMileage').textContent = vehicle.mileage ? vehicle.mileage.toLocaleString() : '-';
  
  document.getElementById('dtLender').textContent = approval.bank || deal.lender || '-';
  document.getElementById('dtProgram').textContent = approval.program || deal.tier || '-';
  document.getElementById('dtProgramApproval').textContent = approval.program || deal.tier || '5 Key';
  
  document.getElementById('dtCashPrice').textContent = formatCurrency(deal.salePrice || 0).replace('$', '');
  
  document.getElementById('dtTradeYear').textContent = trade.year || '-';
  document.getElementById('dtTradeMake').textContent = trade.make || '-';
  document.getElementById('dtTradeModel').textContent = trade.model || '-';
  document.getElementById('dtTradeVin').textContent = trade.vin || '-';
  document.getElementById('dtTradeOdometer').textContent = trade.mileage || '-';
  document.getElementById('dtTradeAllowance').textContent = formatCurrency(trade.allowance || 0).replace('$', '');
  document.getElementById('dtTradeLien').textContent = formatCurrency(trade.lienBalance || 0).replace('$', '');
  
  const netTrade = (trade.allowance || 0) - (trade.lienBalance || 0);
  document.getElementById('dtNetTrade').textContent = formatCurrency(Math.max(0, netTrade)).replace('$', '');
  
  document.getElementById('dtProvince').textContent = approval.province || 'Alberta';
  
  const taxRate = getTaxRate(approval.province || 'AB');
  const taxableAmount = (deal.salePrice || 0) - Math.max(0, netTrade);
  const gstAmount = taxableAmount * taxRate;
  
  document.getElementById('dtPst').textContent = '0.00';
  document.getElementById('dtGst').textContent = formatCurrency(gstAmount).replace('$', '');
  document.getElementById('dtLuxuryTax').textContent = '0.00';
  
  document.getElementById('dtCashDown').textContent = formatCurrency(approval.downPayment || 0).replace('$', '');
  document.getElementById('dtLicenseFee').textContent = '0.00';
  document.getElementById('dtAdminFee').textContent = formatCurrency(deal.adminFee || 799).replace('$', '');
  document.getElementById('dtPpsa').textContent = formatCurrency(deal.ppsa || 38.73).replace('$', '');
  
  document.getElementById('dtServiceContract').textContent = formatCurrency(deal.serviceContract || 0).replace('$', '');
  document.getElementById('dtServiceType').textContent = 'Manufacturer';
  document.getElementById('dtInsurance').textContent = formatCurrency(deal.insurance || 0).replace('$', '');
  document.getElementById('dtWarranty').textContent = formatCurrency(deal.warranty || 0).replace('$', '');
  document.getElementById('dtInsuranceTax').textContent = '0.00';
  
  document.getElementById('dtTerm').textContent = approval.termMonths || deal.term || '84';
  
  const amountFinanced = (deal.salePrice || 0) + gstAmount + (deal.adminFee || 799) + (deal.ppsa || 38.73) - (approval.downPayment || 0) - Math.max(0, netTrade);
  document.getElementById('dtAmountFinanced').textContent = formatCurrency(amountFinanced).replace('$', '');
  
  document.getElementById('dtPaymentFreq').textContent = 'Bi-Weekly';
  document.getElementById('dtDealerRate').textContent = '0.00';
  document.getElementById('dtDealerParticipation').textContent = '0.00';
  document.getElementById('dtActualRate').textContent = (approval.apr || 11.99).toFixed(2);
  document.getElementById('dtApr').textContent = (approval.apr || 11.99).toFixed(2);
  document.getElementById('dtMonthlyPayment').textContent = formatCurrency(deal.monthlyPayment || 0).replace('$', '');
  
  document.getElementById('profitFront').textContent = formatCurrency(deal.frontGross || 0);
  document.getElementById('profitBack').textContent = formatCurrency(deal.backGross || 0);
  document.getElementById('profitProduct').textContent = formatCurrency(deal.productMargin || 0);
  document.getElementById('profitTotal').textContent = formatCurrency(deal.totalGross || 0);
}

function getTaxRate(province) {
  const rates = {
    'AB': 0.05,
    'BC': 0.12,
    'MB': 0.12,
    'NB': 0.15,
    'NL': 0.15,
    'NS': 0.15,
    'ON': 0.13,
    'PE': 0.15,
    'QC': 0.14975,
    'SK': 0.11
  };
  return rates[province] || 0.05;
}

document.getElementById('copyAllBtn').addEventListener('click', () => {
  const values = [];
  document.querySelectorAll('[data-copy]').forEach(el => {
    const label = el.previousElementSibling?.textContent || '';
    const value = el.textContent.trim();
    values.push(`${label}: ${value}`);
  });
  
  navigator.clipboard.writeText(values.join('\n')).then(() => {
    showToast('✓ All values copied to clipboard');
  }).catch(() => {
    showToast('Failed to copy to clipboard');
  });
});

document.getElementById('pushToGhlBtn').addEventListener('click', async () => {
  if (!dealData) {
    showToast('No deal data available');
    return;
  }
  
  try {
    const response = await fetch('/api/ghl/push-selected', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: dealData.contactId || 'manual-' + Date.now(),
        locationId: dealData.locationId || 'manual',
        selected: dealData
      })
    });
    
    const result = await response.json();
    if (result.success) {
      showToast('✓ Deal pushed to GHL successfully');
    } else {
      showToast('Failed to push to GHL: ' + (result.error || 'unknown'));
    }
  } catch (error) {
    console.error('Push to GHL error:', error);
    showToast('Error pushing to GHL');
  }
});

document.getElementById('exportPdfBtn').addEventListener('click', () => {
  showToast('PDF export coming soon');
});

document.getElementById('printBtn').addEventListener('click', () => {
  window.print();
});

loadDealData();
