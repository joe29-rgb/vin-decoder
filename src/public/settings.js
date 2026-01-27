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
      
      const setValueIfExists = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
      };
      
      setValueIfExists('dealershipName', data.dealershipName || '');
      setValueIfExists('websiteUrl', data.websiteUrl || '');
      setValueIfExists('usedInventoryPath', data.usedInventoryPath || '/search/used/');
      setValueIfExists('newInventoryPath', data.newInventoryPath || '/search/new/');
      setValueIfExists('location', data.location || 'Alberta');
      setValueIfExists('postalCode', data.postalCode || 'T5J');
      setValueIfExists('province', data.province || 'AB');
      setValueIfExists('competitorRadiusKm', data.competitorRadiusKm || 100);
      setValueIfExists('docFee', data.docFee || 799);
      setValueIfExists('cbbApiKey', data.cbbApiKey || '');
      setValueIfExists('cbbApiUrl', data.cbbApiUrl || 'https://api.canadianblackbook.com/v1');
      
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
    
    const getValueIfExists = (id, defaultValue = '') => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : defaultValue;
    };
    
    const config = {
      dealershipName: getValueIfExists('dealershipName'),
      websiteUrl: getValueIfExists('websiteUrl'),
      usedInventoryPath: getValueIfExists('usedInventoryPath', '/search/used/'),
      newInventoryPath: getValueIfExists('newInventoryPath', '/search/new/'),
      location: getValueIfExists('location', 'Alberta'),
      postalCode: getValueIfExists('postalCode', 'T5J'),
      province: getValueIfExists('province', 'AB'),
      competitorRadiusKm: parseInt(getValueIfExists('competitorRadiusKm', '100')) || 100,
      docFee: parseFloat(getValueIfExists('docFee', '799')) || 799,
      cbbApiKey: getValueIfExists('cbbApiKey'),
      cbbApiUrl: getValueIfExists('cbbApiUrl', 'https://api.canadianblackbook.com/v1'),
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
