console.log('Settings page loaded');

let currentConfig = {};

function showAlert(message, type = 'success') {
  const alertBox = document.getElementById('alertBox');
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type} show`;
  setTimeout(() => {
    alertBox.classList.remove('show');
  }, 5000);
}

async function loadSettings() {
  try {
    const response = await fetch('/api/dealership/config');
    const data = await response.json();
    
    if (data.success) {
      currentConfig = data;
      
      document.getElementById('dealershipName').value = data.dealershipName || '';
      document.getElementById('websiteUrl').value = data.websiteUrl || '';
      document.getElementById('usedInventoryPath').value = data.usedInventoryPath || '/search/used/';
      document.getElementById('newInventoryPath').value = data.newInventoryPath || '/search/new/';
      document.getElementById('location').value = data.location || 'Alberta';
      document.getElementById('postalCode').value = data.postalCode || 'T5J';
      document.getElementById('province').value = data.province || 'AB';
      document.getElementById('competitorRadiusKm').value = data.competitorRadiusKm || 100;
      document.getElementById('docFee').value = data.docFee || 799;
      document.getElementById('ppsaFee').value = data.ppsaFee || 38.73;
      document.getElementById('cbbApiKey').value = data.cbbApiKey || '';
      document.getElementById('cbbApiUrl').value = data.cbbApiUrl || 'https://api.canadianblackbook.com/v1';
      
      if (!data.websiteUrl) {
        showAlert('⚠️ Please configure your dealership website URL to enable inventory scraping', 'warning');
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    showAlert('Failed to load settings: ' + error.message, 'error');
  }
}

async function saveSettings() {
  const saveBtn = document.getElementById('saveBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  
  try {
    saveBtn.disabled = true;
    saveBtnText.innerHTML = '<span class="spinner"></span>Saving...';
    
    const config = {
      dealershipName: document.getElementById('dealershipName').value.trim(),
      websiteUrl: document.getElementById('websiteUrl').value.trim(),
      usedInventoryPath: document.getElementById('usedInventoryPath').value.trim(),
      newInventoryPath: document.getElementById('newInventoryPath').value.trim(),
      location: document.getElementById('location').value.trim(),
      postalCode: document.getElementById('postalCode').value.trim(),
      province: document.getElementById('province').value,
      competitorRadiusKm: parseInt(document.getElementById('competitorRadiusKm').value) || 100,
      docFee: parseFloat(document.getElementById('docFee').value) || 799,
      ppsaFee: parseFloat(document.getElementById('ppsaFee').value) || 38.73,
      cbbApiKey: document.getElementById('cbbApiKey').value.trim(),
      cbbApiUrl: document.getElementById('cbbApiUrl').value.trim(),
    };
    
    if (!config.dealershipName) {
      showAlert('Please enter a dealership name', 'error');
      return;
    }
    
    if (!config.websiteUrl) {
      showAlert('Please enter your dealership website URL', 'error');
      return;
    }
    
    try {
      new URL(config.websiteUrl);
    } catch (e) {
      showAlert('Please enter a valid website URL (e.g., https://www.yourdealership.com)', 'error');
      return;
    }
    
    const response = await fetch('/api/dealership/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    const result = await response.json();
    
    if (result.success) {
      currentConfig = result.config;
      showAlert('✓ Settings saved successfully!', 'success');
    } else {
      showAlert('Failed to save settings: ' + (result.error || 'unknown'), 'error');
    }
  } catch (error) {
    console.error('Save error:', error);
    showAlert('Error saving settings: ' + error.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtnText.innerHTML = '💾 Save Settings';
  }
}

async function testBlackBook() {
  const testBtn = document.getElementById('testBlackBookBtn');
  
  try {
    testBtn.disabled = true;
    testBtn.innerHTML = '<span class="spinner"></span>Testing...';
    
    const apiKey = document.getElementById('cbbApiKey').value.trim();
    const apiUrl = document.getElementById('cbbApiUrl').value.trim();
    
    if (!apiKey) {
      showAlert('Please enter your Black Book API key first', 'error');
      return;
    }
    
    showAlert('Testing Black Book API connection...', 'warning');
    
    const response = await fetch('/api/dealership/test-blackbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiUrl })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showAlert('✓ Black Book API connection successful!', 'success');
      console.log('Black Book test result:', result);
    } else {
      showAlert('Black Book API test failed: ' + (result.error || 'unknown'), 'error');
      console.error('Black Book test error:', result);
    }
  } catch (error) {
    console.error('Test error:', error);
    showAlert('Test failed: ' + error.message, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.innerHTML = '🧪 Test Black Book Connection';
  }
}

async function testScraper() {
  const testBtn = document.getElementById('testScrapeBtn');
  
  try {
    testBtn.disabled = true;
    testBtn.innerHTML = '<span class="spinner"></span>Testing...';
    
    const websiteUrl = document.getElementById('websiteUrl').value.trim();
    const usedPath = document.getElementById('usedInventoryPath').value.trim();
    
    if (!websiteUrl) {
      showAlert('Please enter and save your website URL first', 'error');
      return;
    }
    
    showAlert('Testing scraper... This may take 30-60 seconds', 'warning');
    
    const response = await fetch('/api/scrape/dealership?limit=5&path=' + encodeURIComponent(usedPath) + '&cache=false');
    const result = await response.json();
    
    if (result.success) {
      showAlert(`✓ Scraper test successful! Found ${result.total} vehicles`, 'success');
      console.log('Test scrape result:', result);
    } else {
      showAlert('Scraper test failed: ' + (result.error || 'unknown'), 'error');
      console.error('Test scrape error:', result);
    }
  } catch (error) {
    console.error('Test error:', error);
    showAlert('Test failed: ' + error.message, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.innerHTML = '🧪 Test Scraper';
  }
}

document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('testScrapeBtn').addEventListener('click', testScraper);
document.getElementById('testBlackBookBtn').addEventListener('click', testBlackBook);

loadSettings();
