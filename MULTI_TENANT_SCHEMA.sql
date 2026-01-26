-- Multi-Tenant Database Schema for Finance-in-a-Box
-- This schema enables data isolation per dealership for GHL marketplace deployment

-- ============================================================================
-- DEALERSHIPS TABLE (Tenant Management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dealerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ghl_location_id TEXT UNIQUE NOT NULL,
  ghl_company_id TEXT,
  
  -- Dealership Information
  name TEXT NOT NULL,
  website_url TEXT,
  logo_url TEXT,
  
  -- Location Information
  location TEXT,
  postal_code TEXT,
  province TEXT DEFAULT 'AB',
  
  -- Configuration
  used_inventory_path TEXT DEFAULT '/search/used/',
  new_inventory_path TEXT DEFAULT '/search/new/',
  competitor_radius_km INTEGER DEFAULT 100,
  
  -- Fees
  doc_fee DECIMAL(10, 2) DEFAULT 799.00,
  ppsa_fee DECIMAL(10, 2) DEFAULT 38.73,
  
  -- API Credentials (encrypted in production)
  cbb_api_key TEXT,
  cbb_api_url TEXT DEFAULT 'https://api.canadianblackbook.com/v1',
  
  -- OAuth Tokens (encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Onboarding
  onboarding_complete BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  subscription_status TEXT DEFAULT 'trial',
  subscription_expires_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dealerships_ghl_location ON dealerships(ghl_location_id);
CREATE INDEX IF NOT EXISTS idx_dealerships_active ON dealerships(is_active);

-- ============================================================================
-- VEHICLES TABLE (Inventory)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  
  -- Vehicle Identification
  vin TEXT,
  stock_number TEXT,
  
  -- Vehicle Details
  year INTEGER,
  make TEXT,
  model TEXT,
  trim TEXT,
  mileage INTEGER,
  color TEXT,
  engine TEXT,
  transmission TEXT,
  body_style TEXT,
  
  -- Pricing
  your_cost DECIMAL(10, 2) DEFAULT 0,
  suggested_price DECIMAL(10, 2) DEFAULT 0,
  black_book_value DECIMAL(10, 2) DEFAULT 0,
  
  -- Status
  in_stock BOOLEAN DEFAULT TRUE,
  
  -- Images
  image_url TEXT,
  image_urls JSONB,
  
  -- Metadata
  source TEXT DEFAULT 'manual',
  quality_score INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicles_dealership ON vehicles(dealership_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_stock ON vehicles(stock_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_in_stock ON vehicles(in_stock);

-- ============================================================================
-- APPROVALS TABLE (Customer Approvals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  
  -- GHL Integration
  contact_id TEXT,
  location_id TEXT,
  
  -- Customer Information
  customer_name TEXT,
  province TEXT DEFAULT 'AB',
  is_native_status BOOLEAN DEFAULT FALSE,
  
  -- Approval Details
  bank TEXT NOT NULL,
  program TEXT,
  apr DECIMAL(5, 2),
  term_months INTEGER,
  payment_min DECIMAL(10, 2),
  payment_max DECIMAL(10, 2),
  down_payment DECIMAL(10, 2) DEFAULT 0,
  
  -- Trade Information
  trade_allowance DECIMAL(10, 2) DEFAULT 0,
  trade_acv DECIMAL(10, 2) DEFAULT 0,
  trade_lien DECIMAL(10, 2) DEFAULT 0,
  trade_year INTEGER,
  trade_make TEXT,
  trade_model TEXT,
  trade_vin TEXT,
  
  -- Configuration
  front_cap_factor DECIMAL(5, 2) DEFAULT 1.4,
  
  -- Status
  status TEXT DEFAULT 'active',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approvals_dealership ON approvals(dealership_id);
CREATE INDEX IF NOT EXISTS idx_approvals_contact ON approvals(contact_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

-- ============================================================================
-- DEALS TABLE (Scored Deals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealership_id UUID NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  
  -- References
  approval_id UUID REFERENCES approvals(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  
  -- Deal Details
  sale_price DECIMAL(10, 2),
  monthly_payment DECIMAL(10, 2),
  front_gross DECIMAL(10, 2),
  back_gross DECIMAL(10, 2),
  product_margin DECIMAL(10, 2),
  total_gross DECIMAL(10, 2),
  
  -- Lender Details
  lender TEXT,
  tier TEXT,
  term INTEGER,
  apr DECIMAL(5, 2),
  
  -- Compliance
  ltv DECIMAL(5, 2),
  dsr DECIMAL(5, 2),
  
  -- Status
  status TEXT DEFAULT 'pending',
  pushed_to_ghl BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deals_dealership ON deals(dealership_id);
CREATE INDEX IF NOT EXISTS idx_deals_approval ON deals(approval_id);
CREATE INDEX IF NOT EXISTS idx_deals_vehicle ON deals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);

-- ============================================================================
-- SCRAPER_CACHE TABLE (Caching for Performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS scraper_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealership_id UUID REFERENCES dealerships(id) ON DELETE CASCADE,
  
  -- Cache Key
  url TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  
  -- Cached Data
  data JSONB NOT NULL,
  
  -- Expiration
  expires_at TIMESTAMP NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scraper_cache_dealership ON scraper_cache(dealership_id);
CREATE INDEX IF NOT EXISTS idx_scraper_cache_key ON scraper_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_scraper_cache_expires ON scraper_cache(expires_at);

-- ============================================================================
-- AUDIT_LOG TABLE (Track Changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealership_id UUID REFERENCES dealerships(id) ON DELETE CASCADE,
  
  -- Action Details
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  
  -- User Information
  user_id TEXT,
  user_email TEXT,
  
  -- Changes
  old_data JSONB,
  new_data JSONB,
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_dealership ON audit_log(dealership_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_dealerships_updated_at BEFORE UPDATE ON dealerships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own dealership's data
-- Note: In production, you'll need to set up proper authentication
-- and use JWT claims to identify the current dealership

-- Example policy for vehicles (repeat for other tables)
CREATE POLICY dealership_isolation_vehicles ON vehicles
  FOR ALL
  USING (dealership_id = current_setting('app.current_dealership_id')::UUID);

CREATE POLICY dealership_isolation_approvals ON approvals
  FOR ALL
  USING (dealership_id = current_setting('app.current_dealership_id')::UUID);

CREATE POLICY dealership_isolation_deals ON deals
  FOR ALL
  USING (dealership_id = current_setting('app.current_dealership_id')::UUID);

-- ============================================================================
-- SAMPLE DATA (FOR TESTING)
-- ============================================================================

-- Insert a sample dealership
INSERT INTO dealerships (
  ghl_location_id,
  name,
  website_url,
  location,
  postal_code,
  province,
  onboarding_complete
) VALUES (
  'sample-location-123',
  'Sample Dealership',
  'https://www.sampledealership.com',
  'Alberta',
  'T5J',
  'AB',
  TRUE
) ON CONFLICT (ghl_location_id) DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
MIGRATION PLAN:
1. Run this schema on your Supabase instance
2. Update application code to:
   - Set current_dealership_id in session for RLS
   - Filter all queries by dealership_id
   - Store OAuth tokens in dealerships table
3. Migrate existing data:
   - Create a default dealership for current data
   - Update all existing records with dealership_id
4. Test data isolation thoroughly
5. Deploy to production

SECURITY CONSIDERATIONS:
- Encrypt sensitive fields (API keys, tokens) at rest
- Use Supabase's built-in encryption for sensitive columns
- Implement proper JWT-based authentication
- Rotate tokens regularly
- Audit all data access

PERFORMANCE OPTIMIZATIONS:
- Add indexes on frequently queried columns
- Use connection pooling
- Implement caching layer (Redis)
- Monitor query performance
- Partition large tables if needed
*/
