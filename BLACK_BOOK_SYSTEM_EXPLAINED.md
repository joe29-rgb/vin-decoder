# BLACK BOOK SYSTEM - HOW IT WORKS

## Overview
The Black Book value is the **single most critical number** in subprime auto financing. It determines how much a lender will advance on a vehicle and caps the dealer's back-end profit.

---

## The Three Values in the System

### 1. **Black Book Value** (`blackBookValue`)
- **Purpose:** Used by lenders for all advance and cap calculations
- **Source:** Manually entered by dealer (via "Set BB" button)
- **Critical for:** Front-end cap, back-end cap, LTV calculations
- **Example:** $30,000

### 2. **CBB Wholesale** (`cbbWholesale`)
- **Purpose:** Canadian Black Book dealer wholesale value (reference only)
- **Source:** Manual entry or CSV upload
- **Not used in calculations:** This is for dealer reference
- **Example:** $28,500

### 3. **CBB Retail** (`cbbRetail`)
- **Purpose:** Canadian Black Book retail value (reference only)
- **Source:** Manual entry or CSV upload
- **Not used in calculations:** This is for dealer reference
- **Example:** $32,000

---

## How Black Book Controls the Deal

### Example Scenario: Eden Park "5 Ride" Approval

**Customer Approval:**
- Bank: Eden Park
- Program: 5 Ride
- APR: 13.99%
- Term: 84 months
- Payment Range: $400 - $950/month
- **Front-End Advance: 140%** ← This comes from the approval
- Down Payment: $2,000

**Vehicle in Inventory:**
- 2023 Ford F-150
- Your Cost: $25,000
- **Black Book: $30,000** ← CRITICAL VALUE
- Mileage: 45,000 km

---

### Step 1: Calculate Front-End Cap

```javascript
// From approvals-engine.ts line 138
const frontCap = frontCapFactor * blackBookValue;

// With our example:
frontCap = 1.40 × $30,000 = $42,000
```

**What this means:**
- Maximum sale price is **$42,000**
- Lender won't advance more than 140% of Black Book
- Protects lender from over-lending on the vehicle

---

### Step 2: Find Optimal Sale Price

```javascript
// Binary search between minPrice and maxPrice
// Find highest price where payment ≤ $950

minPrice = $25,000 (your cost)
maxPrice = $42,000 (front cap)

// System searches and finds:
optimalPrice = $38,000
monthlyPayment = $945 ✓ (within range)
```

---

### Step 3: Calculate Front Gross

```javascript
// From approvals-engine.ts line 155
const front = (salePrice - yourCost) - overAllowance;

// With our example (no trade):
frontGross = $38,000 - $25,000 - $0 = $13,000
```

---

### Step 4: Calculate Back Gross (Reserve)

**Eden Park Reserve Schedule:**
- $45,001+: $750 base reserve

**Amount Financed:**
```javascript
principal = salePrice - downPayment + fee + tax
principal = $38,000 - $2,000 + $810 + $3,800 = $40,610
```

**Base Reserve:** $750 (from lender rules)

**Back-End Cap Check:**
```javascript
// If approval has backCap: { type: 'percent_of_bb', percent: 0.20 }
capAmount = 0.20 × $30,000 = $6,000

// Reserve is capped at lesser of:
backGross = min($750, $6,000) = $750 ✓
```

---

### Step 5: Total Deal Profit

```javascript
totalGross = frontGross + backGross
totalGross = $13,000 + $750 = $13,750
```

---

## Different Lenders, Different Advances

### AutoCapital Canada - Tier 1 (Best Prime)
- **Front-End Advance: 140%**
- **All-In LTV: 175%**
- Black Book: $30,000
- Max Sale Price: $30,000 × 1.40 = **$42,000**

### AutoCapital Canada - Tier 6 (High Risk)
- **Front-End Advance: 130%**
- **All-In LTV: 150%**
- Black Book: $30,000
- Max Sale Price: $30,000 × 1.30 = **$39,000**

### TD Auto Finance - 5-Key Program (Subprime)
- **Front-End LTV: 140%**
- **All-In LTV: 100%**
- Black Book: $30,000
- Max Sale Price: $30,000 × 1.40 = **$42,000**

**Key Point:** The `frontCapFactor` varies by lender and tier. It comes from:
1. The approval PDF (parsed into `ApprovalSpec.frontCapFactor`)
2. Or falls back to `LenderRuleSet.frontCapFactor` from rules-library

---

## How to Use the System

### 1. **Load Inventory**
- Scrape or upload CSV
- Vehicles load with `blackBookValue: undefined`

### 2. **Set Black Book Values**
- Click "View Inventory"
- Click "Set BB" button for each vehicle
- Enter the Black Book value (e.g., 30000)
- System updates `state.inventory[].blackBookValue`

### 3. **Upload Approval**
- Upload approval PDF
- System parses:
  - `bank`, `program`, `apr`, `termMonths`
  - `paymentMin`, `paymentMax`
  - `frontCapFactor` (e.g., 1.40 for Eden Park 5 Ride)
  - `backCap` (if applicable)

### 4. **Calculate Matrix**
- System scores each vehicle:
  - Skips vehicles with missing `blackBookValue`
  - Calculates `frontCap = frontCapFactor × blackBookValue`
  - Finds optimal price within payment range
  - Calculates front/back gross
  - Ranks by total gross profit

### 5. **Review Results**
- Top deals shown in grid
- Sorted by highest total gross profit
- Click "Details" to see breakdown

---

## Why This Matters for Subprime

### Lender Protection
- Black Book prevents over-advancing on vehicles
- Ensures loan-to-value (LTV) ratios stay within limits
- Reduces risk of negative equity situations

### Dealer Profit
- Front gross: Vehicle markup
- Back gross: Lender reserves and bonuses
- Both are constrained by Black Book value

### Customer Affordability
- Payment range ensures customer can afford the deal
- Term caps by model year prevent long loans on old vehicles
- DSR (Debt Service Ratio) checks ensure income sufficiency

---

## Common Mistakes to Avoid

❌ **Using CBB Wholesale instead of Black Book**
- CBB Wholesale is a reference value
- Black Book is what lenders use for calculations

❌ **Hardcoding frontCapFactor to 1.40**
- Different lenders have different advances
- TD 5-Key: **140%** of Black Book
- AutoCapital Tier 1: **140%** of Black Book
- Eden Park 5 Ride: **140%** of Black Book
- Always use `ApprovalSpec.frontCapFactor` or `LenderRuleSet.frontCapFactor`

❌ **Forgetting to set Black Book**
- Vehicles without Black Book are skipped in scoring
- Flag: `missing_black_book`

❌ **Confusing front-end advance with all-in LTV**
- Front-end: Max sale price as % of Black Book
- All-in: Max total financed (including taxes, fees, negative equity) as % of Black Book

---

## Code Flow Summary

```
1. User sets blackBookValue manually via "Set BB" button
   ↓
2. User uploads approval PDF → ApprovalSpec with frontCapFactor
   ↓
3. User clicks "Calculate Matrix"
   ↓
4. scoreInventory() loops through inventory:
   - Loads frontCapFactor from approval or lender rules
   - Calculates frontCap = frontCapFactor × blackBookValue
   - Binary search for optimal price within payment range
   - Calculates front gross, back gross, total gross
   ↓
5. Results displayed, sorted by total gross profit
```

---

## Manual Black Book Entry - Already Implemented ✓

**Location:** `src/public/dashboard.js` lines 455-468

**How it works:**
1. Click "View Inventory" button
2. Find vehicle in table
3. Click "Set BB" button
4. Enter Black Book value (e.g., 30000)
5. System calls `/api/inventory/sync` with `{ id, blackBookValue }`
6. Updates `state.inventory` and `state.mirroredInventory`
7. Value persists and is used in all calculations

**No changes needed** - this functionality already exists and works correctly.
