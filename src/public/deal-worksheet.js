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
  console.log('Populating worksheet with deal data:', deal);
  
  const vehicle = deal.vehicle || {};
  const approval = deal.approval || {};
  const trade = deal.trade || {};
  
  console.log('Vehicle:', vehicle);
  console.log('Approval:', approval);
  console.log('Trade:', trade);
  
  // Helper to safely set element content
  const setElement = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'IMG') {
        el.src = value || '';
      } else {
        el.textContent = value || '-';
      }
    } else {
      console.warn(`Element not found: ${id}`);
    }
  };
  
  setElement('vehicleImage', vehicle.imageUrl || vehicle.imageUrls?.[0] || '');
  setElement('vehicleTitle', `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`);
  setElement('vehicleVin', vehicle.vin || '-');
  setElement('vehicleStock', vehicle.id || '-');
  setElement('vehicleMileage', vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : '-');
  setElement('vehicleCondition', vehicle.year >= new Date().getFullYear() - 1 ? 'New' : 'Used');
  setElement('vehicleBody', vehicle.bodyStyle || '4D Utility AWD');
  setElement('vehicleTransmission', vehicle.transmission || 'Automatic');
  
  setElement('dtVin', vehicle.vin || '-');
  setElement('dtStock', vehicle.id || '-');
  setElement('dtYear', vehicle.year || '-');
  setElement('dtMake', vehicle.make || '-');
  setElement('dtModel', vehicle.model || '-');
  setElement('dtTrim', vehicle.trim || 'SLE');
  setElement('dtBodyStyle', vehicle.bodyStyle || '4D Utility AWD');
  setElement('dtMileage', vehicle.mileage ? vehicle.mileage.toLocaleString() : '-');
  
  setElement('dtLender', approval.bank || deal.lender || '-');
  setElement('dtProgram', approval.program || deal.tier || '-');
  setElement('dtProgramApproval', approval.program || deal.tier || '5 Key');
  
  setElement('dtCashPrice', formatCurrency(deal.salePrice || 0).replace('$', ''));
  
  setElement('dtTradeYear', trade.year || '-');
  setElement('dtTradeMake', trade.make || '-');
  setElement('dtTradeModel', trade.model || '-');
  setElement('dtTradeVin', trade.vin || '-');
  setElement('dtTradeOdometer', trade.mileage || '-');
  setElement('dtTradeAllowance', formatCurrency(trade.allowance || 0).replace('$', ''));
  setElement('dtTradeLien', formatCurrency(trade.lienBalance || 0).replace('$', ''));
  
  const netTrade = (trade.allowance || 0) - (trade.lienBalance || 0);
  setElement('dtNetTrade', formatCurrency(Math.max(0, netTrade)).replace('$', ''));
  
  setElement('dtProvince', approval.province || 'Alberta');
  
  const taxRate = getTaxRate(approval.province || 'AB');
  const taxableAmount = (deal.salePrice || 0) - Math.max(0, netTrade);
  const gstAmount = taxableAmount * taxRate;
  
  setElement('dtPst', '0.00');
  setElement('dtGst', formatCurrency(gstAmount).replace('$', ''));
  setElement('dtLuxuryTax', '0.00');
  
  setElement('dtCashDown', formatCurrency(approval.downPayment || 0).replace('$', ''));
  setElement('dtLicenseFee', '0.00');
  setElement('dtAdminFee', formatCurrency(deal.adminFee || 799).replace('$', ''));
  setElement('dtPpsa', formatCurrency(deal.ppsa || 38.73).replace('$', ''));
  
  setElement('dtServiceContract', formatCurrency(deal.serviceContract || 0).replace('$', ''));
  setElement('dtServiceType', 'Manufacturer');
  setElement('dtInsurance', formatCurrency(deal.insurance || 0).replace('$', ''));
  setElement('dtWarranty', formatCurrency(deal.warranty || 0).replace('$', ''));
  setElement('dtInsuranceTax', '0.00');
  
  setElement('dtTerm', approval.termMonths || deal.term || '84');
  
  const amountFinanced = (deal.salePrice || 0) + gstAmount + (deal.adminFee || 799) + (deal.ppsa || 38.73) - (approval.downPayment || 0) - Math.max(0, netTrade);
  setElement('dtAmountFinanced', formatCurrency(amountFinanced).replace('$', ''));
  
  setElement('dtPaymentFreq', 'Bi-Weekly');
  setElement('dtDealerRate', '0.00');
  setElement('dtDealerParticipation', '0.00');
  setElement('dtActualRate', (approval.apr || 11.99).toFixed(2));
  setElement('dtApr', (approval.apr || 11.99).toFixed(2));
  setElement('dtMonthlyPayment', formatCurrency(deal.monthlyPayment || 0).replace('$', ''));
  
  setElement('profitFront', formatCurrency(deal.frontGross || 0));
  setElement('profitBack', formatCurrency(deal.backGross || 0));
  setElement('profitProduct', formatCurrency(deal.productMargin || 0));
  setElement('profitTotal', formatCurrency(deal.totalGross || 0));
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
