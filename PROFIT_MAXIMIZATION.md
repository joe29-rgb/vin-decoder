# 💰 Profit Maximization Engine

## Overview

The profit maximization engine calculates the **maximum profit potential** for each approval program by determining how much you can advance at the approved payment limit. This helps dealerships extract maximum gross profit from every deal.

---

## Key Concept: Lower Rate = More Profit

**Critical Insight:**
- Lower interest rate = MORE advance capacity
- More advance capacity = Higher selling price OR more aftermarket
- Higher selling price/aftermarket = MORE PROFIT

**Example:**
```
Customer approved at $900/month for 84 months

SDA 6 Star (13.49%):
  Max Advance: $66,500
  Max Profit: $22,850

Santander Tier 4 (24.49%):
  Max Advance: $45,500
  Max Profit: $4,300

DIFFERENCE: $21,000 more selling power with SDA!
```

---

## Features

### 1. Maximum Advance Calculator

Calculates the maximum principal that results in the approved payment:

```typescript
calculateMaximumAdvance(monthlyPayment, annualRate, termMonths)

// Example:
calculateMaximumAdvance(900, 13.49, 84)
// Returns: $66,500
```

**Formula:**
```
P = PMT × [(1 - (1 + r)^-n) / r]

Where:
  P = Maximum Principal (advance)
  PMT = Monthly Payment
  r = Monthly Interest Rate (annual rate / 12 / 100)
  n = Number of Months
```

---

### 2. Subvented Rate Detection

Automatically detects when subvented rates apply for new FCA vehicles:

**Subvented Rate Rules:**
- Vehicle must be **2024-2026 model year**
- Vehicle must be **Chrysler, Dodge, Jeep, or Ram**
- Program must be **TD or SDA**
- Program must be **Tier 3-6** (Star 3-6 or Key 3-6)

**Subvented Rates:**
```
TD/SDA Star 6 / Key 6: 8.99% (vs 11.99% standard)
TD/SDA Star 5 / Key 5: 7.99% (vs 14.5% standard)
TD/SDA Star 4 / Key 4: 16.99% (vs 18.49% standard)
TD/SDA Star 3 / Key 3: 20.09% (vs 21.99% standard)
```

**Impact:**
```
2025 Ram 1500 with SDA 6 Star approval ($900/month)

Standard Rate (13.49%):
  Max Advance: $66,500
  Max Profit: $22,850

Subvented Rate (8.99%):
  Max Advance: $73,000
  Max Profit: $28,600

EXTRA PROFIT: $5,750 with subvented rate!
```

---

### 3. Multi-Approval Profit Scoring

Scores each vehicle against **all active approvals** and recommends the most profitable program:

```typescript
calculateAllProfitScenarios(vehicle, approvals, trade, province, docFee)

// Returns scenarios sorted by profit (highest first)
[
  {
    lender: 'SDA',
    program: '6 Star',
    rate: 13.49,
    isSubvented: false,
    maxAdvance: 66500,
    maxSellingPrice: 58000,
    frontGross: 18600,
    reserve: 600,
    totalGross: 22850,
    profitRank: 22850
  },
  {
    lender: 'TD',
    program: '5-Key',
    rate: 14.5,
    maxAdvance: 60500,
    totalGross: 17600,
    // ... (loses $5,250 vs SDA)
  },
  // ... other scenarios
]
```

---

### 4. Approval Ranking System

Ranks all approvals by profit potential:

```typescript
rankApprovalsByProfit(approvals, termMonths)

// Returns:
[
  {
    bank: 'SDA',
    program: '6 Star',
    apr: 13.49,
    paymentMax: 900,
    maxAdvance: 66500,
    profitPotential: 66500,
    rank: 1,
    recommendation: 'HIGHEST_PROFIT'
  },
  {
    bank: 'TD',
    program: '5-Key',
    apr: 14.5,
    paymentMax: 900,
    maxAdvance: 60500,
    rank: 2,
    recommendation: 'GOOD_ALTERNATIVE'
  },
  {
    bank: 'Santander',
    program: 'Tier 4',
    apr: 24.49,
    paymentMax: 900,
    maxAdvance: 45500,
    rank: 4,
    recommendation: 'LAST_RESORT'
  }
]
```

---

## API Endpoints

### POST `/approvals/rank`

Rank approvals by profit potential.

**Request:**
```json
{
  "approvals": [
    {
      "bank": "SDA",
      "program": "6 Star",
      "apr": 13.49,
      "paymentMax": 900,
      "termMonths": 84
    },
    {
      "bank": "Santander",
      "program": "Tier 4",
      "apr": 24.49,
      "paymentMax": 900,
      "termMonths": 84
    }
  ],
  "termMonths": 84
}
```

**Response:**
```json
{
  "success": true,
  "ranked": [
    {
      "bank": "SDA",
      "program": "6 Star",
      "maxAdvance": 66500,
      "rank": 1,
      "recommendation": "HIGHEST_PROFIT"
    },
    {
      "bank": "Santander",
      "program": "Tier 4",
      "maxAdvance": 45500,
      "rank": 2,
      "recommendation": "LAST_RESORT"
    }
  ]
}
```

---

### POST `/approvals/profit-scenarios`

Calculate profit scenarios for a specific vehicle across all approvals.

**Request:**
```json
{
  "vehicle": {
    "id": "PW2273",
    "year": 2025,
    "make": "Ram",
    "model": "1500",
    "yourCost": 55000,
    "blackBookValue": 60000
  },
  "approvals": [
    {
      "bank": "SDA",
      "program": "6 Star",
      "apr": 13.49,
      "paymentMax": 900,
      "downPayment": 5000
    }
  ],
  "trade": {
    "allowance": 8000,
    "acv": 7500,
    "lienBalance": 4500
  },
  "province": "AB",
  "docFee": 799
}
```

**Response:**
```json
{
  "success": true,
  "scenarios": [
    {
      "lender": "SDA",
      "program": "6 Star",
      "rate": 13.49,
      "isSubvented": false,
      "maxAdvance": 66500,
      "maxSellingPrice": 73000,
      "frontGross": 18600,
      "reserve": 600,
      "aftermarketCapacity": 8500,
      "backGross": 4250,
      "totalGross": 22850
    }
  ]
}
```

---

### POST `/approvals/score-multi`

Score entire inventory against multiple approvals with profit maximization.

**Request:**
```json
{
  "approvals": [
    {
      "bank": "SDA",
      "program": "6 Star",
      "apr": 13.49,
      "paymentMax": 900
    },
    {
      "bank": "TD",
      "program": "5-Key",
      "apr": 14.5,
      "paymentMax": 900
    }
  ],
  "trade": {
    "allowance": 0,
    "acv": 0,
    "lienBalance": 0
  },
  "province": "AB",
  "docFee": 799
}
```

**Response:**
```json
{
  "success": true,
  "deals": [
    {
      "vehicle": {
        "id": "PW2273",
        "year": 2025,
        "make": "Ram",
        "model": "1500"
      },
      "bestScenario": {
        "lender": "SDA",
        "program": "6 Star",
        "totalGross": 22850
      },
      "allScenarios": [
        {
          "lender": "SDA",
          "totalGross": 22850
        },
        {
          "lender": "TD",
          "totalGross": 17600
        }
      ],
      "profitPotential": 22850
    }
  ],
  "inventoryCount": 24,
  "approvalsCount": 2
}
```

---

## Usage Examples

### Example 1: Rank Multiple Approvals

```javascript
// User has 4 approvals
const approvals = [
  { bank: 'Santander', program: 'Tier 4', apr: 24.49, paymentMax: 900 },
  { bank: 'IA Auto', program: '5th Gear', apr: 15.49, paymentMax: 900 },
  { bank: 'TD', program: '5-Key', apr: 14.5, paymentMax: 900 },
  { bank: 'SDA', program: '6 Star', apr: 13.49, paymentMax: 900 }
];

// Rank by profit potential
const response = await fetch('/approvals/rank', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ approvals, termMonths: 84 })
});

const { ranked } = await response.json();

// Display to user:
// 🥇 SDA 6 Star - $66,500 max advance - HIGHEST PROFIT
// 🥈 TD 5-Key - $60,500 max advance - GOOD ALTERNATIVE
// 🥉 IA 5th Gear - $59,000 max advance - GOOD ALTERNATIVE
// ⚠️  Santander Tier 4 - $45,500 max advance - LAST RESORT
```

---

### Example 2: Score Inventory with Profit Maximization

```javascript
// Score all inventory against all approvals
const response = await fetch('/approvals/score-multi', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    approvals: [
      { bank: 'SDA', program: '6 Star', apr: 13.49, paymentMax: 900 },
      { bank: 'TD', program: '5-Key', apr: 14.5, paymentMax: 900 }
    ],
    trade: { allowance: 0, acv: 0, lienBalance: 0 },
    province: 'AB',
    docFee: 799
  })
});

const { deals } = await response.json();

// Display sorted by profit:
deals.forEach(deal => {
  console.log(`${deal.vehicle.id}: ${deal.bestScenario.lender} ${deal.bestScenario.program}`);
  console.log(`  Max Profit: $${deal.profitPotential.toFixed(2)}`);
  console.log(`  Rate: ${deal.bestScenario.rate}%${deal.bestScenario.isSubvented ? ' ⭐ SUBVENTED' : ''}`);
});
```

---

### Example 3: Compare Programs for Specific Vehicle

```javascript
// User clicks "See Options" on a vehicle
const response = await fetch('/approvals/profit-scenarios', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vehicle: {
      id: 'PW2273',
      year: 2025,
      make: 'Ram',
      model: '1500',
      yourCost: 55000
    },
    approvals: [
      { bank: 'SDA', program: '6 Star', apr: 13.49, paymentMax: 900 },
      { bank: 'Santander', program: 'Tier 4', apr: 24.49, paymentMax: 900 }
    ],
    trade: { allowance: 0, acv: 0, lienBalance: 0 }
  })
});

const { scenarios } = await response.json();

// Show comparison:
// ⭐ SDA 6 Star: $22,850 profit (RECOMMENDED)
// ⚠️  Santander Tier 4: $4,300 profit (You lose $18,550!)
```

---

## Profit Maximization Strategies

### Strategy 1: Max Front Gross
- Set selling price to maximum that hits payment limit
- Minimal aftermarket
- **Best for:** High-cost vehicles, maximizing front-end profit

### Strategy 2: Balanced
- Moderate selling price
- Moderate aftermarket package
- **Best for:** Most deals, balanced profit distribution

### Strategy 3: Max Aftermarket
- Lower selling price (closer to cost)
- Maximum aftermarket products (warranty, gap, protection)
- **Best for:** Lower-cost vehicles, maximizing back-end profit

---

## Important Notes

1. **Always use lowest rate first** - More advance = more profit
2. **Check for subvented rates** - New FCA vehicles can save 4-5% on TD/SDA
3. **Target full payment** - Don't leave money on the table
4. **Compare all programs** - Show user profit loss if using wrong program
5. **Factor in reserve** - Dynamic reserves (TD, IA, Eden Park) vary by advance amount

---

## Lender Guidelines (DO NOT MODIFY)

The profit maximization engine uses the existing lender guidelines which are **correct and must not be modified**. The engine only calculates maximum advance and profit potential based on these guidelines.

**Lender programs include:**
- TD (2-6 Key + Prime programs)
- Santander (Tier 1-8)
- SDA (Star 1-7 + StartRight)
- RIFCO (Standard + Preferred Tier 1-3)
- IA Auto Finance (1st-6th Gear)
- Northlake (Titanium, Platinum, Gold, Standard, U-Drive)
- AutoCapital (Tier 1-6)
- Eden Park (2-6 Ride + EP Ride+ + EP No Hit)
- Prefera (P1-P4)
- LendCare (Tier 1-3)

All rates, reserves, fees, LTV limits, and DSR limits are defined in `src/modules/lender-programs.ts` and must remain unchanged.

---

## Next Steps

The profit maximization engine is now available via API. Frontend integration needed:

1. **Dashboard**: Show ranked approvals with profit potential
2. **Inventory Scoring**: Display best program per vehicle
3. **Deal Worksheet**: Show profit comparison across programs
4. **Visual Indicators**: Highlight subvented rates, profit loss warnings

---

**Built for maximum profit extraction on every deal.** 💰
