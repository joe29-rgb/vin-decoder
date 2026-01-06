console.log('Deal calculator loaded');

let vehicles = [];
let selectedVehicle = null;

const monthlyIncomeInput = document.getElementById('monthlyIncome');
const downPaymentInput = document.getElementById('downPayment');
const tradeAllowanceInput = document.getElementById('tradeAllowance');
const tradeLienInput = document.getElementById('tradeLien');
const preferredTermSelect = document.getElementById('preferredTerm');
const vehicleSelect = document.getElementById('vehicleSelect');
const vehicleDetails = document.getElementById('vehicleDetails');
const aprSlider = document.getElementById('aprSlider');
const termSlider = document.getElementById('termSlider');
const aprValue = document.getElementById('aprValue');
const termValue = document.getElementById('termValue');
const calculateBtn = document.getElementById('calculateBtn');
const compareLendersBtn = document.getElementById('compareLendersBtn');
const resultsSection = document.getElementById('resultsSection');
const lenderComparison = document.getElementById('lenderComparison');
const toast = document.getElementById('toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatCurrency(value) {
  return '$' + Math.round(value).toLocaleString();
}

aprSlider.addEventListener('input', (e) => {
  aprValue.textContent = e.target.value + '%';
});

termSlider.addEventListener('input', (e) => {
  termValue.textContent = e.target.value;
});

async function loadVehicles() {
  try {
    const response = await fetch('/api/inventory/list');
    const data = await response.json();
    
    if (data.success && data.inventory && data.inventory.length > 0) {
      vehicles = data.inventory;
      
      vehicleSelect.innerHTML = '<option value="">Select a vehicle...</option>';
      vehicles.forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = `${v.year} ${v.make} ${v.model} - ${formatCurrency(v.suggestedPrice)}`;
        vehicleSelect.appendChild(option);
      });
      
      console.log('Loaded', vehicles.length, 'vehicles');
    } else {
      vehicleSelect.innerHTML = '<option value="">No vehicles available</option>';
      showToast('No vehicles in inventory. Please upload inventory first.');
    }
  } catch (error) {
    console.error('Error loading vehicles:', error);
    vehicleSelect.innerHTML = '<option value="">Error loading vehicles</option>';
    showToast('Error loading vehicles: ' + error.message);
  }
}

vehicleSelect.addEventListener('change', (e) => {
  const vehicleId = e.target.value;
  if (!vehicleId) {
    vehicleDetails.style.display = 'none';
    selectedVehicle = null;
    return;
  }
  
  selectedVehicle = vehicles.find(v => v.id === vehicleId);
  if (selectedVehicle) {
    document.getElementById('vehiclePrice').textContent = formatCurrency(selectedVehicle.suggestedPrice);
    document.getElementById('vehicleYear').textContent = selectedVehicle.year;
    document.getElementById('vehicleMileage').textContent = selectedVehicle.mileage.toLocaleString() + ' km';
    vehicleDetails.style.display = 'block';
  }
});

calculateBtn.addEventListener('click', async () => {
  if (!selectedVehicle) {
    showToast('Please select a vehicle first');
    return;
  }
  
  const customer = {
    monthlyIncome: parseFloat(monthlyIncomeInput.value) || 0,
    downPayment: parseFloat(downPaymentInput.value) || 0,
    tradeAllowance: parseFloat(tradeAllowanceInput.value) || 0,
    tradeLien: parseFloat(tradeLienInput.value) || 0,
    preferredTerm: parseInt(preferredTermSelect.value) || 72,
  };
  
  const apr = parseFloat(aprSlider.value);
  const termMonths = parseInt(termSlider.value);
  
  calculateBtn.innerHTML = '<span class="spinner"></span> Calculating...';
  calculateBtn.disabled = true;
  
  try {
    const response = await fetch('/api/deals/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: selectedVehicle.id,
        customer,
        lender: 'Standard',
        apr,
        termMonths,
      }),
    });
    
    const data = await response.json();
    
    if (data.success && data.calculation) {
      const calc = data.calculation;
      
      document.getElementById('monthlyPayment').textContent = formatCurrency(calc.monthlyPayment);
      document.getElementById('amountFinanced').textContent = formatCurrency(calc.amountFinanced);
      document.getElementById('totalInterest').textContent = formatCurrency(calc.totalInterest);
      document.getElementById('totalGross').textContent = formatCurrency(calc.totalGross);
      
      resultsSection.style.display = 'block';
      resultsSection.scrollIntoView({ behavior: 'smooth' });
      
      showToast('✓ Payment calculated successfully');
    } else {
      showToast('Error: ' + (data.error || 'Calculation failed'));
    }
  } catch (error) {
    console.error('Calculate error:', error);
    showToast('Error calculating payment: ' + error.message);
  } finally {
    calculateBtn.innerHTML = 'Calculate Payment';
    calculateBtn.disabled = false;
  }
});

compareLendersBtn.addEventListener('click', async () => {
  if (!selectedVehicle) {
    showToast('Please select a vehicle first');
    return;
  }
  
  const customer = {
    monthlyIncome: parseFloat(monthlyIncomeInput.value) || 0,
    downPayment: parseFloat(downPaymentInput.value) || 0,
    tradeAllowance: parseFloat(tradeAllowanceInput.value) || 0,
    tradeLien: parseFloat(tradeLienInput.value) || 0,
    preferredTerm: parseInt(preferredTermSelect.value) || 72,
  };
  
  const lenders = ['TD', 'Santander', 'SDA', 'IAAutoFinance', 'EdenPark', 'RIFCO'];
  
  compareLendersBtn.innerHTML = '<span class="spinner"></span> Comparing...';
  compareLendersBtn.disabled = true;
  
  try {
    const response = await fetch('/api/deals/compare-lenders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: selectedVehicle.id,
        customer,
        lenders,
      }),
    });
    
    const data = await response.json();
    
    if (data.success && data.comparisons) {
      lenderComparison.innerHTML = '';
      
      data.comparisons.forEach((comp, index) => {
        const card = document.createElement('div');
        card.className = 'lender-card' + (index === 0 ? ' best' : '');
        
        let oddsClass = 'odds-low';
        if (comp.approvalOdds >= 70) oddsClass = 'odds-high';
        else if (comp.approvalOdds >= 50) oddsClass = 'odds-medium';
        
        card.innerHTML = `
          <div class="lender-name">${comp.lenderName}</div>
          <div class="metric">
            <span class="metric-label">Approval Odds</span>
            <span class="approval-odds ${oddsClass}">${comp.approvalOdds}%</span>
          </div>
          <div class="metric">
            <span class="metric-label">Monthly Payment</span>
            <span class="metric-value">${formatCurrency(comp.monthlyPayment)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">APR</span>
            <span class="metric-value">${comp.apr}%</span>
          </div>
          <div class="metric">
            <span class="metric-label">Term</span>
            <span class="metric-value">${comp.termMonths} months</span>
          </div>
          <div class="metric">
            <span class="metric-label">Total Interest</span>
            <span class="metric-value">${formatCurrency(comp.totalInterest)}</span>
          </div>
          <div class="metric">
            <span class="metric-label">LTV</span>
            <span class="metric-value">${comp.ltv}%</span>
          </div>
          <div class="metric">
            <span class="metric-label">Dealer Reserve</span>
            <span class="metric-value">${formatCurrency(comp.dealerReserve)}</span>
          </div>
        `;
        
        lenderComparison.appendChild(card);
      });
      
      showToast('✓ Compared ' + data.comparisons.length + ' lenders');
    } else {
      showToast('Error: ' + (data.error || 'Comparison failed'));
    }
  } catch (error) {
    console.error('Compare error:', error);
    showToast('Error comparing lenders: ' + error.message);
  } finally {
    compareLendersBtn.innerHTML = 'Compare All Lenders';
    compareLendersBtn.disabled = false;
  }
});

loadVehicles();
