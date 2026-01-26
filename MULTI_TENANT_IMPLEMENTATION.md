# Multi-Tenant Implementation Guide

## Current Status: PARTIALLY IMPLEMENTED ⚠️

### What's Done ✅
1. **Database Schema** - Complete schema in `MULTI_TENANT_SCHEMA.sql`
2. **Multi-tenant module** - Created `src/modules/multi-tenant.ts` with dealership management
3. **Supabase filtering** - Updated to support `dealership_id` parameter
4. **OAuth flow** - Basic OAuth 2.0 implementation in `src/api/routes/auth.ts`

### What's Missing ❌
1. **Dealership ID injection** - Not automatically added to requests
2. **Session/JWT management** - No way to track which dealership is making requests
3. **Database migration** - Schema not deployed to Supabase yet
4. **API route updates** - Most routes don't filter by dealership_id
5. **Settings migration** - Still using file-based config instead of Supabase

---

## How Multi-Tenant SHOULD Work

### Architecture Flow:
```
1. User installs app from GHL marketplace
   ↓
2. OAuth redirects to /api/auth/callback with locationId
   ↓
3. System calls getOrCreateDealership(locationId)
   ↓
4. Creates/finds dealership record in Supabase
   ↓
5. Stores dealership_id in JWT/session
   ↓
6. All API calls include dealership_id
   ↓
7. All database queries filter by dealership_id
```

### Current Problem:
```
❌ No JWT/session management
❌ No dealership_id in requests
❌ Routes don't filter by dealership
❌ Settings still in JSON file
❌ Schema not deployed to Supabase
```

---

## Implementation Steps Required

### Step 1: Deploy Database Schema
```bash
# Run this SQL on your Supabase instance
psql $DATABASE_URL < MULTI_TENANT_SCHEMA.sql
```

Or via Supabase dashboard:
1. Go to SQL Editor
2. Copy contents of `MULTI_TENANT_SCHEMA.sql`
3. Execute

### Step 2: Implement Session Management

**Option A: JWT-based (Recommended)**
```typescript
// After OAuth callback
const token = jwt.sign(
  { dealershipId: dealership.id, locationId: dealership.ghl_location_id },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Set as cookie
res.cookie('auth_token', token, { httpOnly: true, secure: true });
```

**Option B: Express Session**
```typescript
req.session.dealershipId = dealership.id;
```

### Step 3: Add Middleware to Extract Dealership ID

```typescript
// src/api/middleware/dealership-context.ts
export function injectDealershipContext(req, res, next) {
  // Extract from JWT
  const token = req.cookies.auth_token;
  if (token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.dealershipId = decoded.dealershipId;
  }
  
  // Fallback to header (for testing)
  if (!req.dealershipId) {
    req.dealershipId = req.headers['x-dealership-id'];
  }
  
  next();
}
```

### Step 4: Update All API Routes

**Inventory Routes:**
```typescript
// src/api/routes/inventory.ts
router.post('/upload', async (req, res) => {
  const dealershipId = req.dealershipId; // From middleware
  
  // ... parse CSV ...
  
  await saveInventoryToSupabase(vehicles, dealershipId);
});

router.get('/', async (req, res) => {
  const dealershipId = req.dealershipId;
  const inventory = await fetchInventoryFromSupabase(dealershipId);
  res.json({ vehicles: inventory });
});
```

**Settings Routes:**
```typescript
// src/api/routes/dealership.ts
router.get('/config', async (req, res) => {
  const dealershipId = req.dealershipId;
  const dealership = await getDealershipById(dealershipId);
  res.json({ success: true, ...dealership });
});

router.post('/config', async (req, res) => {
  const dealershipId = req.dealershipId;
  const updated = await updateDealershipConfig(dealershipId, req.body);
  res.json({ success: true, config: updated });
});
```

### Step 5: Update Server Initialization

```typescript
// src/server.ts
import { injectDealershipContext } from './api/middleware/dealership-context';

// Add middleware BEFORE routes
app.use(injectDealershipContext);

// Then mount routes
app.use('/api/inventory', inventoryRouter);
// etc...
```

### Step 6: Migrate File-Based Config to Database

```typescript
// One-time migration script
async function migrateConfigToDatabase() {
  const fileConfig = loadConfig(); // From dealership-config.ts
  
  // Create default dealership
  const dealership = await getOrCreateDealership('default-location-id');
  
  // Update with file config
  await updateDealershipConfig(dealership.id, {
    name: fileConfig.dealershipName,
    website_url: fileConfig.websiteUrl,
    // ... etc
  });
}
```

---

## Testing Multi-Tenant Isolation

### Test 1: Create Two Dealerships
```bash
# Dealership A
curl -X POST http://localhost:10000/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"locationId": "dealership-a", "code": "auth-code-a"}'

# Dealership B
curl -X POST http://localhost:10000/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"locationId": "dealership-b", "code": "auth-code-b"}'
```

### Test 2: Upload Inventory to Each
```bash
# Upload to Dealership A
curl -X POST http://localhost:10000/api/inventory/upload \
  -H "x-dealership-id: <dealership-a-uuid>" \
  -H "Content-Type: application/json" \
  -d '{"csvContent": "..."}'

# Upload to Dealership B
curl -X POST http://localhost:10000/api/inventory/upload \
  -H "x-dealership-id: <dealership-b-uuid>" \
  -H "Content-Type: application/json" \
  -d '{"csvContent": "..."}'
```

### Test 3: Verify Isolation
```bash
# Fetch Dealership A inventory
curl http://localhost:10000/api/inventory \
  -H "x-dealership-id: <dealership-a-uuid>"
# Should only see Dealership A vehicles

# Fetch Dealership B inventory
curl http://localhost:10000/api/inventory \
  -H "x-dealership-id: <dealership-b-uuid>"
# Should only see Dealership B vehicles
```

---

## Deployment Checklist

- [ ] Deploy `MULTI_TENANT_SCHEMA.sql` to Supabase
- [ ] Implement JWT or session management
- [ ] Add `injectDealershipContext` middleware
- [ ] Update all API routes to use `req.dealershipId`
- [ ] Migrate file-based config to database
- [ ] Remove `dealership-config.json` file usage
- [ ] Update OAuth callback to create dealership records
- [ ] Test data isolation between dealerships
- [ ] Update frontend to include dealership context
- [ ] Add RLS policies in Supabase (optional but recommended)

---

## Current Workaround (Single Dealership)

Until multi-tenant is fully implemented, you can:

1. **Deploy one Railway instance per dealership** (not scalable)
2. **Use header-based routing** (temporary):
   ```typescript
   // All requests include header
   fetch('/api/inventory', {
     headers: { 'x-dealership-id': 'abc-123' }
   });
   ```

---

## Next Steps

**Priority 1: Deploy Schema**
- Run `MULTI_TENANT_SCHEMA.sql` on Supabase

**Priority 2: Session Management**
- Implement JWT-based auth
- Store dealership_id in token

**Priority 3: Update Routes**
- Add middleware to inject dealership context
- Update all routes to filter by dealership_id

**Priority 4: Migrate Settings**
- Move from file to Supabase `dealerships` table
- Remove `dealership-config.json` usage

**Priority 5: Test**
- Create multiple test dealerships
- Verify complete data isolation
