-- Add unique constraint to vehicles table for upsert operations
-- This allows ON CONFLICT to work properly when upserting vehicles

-- First, remove any duplicate VINs within the same dealership (if any exist)
DELETE FROM vehicles a USING vehicles b
WHERE a.id < b.id 
  AND a.dealership_id = b.dealership_id 
  AND a.vin = b.vin
  AND a.vin IS NOT NULL;

-- Add unique constraint on (dealership_id, vin)
-- This ensures each VIN is unique within a dealership
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_dealership_vin_unique 
UNIQUE (dealership_id, vin);

-- Also add a unique constraint on (dealership_id, stock_number) for stock-based lookups
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_dealership_stock_unique 
UNIQUE (dealership_id, stock_number);
