console.log('Onboarding page loaded');

let currentStep = 0;
const totalSteps = 4;

function showAlert(message, type = 'success') {
  const alertBox = document.getElementById('alertBox');
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type} show`;
  setTimeout(() => {
    alertBox.classList.remove('show');
  }, 5000);
}

function updateStepIndicator() {
  document.querySelectorAll('.step-dot').forEach((dot, index) => {
    dot.classList.remove('active', 'completed');
    if (index < currentStep) {
      dot.classList.add('completed');
    } else if (index === currentStep) {
      dot.classList.add('active');
    }
  });
}

function showStep(step) {
  document.querySelectorAll('.step-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const stepContent = document.querySelector(`.step-content[data-step="${step}"]`);
  if (stepContent) {
    stepContent.classList.add('active');
  }
  
  updateStepIndicator();
}

function nextStep() {
  if (currentStep === 1) {
    // Validate step 1
    const dealershipName = document.getElementById('dealershipName').value.trim();
    const location = document.getElementById('location').value.trim();
    const postalCode = document.getElementById('postalCode').value.trim();
    
    if (!dealershipName || !location || !postalCode) {
      showAlert('Please fill in all required fields', 'error');
      return;
    }
  }
  
  if (currentStep === 2) {
    // Validate step 2
    const websiteUrl = document.getElementById('websiteUrl').value.trim();
    const docFee = document.getElementById('docFee').value;
    
    if (!websiteUrl) {
      showAlert('Please enter your website URL', 'error');
      return;
    }
    
    try {
      new URL(websiteUrl);
    } catch (e) {
      showAlert('Please enter a valid website URL', 'error');
      return;
    }
    
    if (!docFee || parseFloat(docFee) <= 0) {
      showAlert('Please enter a valid documentation fee', 'error');
      return;
    }
    
    // Save configuration
    saveConfiguration();
  }
  
  if (currentStep < totalSteps - 1) {
    currentStep++;
    showStep(currentStep);
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
}

async function saveConfiguration() {
  try {
    const config = {
      dealershipName: document.getElementById('dealershipName').value.trim(),
      location: document.getElementById('location').value.trim(),
      postalCode: document.getElementById('postalCode').value.trim(),
      province: document.getElementById('province').value,
      websiteUrl: document.getElementById('websiteUrl').value.trim(),
      docFee: parseFloat(document.getElementById('docFee').value) || 799,
      ppsaFee: parseFloat(document.getElementById('ppsaFee').value) || 38.73,
      competitorRadiusKm: parseInt(document.getElementById('competitorRadiusKm').value) || 100,
      usedInventoryPath: '/search/used/',
      newInventoryPath: '/search/new/',
    };
    
    const response = await fetch('/api/dealership/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      showAlert('Failed to save configuration: ' + (result.error || 'unknown'), 'error');
    }
  } catch (error) {
    console.error('Save configuration error:', error);
    showAlert('Error saving configuration: ' + error.message, 'error');
  }
}

async function completeOnboarding() {
  // Mark onboarding as complete
  try {
    // TODO: Update dealership record to set onboarding_complete = true
    // For now, just redirect to dashboard
    window.location.href = '/dashboard?onboarding=complete';
  } catch (error) {
    console.error('Complete onboarding error:', error);
    window.location.href = '/dashboard';
  }
}

// Make functions globally available
window.nextStep = nextStep;
window.prevStep = prevStep;
window.completeOnboarding = completeOnboarding;

// Initialize
showStep(currentStep);
