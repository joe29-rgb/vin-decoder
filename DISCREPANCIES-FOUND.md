# LENDER PROGRAM DISCREPANCIES - PDF vs CODE

## Questions for User to Confirm Correct Values

---

## 1. SUBVENTED PROGRAMS - TD & SDA

### From PDF (SUBVENTED PROGRAM.pdf):
The PDF shows **vehicle-specific rates with bonus cash amounts**:

#### 2025 Model Year Examples:
- **Ram 1500 Tradesman/Warlock/Express**: $9,250 bonus cash
  - TD KEY 6: 6.99% OR 7.99% OR 16.49% OR 18.49%
  - TD KEY 5: 6.99% OR 7.99% OR 16.49% OR 18.49%
  - SDA STAR 6: 6.99% OR 7.99% OR 16.49% OR 18.49%
  - SDA STAR 5: 6.99% OR 7.99% OR 16.49% OR 18.49%

- **Ram 1500 Big Horn**: $9,250 bonus cash
  - Same rates as above

- **Ram 1500 Sport/Rebel**: $10,000 bonus cash
  - Same rates as above

- **Ram 1500 Laramie/Limited/Longhorn/Tungsten/RHO**: $12,250 bonus cash
  - Same rates as above

- **Ram 2500/3500 Gas Models**: $9,500 bonus cash
  - TD KEY 6: 8.99% OR 11.99% OR 16.99% OR 20.09%
  - TD KEY 5: 8.99% OR 11.99% OR 16.99% OR 20.09%
  - SDA STAR 6: 8.99% OR 11.99% OR 16.99% OR 20.09%
  - SDA STAR 5: 8.99% OR 11.99% OR 16.99% OR 20.09%

- **Durango SXT/GT**: $8,000 bonus cash
  - TD KEY 6: 6.99% OR 7.99% OR 16.99% OR 20.09%
  - TD KEY 5: 6.99% OR 7.99% OR 16.99% OR 20.09%

- **Durango R/T/Citadel**: $9,500 bonus cash
  - Same rates as above

- **Hornet GT (Gas)**: $3,500 bonus cash
  - TD KEY 6: 8.99% OR 11.99% OR 16.99% OR 20.09%

- **Pacifica Hybrid**: No bonus cash listed
  - TD KEY 6: 8.99% OR 11.99% OR 16.99% OR 20.09%

### Current Code Implementation:
```typescript
export function getSubventedRate(
  lender: string,
  program: string,
  vehicleYear: number,
  vehicleMake: string,
  amountFinanced: number
): number | null {
  // Only for new 2024-2026 vehicles
  if (vehicleYear < 2024 || vehicleYear > 2026) return null;
  
  // Only for FCA brands
  const fcaBrands = ['chrysler', 'dodge', 'jeep', 'ram'];
  const makeNorm = (vehicleMake || '').toLowerCase().trim();
  if (!fcaBrands.includes(makeNorm)) return null;
  
  // TD KEY programs - FIXED RATES
  if (isTD) {
    if (tier === 6) return 8.99;  // KEY 6: 8.99% or 11.99%
    if (tier === 5) return 7.99;  // KEY 5: 7.99%, 11.99%, or 16.99%
    if (tier === 4) return 16.99; // KEY 4: 16.99%
    if (tier === 3) return 20.09; // KEY 3: 20.09%
  }
  
  // SDA STAR programs - FIXED RATES
  if (isSDA) {
    if (tier === 6) return 8.99;  // STAR 6: 8.99%, 11.99%, or 16.99%
    if (tier === 5) return 7.99;  // STAR 5: 7.99%, 11.99%, or 16.99%
    if (tier === 4) return 16.99; // STAR 4: 16.99%
    if (tier === 3) return 20.09; // STAR 3: 20.09%
  }
  
  return null;
}
```

### ❓ QUESTIONS:

**Q1:** The PDF shows **MULTIPLE rate options** (e.g., "6.99% OR 7.99% OR 16.49% OR 18.49%") for the same vehicle/program. The code returns a **SINGLE fixed rate**. 

Which approach is correct?
- A) Code should return the **LOWEST rate** available (e.g., 6.99% for Ram 1500)?
- B) Code should return **MULTIPLE rate options** and let the dealer choose?
- C) Rate depends on **customer credit quality** within the tier?
- D) Rate depends on **bonus cash amount** or **vehicle model**?

**Q2:** The PDF shows **different rates for different vehicles**:
- Ram 1500: 6.99% OR 7.99% OR 16.49% OR 18.49%
- Ram 2500/3500: 8.99% OR 11.99% OR 16.99% OR 20.09%
- Hornet: 8.99% OR 11.99% OR 16.99% OR 20.09%

Should the code check **vehicle model** (not just make) to determine subvented rate?

**Q3:** The PDF shows **bonus cash amounts** ($9,250, $10,000, $12,250, etc.) tied to specific vehicles. Should these be:
- A) Automatically deducted from vehicle price?
- B) Shown to dealer as available incentive?
- C) Ignored (dealer handles separately)?

**Q4:** Current code returns:
- TD KEY 6: 8.99%
- TD KEY 5: 7.99%

But PDF shows for Ram 1500:
- TD KEY 6: 6.99% (lowest option)
- TD KEY 5: 6.99% (lowest option)

Which is correct?

---

## 2. TD NON-PRIME RATES

### From PDF (td non prime.pdf):
- 2-Key: "As low as 11.99%" (promotional)
- Higher rates apply for older model years

### Current Code:
```typescript
'2-Key': {
  rate: 27.0,  // ← Is this the non-promotional rate?
  ...
}
```

### ❓ QUESTION:

**Q5:** TD 2-Key shows "As low as 11.99%" in PDF but code has `rate: 27.0`. 
- Is 27.0% the **standard rate** and 11.99% is **promotional**?
- Should code use 11.99% for new vehicles and 27.0% for older vehicles?
- How do we determine which rate applies?

---

## 3. SDA RATES & LTV

### From PDF (sda rate.pdf):
The extracted text is messy, but I need clarification on:

### Current Code:
```typescript
SDA: {
  'Star7': { rate: 11.99, ltv: 180 },
  'Star6': { rate: 13.49, ltv: 180 },
  'Star5': { rate: 14.49, ltv: 160 },
  'Star4': { rate: 18.49, ltv: 150 },
  'Star3': { rate: 21.99, ltv: 140 },
  'Star2': { rate: 27.99, ltv: 140 },
  'Star1': { rate: 29.99, ltv: 140 },
}
```

### ❓ QUESTIONS:

**Q6:** Do SDA programs have the same **125% advance for new 2024-2026 vehicles** like TD?
- Current code: YES (implemented in getEffectiveLTV)
- Need confirmation this is correct

**Q7:** Are the SDA Star rates (11.99%, 13.49%, 14.49%, etc.) correct?
- Need PDF verification

---

## 4. RESERVE CALCULATIONS

### From PDF (td non prime.pdf):
Reserve structure with rate increase:
- $40,000+: $700 (base) or $1,000 (+1%) or $1,300 (+2%)
- $25,000-$39,999: $600 (base) or $900 (+1%) or $1,200 (+2%)
- etc.

### Current Code:
```typescript
export function calculateTDReserve(amountFinanced: number, rateIncrease: number = 0): number {
  // Uses same bracket structure
  // Returns reserve based on amount financed and rate increase
}
```

### ❓ QUESTION:

**Q8:** The reserve calculation appears to match. Confirm this is working correctly?

---

## 5. OTHER LENDERS

Need to verify detailed parameters for:
- Santander (Tier 1-8)
- RIFCO (Standard + Preferred)
- iA Auto Finance (1st-6th Gear)
- Northlake (5 tiers)
- AutoCapital (Tier 1-6)
- Eden Park (Ride programs)
- Prefera (P1-P4)
- LendCare (Tier 1-3)

### ❓ QUESTION:

**Q9:** Should I extract and verify ALL parameters (rates, LTV, DSR, terms, reserves, fees) for all 10 lenders?
- This will take significant time to parse the messy PDFs
- Or focus only on TD/SDA since those are the most critical?

---

## SUMMARY OF KEY ISSUES:

1. **Subvented rates**: PDF shows multiple rate options per vehicle, code returns single rate
2. **Vehicle-specific rates**: PDF has different rates for different Ram models, code doesn't distinguish
3. **Bonus cash**: PDF shows bonus cash amounts, code doesn't handle these
4. **TD 2-Key rate**: 11.99% (promotional) vs 27.0% (standard) - which to use?
5. **SDA verification**: Need to confirm all Star program rates and LTV values

**Please answer questions Q1-Q9 so I can fix the code correctly.**
