# GoHighLevel Webhook Listener - Complete Implementation Guide

## Overview

The GHL Webhook Listener enables **real-time bidirectional synchronization** between your Finance-in-a-Box application and GoHighLevel CRM. When contacts, opportunities, or notes are created/updated in GHL, your application receives instant notifications and can automatically update deal data, trigger scoring, and sync information.

---

## Architecture

### Components

1. **Webhook Handler Module** (`src/modules/ghl-webhook-handler.ts`)
   - Processes incoming webhook payloads
   - Extracts trade-in and approval data from custom fields
   - Updates application state in real-time
   - Triggers auto-scoring when conditions are met

2. **Webhook API Endpoint** (`src/api/routes/ghl.ts`)
   - `POST /api/ghl/webhook` - Receives webhook events from GHL
   - `POST /api/ghl/webhook/register` - Registers webhook with GHL API
   - Verifies webhook signatures for security
   - Routes events to appropriate handlers

3. **State Management** (`src/api/state.ts`)
   - Stores current approval and trade information
   - Updates automatically when GHL sends new data
   - Triggers re-scoring when both approval + trade present

---

## How It Works

### Step-by-Step Flow

#### 1. **Initial Setup**
```
Dealer → GHL → Creates Contact → Sets Custom Fields
                                   ↓
                            trade_allowance: 5000
                            trade_acv: 4500
                            trade_lien: 2000
                            approval_lender: TD
                            approval_program: 3-Key
                            approval_apr: 13.49
                            approval_term: 72
                            approval_payment_max: 450
```

#### 2. **Webhook Registration**
```
Your App → Calls /api/ghl/webhook/register
           ↓
           Sends to GHL API:
           {
             locationId: "abc123",
             url: "https://your-app.railway.app/api/ghl/webhook",
             events: ["contact.updated", "opportunity.updated", "note.created"]
           }
           ↓
           GHL Registers Webhook
           ↓
           Returns webhookId: "xyz789"
```

#### 3. **Real-Time Updates**
```
Dealer Updates Contact in GHL
           ↓
GHL Sends Webhook POST to your app:
{
  type: "contact.updated",
  location_id: "abc123",
  contact: {
    id: "contact_456",
    name: "John Doe",
    email: "john@example.com",
    customFields: {
      trade_allowance: "5000",
      trade_acv: "4500",
      trade_lien: "2000",
      approval_lender: "TD",
      approval_program: "3-Key",
      approval_apr: "13.49",
      approval_term: "72",
      approval_payment_max: "450"
    }
  }
}
           ↓
Your App Receives Webhook
           ↓
Verifies Signature (HMAC-SHA256)
           ↓
Extracts Trade Info:
  - allowance: 5000
  - acv: 4500
  - lienBalance: 2000
           ↓
Extracts Approval Info:
  - bank: TD
  - program: 3-Key
  - apr: 13.49
  - termMonths: 72
  - paymentMax: 450
           ↓
Updates state.lastApproval
           ↓
Auto-triggers Scoring (if inventory loaded)
           ↓
Returns 200 OK to GHL
```

#### 4. **Auto-Scoring Trigger**
```
Webhook Handler Detects:
  ✓ Approval data present
  ✓ Trade data present
  ✓ Inventory loaded (50 vehicles)
           ↓
Automatically Calls scoreInventory()
           ↓
Generates Scored Deals
           ↓
Updates Dashboard in Real-Time
           ↓
Dealer Sees Results Instantly
```

---

## Custom Fields Setup in GHL

### Required Custom Fields

Create these custom fields in your GHL location:

#### Trade-In Fields
- `trade_allowance` (Number) - Trade allowance offered to customer
- `trade_acv` (Number) - Actual cash value of trade
- `trade_lien` (Number) - Outstanding loan balance on trade
- `trade_make` (Text) - Trade vehicle make
- `trade_model` (Text) - Trade vehicle model
- `trade_year` (Number) - Trade vehicle year
- `trade_vin` (Text) - Trade vehicle VIN

#### Approval Fields
- `approval_lender` (Text) - Lender name (TD, Santander, SDA, etc.)
- `approval_program` (Text) - Program/tier (3-Key, Tier 5, etc.)
- `approval_apr` (Number) - Annual percentage rate
- `approval_term` (Number) - Loan term in months
- `approval_payment_max` (Number) - Maximum monthly payment
- `approval_payment_min` (Number) - Minimum monthly payment
- `approval_status` (Text) - Approval status (approved, pending, conditional)
- `down_payment` (Number) - Down payment amount
- `province` (Text) - Customer province (AB, BC, ON, etc.)

#### Deal Fields (Optional)
- `vehicle_info` (Text) - Selected vehicle details
- `sale_price` (Number) - Final sale price
- `monthly_payment` (Number) - Calculated monthly payment
- `total_gross` (Number) - Total gross profit

---

## Implementation Steps

### 1. Configure Environment Variables

Add to `.env`:
```env
# GHL OAuth Credentials
GHL_CLIENT_ID=your_client_id_here
GHL_CLIENT_SECRET=your_client_secret_here
GHL_REDIRECT_URI=https://your-app.railway.app/ghl/callback

# GHL Webhook Security
GHL_WEBHOOK_SECRET=your_webhook_secret_here

# GHL Access Token (after OAuth)
GHL_ACCESS_TOKEN=your_access_token_here
```

### 2. Register Webhook with GHL

**Option A: Via API Call**
```bash
curl -X POST https://your-app.railway.app/api/ghl/webhook/register \
  -H "Content-Type: application/json" \
  -d '{
    "locationId": "your_location_id",
    "webhookUrl": "https://your-app.railway.app/api/ghl/webhook",
    "events": ["contact.updated", "opportunity.updated", "note.created"]
  }'
```

**Option B: Via GHL Dashboard**
1. Go to Settings → Integrations → Webhooks
2. Click "Add Webhook"
3. Enter URL: `https://your-app.railway.app/api/ghl/webhook`
4. Select Events: Contact Updated, Opportunity Updated, Note Created
5. Enter Webhook Secret (same as GHL_WEBHOOK_SECRET in .env)
6. Save

### 3. Test Webhook

**Send Test Event:**
```bash
curl -X POST https://your-app.railway.app/api/ghl/webhook \
  -H "Content-Type: application/json" \
  -H "x-ghl-signature: test_signature" \
  -d '{
    "type": "contact.updated",
    "location_id": "test_location",
    "contact": {
      "id": "test_contact",
      "name": "Test Customer",
      "email": "test@example.com",
      "customFields": {
        "trade_allowance": "5000",
        "trade_acv": "4500",
        "trade_lien": "2000",
        "approval_lender": "TD",
        "approval_program": "3-Key",
        "approval_apr": "13.49",
        "approval_term": "72",
        "approval_payment_max": "450"
      }
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

---

## Webhook Event Types

### 1. Contact Updated (`contact.updated`)
**Triggered When:**
- Contact custom fields are updated
- Contact information is changed
- Trade or approval data is added/modified

**What Happens:**
- Extracts trade-in information
- Extracts approval information
- Updates `state.lastApproval`
- Auto-triggers scoring if conditions met

**Example Payload:**
```json
{
  "type": "contact.updated",
  "location_id": "abc123",
  "contact": {
    "id": "contact_456",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "customFields": {
      "trade_allowance": "5000",
      "approval_lender": "TD"
    }
  }
}
```

### 2. Opportunity Updated (`opportunity.updated`)
**Triggered When:**
- Deal stage changes (pending → approved → won)
- Opportunity value is updated
- Custom fields are modified

**What Happens:**
- Extracts deal information
- Updates deal status
- Syncs to SmartSheet if configured
- Logs deal won/lost events

**Example Payload:**
```json
{
  "type": "opportunity.updated",
  "location_id": "abc123",
  "opportunity": {
    "id": "opp_789",
    "name": "2023 Honda Civic Deal",
    "status": "won",
    "monetaryValue": 25000,
    "contact_id": "contact_456",
    "customFields": {
      "vehicle_info": "2023 Honda Civic",
      "sale_price": "25000",
      "monthly_payment": "425"
    }
  }
}
```

### 3. Note Created (`note.created`)
**Triggered When:**
- Deal summary note is added
- Scored deal note is created
- Manual note with deal info is added

**What Happens:**
- Parses note body for deal information
- Extracts structured data if present
- Updates deal tracking

**Example Payload:**
```json
{
  "type": "note.created",
  "location_id": "abc123",
  "note": {
    "id": "note_101",
    "body": "Deal Summary: 2023 Honda Civic - $425/mo - Total Gross: $3,500",
    "contact_id": "contact_456"
  }
}
```

---

## Security

### Webhook Signature Verification

**How It Works:**
1. GHL generates HMAC-SHA256 signature of payload
2. Sends signature in `x-ghl-signature` header
3. Your app verifies signature matches

**Implementation:**
```typescript
const crypto = require('crypto');

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}
```

**Why It's Important:**
- Prevents unauthorized webhook calls
- Ensures data integrity
- Protects against replay attacks

---

## Auto-Scoring Logic

### Conditions for Auto-Trigger

Scoring automatically triggers when **ALL** conditions are met:

1. ✓ Approval data present (`approval.bank` and `approval.paymentMax` > 0)
2. ✓ Trade data present (can be zero values)
3. ✓ Inventory loaded (`state.inventory.length > 0`)
4. ✓ Webhook matches existing approval lender

### What Gets Scored

- All vehicles in `state.inventory`
- Uses updated trade information from webhook
- Applies lender rules and booking guide
- Calculates front/back gross profit
- Ranks by total gross profit

### Results

- Updates dashboard in real-time
- Dealer sees scored deals instantly
- No manual "Calculate Matrix" button click needed

---

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
1. Webhook URL is publicly accessible
2. SSL certificate is valid (Railway provides this)
3. Webhook is registered in GHL dashboard
4. Events are selected (contact.updated, etc.)
5. Location ID matches

**Test:**
```bash
curl -I https://your-app.railway.app/api/ghl/webhook
# Should return 200 or 405 (Method Not Allowed for GET)
```

### Signature Verification Failing

**Check:**
1. `GHL_WEBHOOK_SECRET` matches GHL dashboard
2. Payload is not modified before verification
3. Signature header is `x-ghl-signature`

**Debug:**
```typescript
console.log('Received signature:', signature);
console.log('Expected signature:', expectedSignature);
console.log('Payload:', payload);
```

### Trade Data Not Updating

**Check:**
1. Custom field names match exactly (case-sensitive)
2. Custom fields are set in GHL contact
3. Webhook payload includes `customFields` object
4. Values are strings (GHL sends all as strings)

**Debug:**
```typescript
console.log('Custom fields:', contact.customFields);
console.log('Extracted trade:', tradeInfo);
```

### Auto-Scoring Not Triggering

**Check:**
1. Inventory is loaded (`state.inventory.length > 0`)
2. Approval lender matches (`state.lastApproval.approval.bank`)
3. Payment max is greater than 0
4. No errors in console logs

**Debug:**
```typescript
console.log('Inventory count:', state.inventory.length);
console.log('Last approval:', state.lastApproval);
console.log('Should auto-score:', shouldAutoScore);
```

---

## Advanced Features

### Bidirectional Sync

**From GHL → Your App:**
- Contact updates trigger data sync
- Trade info pulled automatically
- Approval data extracted from custom fields

**From Your App → GHL:**
- Scored deals saved as notes
- Deal summary pushed to contact
- Opportunity value updated

### SmartSheet Integration

When webhook triggers deal won:
1. Extract deal information
2. Push to SmartSheet via API
3. Update deal pipeline status
4. Sync back to GHL

### Multi-Location Support

Handle multiple GHL locations:
```typescript
const locationTokens = {
  'location_1': 'token_1',
  'location_2': 'token_2'
};

const token = locationTokens[payload.location_id];
```

---

## Testing Checklist

- [ ] Webhook registered successfully
- [ ] Test event received and processed
- [ ] Signature verification working
- [ ] Trade data extracted correctly
- [ ] Approval data extracted correctly
- [ ] State updated properly
- [ ] Auto-scoring triggers when conditions met
- [ ] Dashboard updates in real-time
- [ ] Deal saved back to GHL
- [ ] SmartSheet sync working (if configured)

---

## Production Deployment

### Railway Deployment

1. **Set Environment Variables:**
   ```
   GHL_CLIENT_ID=...
   GHL_CLIENT_SECRET=...
   GHL_WEBHOOK_SECRET=...
   ```

2. **Get Public URL:**
   ```
   https://vin-decoder-production.up.railway.app
   ```

3. **Register Webhook:**
   ```
   POST /api/ghl/webhook/register
   {
     "locationId": "your_location",
     "webhookUrl": "https://vin-decoder-production.up.railway.app/api/ghl/webhook"
   }
   ```

4. **Monitor Logs:**
   ```bash
   # Railway dashboard → Deployments → Logs
   # Look for: "Processed contact update: John Doe"
   ```

---

## Summary

The GHL Webhook Listener provides **real-time synchronization** between GoHighLevel and your Finance-in-a-Box application. When a dealer updates contact information in GHL, your app:

1. ✅ Receives instant notification
2. ✅ Extracts trade and approval data
3. ✅ Updates application state
4. ✅ Auto-triggers scoring
5. ✅ Displays results immediately
6. ✅ Syncs back to GHL and SmartSheet

This eliminates manual data entry, reduces errors, and provides a seamless workflow for dealers.

---

## Next Steps

1. Set up custom fields in GHL
2. Configure environment variables
3. Register webhook
4. Test with sample contact
5. Monitor webhook events
6. Enable auto-scoring
7. Configure SmartSheet sync (optional)

**Questions?** Check the troubleshooting section or review the webhook handler code in `src/modules/ghl-webhook-handler.ts`.
