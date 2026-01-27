# API Requirements & Configuration Guide

## ✅ Dependencies Installed

```bash
✓ puppeteer - Installed (for free scrapers)
✓ cheerio - Installed (for HTML parsing)
✓ @types/cheerio - Installed (TypeScript types)
```

---

## 🔑 Required API Keys & Services

Based on comprehensive file analysis, here are **ALL** APIs your system uses:

### 1. **Supabase** (Database & Authentication) - **REQUIRED**
**Status:** ✅ Already configured in your code

**What it's for:**
- Multi-tenant database (dealerships, inventory, approvals)
- Row-level security (RLS) for data isolation
- Real-time subscriptions
- User authentication

**Environment Variables:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to get it:**
1. Go to https://supabase.com
2. Create a free account
3. Create a new project
4. Go to Settings → API
5. Copy "Project URL" → `SUPABASE_URL`
6. Copy "anon/public" key → `SUPABASE_ANON_KEY`

**Correct API Name:** `Supabase`  
**Website:** https://supabase.com  
**Pricing:** Free tier available (50,000 rows, 500MB database)

---

### 2. **GoHighLevel (GHL)** - **REQUIRED for CRM Integration**
**Status:** ✅ Already configured in your code

**What it's for:**
- CRM integration (contacts, opportunities)
- Webhook inbound/outbound
- Deal pipeline management
- Customer data sync

**Environment Variables:**
```bash
GHL_CLIENT_ID=your-client-id
GHL_CLIENT_SECRET=your-client-secret
GHL_REDIRECT_URI=http://localhost:10000/api/auth/callback
GHL_API_KEY=your-api-key
GHL_BASE_URL=https://services.leadconnectorhq.com/v1
GHL_LOCATION_ID=your-location-id
GHL_INBOUND_WEBHOOK_URL=your-webhook-url
GHL_WEBHOOK_SECRET=your-webhook-secret
```

**Where to get it:**
1. Go to https://marketplace.gohighlevel.com
2. Create a developer account
3. Create a new app/integration
4. Get OAuth credentials (Client ID, Client Secret)
5. Set redirect URI to your callback URL
6. Get API key from your GHL account settings

**Correct API Name:** `GoHighLevel` (also called `HighLevel` or `GHL`)  
**Website:** https://www.gohighlevel.com  
**Pricing:** Requires GHL subscription ($97-$297/month)

---

### 3. **VINAudit Canada** - **OPTIONAL (VIN Decoding & Valuations)**
**Status:** ⚠️ Configured but optional (has fallback)

**What it's for:**
- VIN decoding (year, make, model, specs)
- Vehicle market valuations (wholesale/retail)
- Canadian market data

**Environment Variables:**
```bash
VINAUDIT_API_KEY=your-vinaudit-api-key
```

**Where to get it:**
1. Go to https://www.vinaudit.ca
2. Sign up for API access
3. Purchase API credits
4. Get your API key from dashboard

**Correct API Name:** `VINAudit Canada`  
**Website:** https://www.vinaudit.ca  
**Pricing:** Pay-per-use (~$0.50-$2.00 per VIN lookup)

**Note:** System has fallback VIN decoder if API key not provided.

---

### 4. **CARFAX Canada** - **OPTIONAL (Vehicle History Reports)**
**Status:** ⚠️ Configured but optional

**What it's for:**
- Vehicle history reports
- Accident history
- Ownership history
- Title status
- Odometer readings
- Recall information

**Environment Variables:**
```bash
CARFAX_API_KEY=your-carfax-api-key
```

**Where to get it:**
1. Contact CARFAX Canada Business Solutions
2. Email: businesssolutions@carfax.ca
3. Phone: 1-888-422-7329
4. Request API access for dealerships
5. Get API key after approval

**Correct API Name:** `CARFAX Canada`  
**Website:** https://www.carfax.ca  
**Pricing:** Enterprise pricing (contact sales)

---

### 5. **Canadian Black Book (CBB)** - **OPTIONAL (Vehicle Valuations)**
**Status:** ⚠️ Configured but optional

**What it's for:**
- Canadian vehicle valuations
- Wholesale/retail pricing
- Market data
- Trade-in values

**Environment Variables:**
```bash
# Stored per-dealership in Supabase, not in .env
# Each dealership configures their own CBB API key in settings
```

**Where to get it:**
1. Go to https://www.canadianblackbook.com
2. Contact sales for API access
3. Get API credentials
4. Configure in dealership settings (not .env)

**Correct API Name:** `Canadian Black Book` (CBB)  
**Website:** https://www.canadianblackbook.com  
**Pricing:** Subscription-based (contact sales)

---

### 6. **Smartsheet** - **OPTIONAL (Deal Pipeline Tracking)**
**Status:** ⚠️ Configured but optional

**What it's for:**
- Deal pipeline tracking
- Spreadsheet-based CRM
- Team collaboration
- Reporting

**Environment Variables:**
```bash
SMARTSHEET_ACCESS_TOKEN=your-smartsheet-token
SMARTSHEET_SHEET_ID=your-sheet-id
```

**Where to get it:**
1. Go to https://www.smartsheet.com
2. Sign up for account
3. Go to Account → Apps & Integrations → API Access
4. Generate access token
5. Create a sheet and get its ID from URL

**Correct API Name:** `Smartsheet`  
**Website:** https://www.smartsheet.com  
**Pricing:** Free trial, then $7-$25/user/month

---

### 7. **JWT Authentication** - **REQUIRED (Multi-Tenant Security)**
**Status:** ✅ Already configured

**What it's for:**
- Dealership authentication
- Session management
- Multi-tenant data isolation

**Environment Variables:**
```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Where to get it:**
Generate a random secret:
```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: OpenSSL
openssl rand -hex 64

# Option 3: Online
# Visit https://www.grc.com/passwords.htm
```

**Correct API Name:** `JSON Web Token (JWT)` - Not an external API, just a secret key  
**Pricing:** Free (built into Node.js)

---

### 8. **AutoTrader.ca & CarGurus.ca Scrapers** - **FREE (No API Key)**
**Status:** ✅ Implemented with free Puppeteer scraper

**What it's for:**
- Competitor pricing data
- Market inventory analysis
- Vehicle listings

**Environment Variables:**
```bash
# NO API KEY NEEDED - Uses free Puppeteer scraper
```

**Correct API Name:** N/A - Direct web scraping  
**Pricing:** FREE

**Note:** Previously used Apify ($49/month), now uses free Puppeteer + Cheerio.

---

## 📋 Complete .env File Template

Create a `.env` file in your project root with these variables:

```bash
# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=10000
NODE_ENV=development

# ============================================
# REQUIRED: SUPABASE (Database)
# ============================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# ============================================
# REQUIRED: JWT SECRET (Multi-Tenant Auth)
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# ============================================
# REQUIRED: GOHIGHLEVEL (CRM Integration)
# ============================================
GHL_CLIENT_ID=your-client-id
GHL_CLIENT_SECRET=your-client-secret
GHL_REDIRECT_URI=http://localhost:10000/api/auth/callback
GHL_API_KEY=your-api-key
GHL_BASE_URL=https://services.leadconnectorhq.com/v1
GHL_LOCATION_ID=your-location-id
GHL_INBOUND_WEBHOOK_URL=your-webhook-url
GHL_WEBHOOK_SECRET=your-webhook-secret

# ============================================
# OPTIONAL: VIN DECODING (VINAudit Canada)
# ============================================
VINAUDIT_API_KEY=your-vinaudit-api-key

# ============================================
# OPTIONAL: VEHICLE HISTORY (CARFAX Canada)
# ============================================
CARFAX_API_KEY=your-carfax-api-key

# ============================================
# OPTIONAL: DEAL TRACKING (Smartsheet)
# ============================================
SMARTSHEET_ACCESS_TOKEN=your-smartsheet-token
SMARTSHEET_SHEET_ID=your-sheet-id

# ============================================
# NOTE: Canadian Black Book (CBB)
# Configured per-dealership in settings, not here
# ============================================
```

---

## 🎯 Priority Setup Order

### **Tier 1: MUST HAVE (System won't work without these)**
1. ✅ **Supabase** - Database & auth
2. ✅ **JWT_SECRET** - Security
3. ⚠️ **GoHighLevel** - CRM integration (if using GHL workflows)

### **Tier 2: RECOMMENDED (Core features work better)**
4. **VINAudit** - Better VIN decoding (has fallback)
5. **CARFAX** - Vehicle history reports

### **Tier 3: OPTIONAL (Nice to have)**
6. **Canadian Black Book** - Valuations
7. **Smartsheet** - Deal tracking

---

## 🔧 Setup Instructions

### 1. Create .env file
```bash
# In your project root
touch .env
```

### 2. Copy template above and fill in your keys

### 3. Verify configuration
```bash
# Start your server
npm run dev

# Check health endpoint
curl http://localhost:10000/health

# Should return:
# {"success":true,"status":"ok","timestamp":"...","environment":"development"}
```

### 4. Test each API
```bash
# Test Supabase connection
curl http://localhost:10000/api/dealerships

# Test GHL OAuth
# Visit: http://localhost:10000/api/auth/login

# Test VIN decoder
curl "http://localhost:10000/api/vin/decode?vin=1HGBH41JXMN109186"

# Test free scrapers
curl "http://localhost:10000/api/scrape/autotrader?make=Toyota&limit=5"
```

---

## 📞 API Support Contacts

| API | Support | Documentation |
|-----|---------|---------------|
| **Supabase** | https://supabase.com/support | https://supabase.com/docs |
| **GoHighLevel** | support@gohighlevel.com | https://highlevel.stoplight.io |
| **VINAudit** | support@vinaudit.ca | https://www.vinaudit.ca/api-documentation |
| **CARFAX** | businesssolutions@carfax.ca | Contact sales |
| **Canadian Black Book** | Contact sales | https://www.canadianblackbook.com |
| **Smartsheet** | https://help.smartsheet.com | https://smartsheet.redoc.ly |

---

## ⚠️ Important Notes

1. **Never commit .env to Git**
   - Already in .gitignore
   - Contains sensitive API keys

2. **Rotate keys regularly**
   - Change JWT_SECRET in production
   - Rotate API keys every 90 days

3. **Use different keys for dev/prod**
   - Separate Supabase projects
   - Separate GHL locations
   - Different JWT secrets

4. **Monitor API usage**
   - VINAudit charges per lookup
   - CARFAX has rate limits
   - Supabase has free tier limits

5. **Free alternatives available**
   - VIN decoding: Built-in fallback decoder
   - Scrapers: Free Puppeteer implementation (no Apify needed)
   - Black Book: Can use VINAudit valuations instead

---

## ✅ Summary

**Required APIs (3):**
1. Supabase - Database
2. JWT Secret - Security
3. GoHighLevel - CRM (if using GHL)

**Optional APIs (4):**
4. VINAudit - VIN decoding
5. CARFAX - Vehicle history
6. Canadian Black Book - Valuations
7. Smartsheet - Deal tracking

**Free Features (No API needed):**
- AutoTrader scraper (Puppeteer)
- CarGurus scraper (Puppeteer)
- Basic VIN decoder (fallback)
- Multi-tenant system (built-in)

**Total Cost (Minimum):**
- Supabase: $0 (free tier)
- JWT: $0 (built-in)
- GoHighLevel: $97-297/month (if needed)
- **Minimum to run: $0-97/month**
