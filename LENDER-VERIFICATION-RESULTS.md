# COMPREHENSIVE LENDER VERIFICATION RESULTS

## Extracted from PDFs using pdfplumber

---

## 1. TD AUTO FINANCE

### TD Non-Prime (2-6 Key)
**From PDF Tables:**

**LTV:**
- Used: 140% (all 2-6 Key)
- New 2024-2026: 125%
- ✅ CODE MATCHES

**Rates:**
- 6-Key: 11.99% (promotional)
- 5-Key: 14.5% (code)
- 4-Key: 17.5% (code)
- 3-Key: 21.5% (code)
- 2-Key: 27.0% (code)

**Reserve Structure:**
```
Base (no rate increase):
$40,000+: $700
$25,000-$39,999: $600
$20,000-$24,999: $500
$15,000-$19,999: $400
$10,000-$14,999: $300
$7,500-$9,999: $200

+1% Rate Increase:
$40,000+: $1,000
$25,000-$39,999: $900
$20,000-$24,999: $800
$15,000-$19,999: $575
$10,000-$14,999: $475
$7,500-$9,999: $300

+2% Rate Increase:
$40,000+: $1,300
$25,000-$39,999: $1,200
$20,000-$24,999: $1,100
$15,000-$19,999: $725
$10,000-$14,999: $625
$7,500-$9,999: $400
```
✅ CODE MATCHES (uses calculateTDReserve function)

**Other Parameters:**
- Fee: $799 ✅
- Max DSR: 50% ✅
- Min Income: $1,800/month ✅

---

## 2. SDA (SCOTIA DEALER ADVANTAGE)

### From PDF Tables:

**Rates:**
- Star 7: 11.99% ✅
- Star 6: 13.49% ✅
- Star 5: 14.49% ✅
- Star 4: 18.49% ✅
- Star 3: 21.99% ✅
- Star 2: 27.99% ✅
- Star 1: 29.99% ✅
- StartRight: 15.49% ✅

**LTV (New MSRP):**
- Star 7: 180% ✅
- Star 6: 180% ✅
- Star 5: **165%** ✅ (now fixed - was 160%)
- Star 4: **160%** ✅ (now fixed - was 150%)
- Star 3-1: 140% ✅

**LTV (Used):**
- Star 7: 180% ✅
- Star 6: 180% ✅
- Star 5: 160% ✅
- Star 4: 150% ✅
- Star 3-1: 140% ✅

**Reserve Structure:**
- Star 6-7: $600 base
- Star 4-5 & StartRight: $500 base
- Star 3: $400 base
- Star 2: $300 base
- Star 1: $100 base
- Max rate upsell: 2%

**Fees:**
- Star 7: $399
- StartRight: $599
- Star 2-6: $699
- Star 1: $799

**Max Terms by Year/Mileage:**
```
New 2024-2026: 84 months
2025 Used: 84 (0-35k), 84 (35-60k), 84 (60-90k), 66 (90-105k)
2024: 84 (0-60k), 84 (60-90k), 84 (90-130k), 60 (130-185k)
2023: 84 (0-70k), 84 (70-105k), 78 (105-150k), 60 (150-185k)
2022: 84 (0-80k), 84 (80-105k), 78 (105-150k), 48 (150-185k)
2021: 84 (0-90k), 78 (90-130k), 72 (130-170k), 48 (170-185k)
2020: 78 (0-90k), 72 (90-130k), 66 (130-170k), 48 (170-185k)
```

---

## 3. SANTANDER

### From PDF Tables:

**Tier Programs:**

**Rates:**
- Tier 8: 11.49%
- Tier 7: 13.49%
- Tier 6: 16.49%
- Tier 5: 21.99%

**LTV:**
- All-In LTV: 165% (all tiers)
- Warranty LTV: 30%

**Reserve Structure:**
```
Base Reserves:
Tier 8: $600
Tier 7: $600
Tier 6: $550
Tier 5: $550

+1% Up:
Tier 8: $950
Tier 7: $950
Tier 6: $850
Tier 5: $850

+2% Up:
Tier 8: $1,300
Tier 7: $1,300
Tier 6: $1,150
Tier 5: $1,150
```

**Max Terms:**
```
NEW 2024/25/26: 84 months (up to 10,000km, previously unregistered)
2025: 84 (35k), 84 (35-60k), 78 (60-90k), 66 (90-120k)
2024: 84 (65k), 84 (65-95k), 78 (95-130k), 66 (130-150k)
2023: 84 (75k), 84 (75-110k), 78 (110-150k), 66 (150-180k)
```

**❓ QUESTION:** Current code has Tier 1-8, but PDF only shows Tier 5-8. Need to verify Tier 1-4 parameters.

---

## 4. RIFCO

### From PDF Tables:

**Programs:**
- **Standard**: 29.95% rate
- **Preferred**: (rate not shown in first table)

**LTV:**
- Preferred Front End: 125%
- Preferred All-In: 155%
- Standard Front End: 130%
- Standard All-In: 155%

**Max Amount to Finance:**
- Both: $35,000

**❓ QUESTION:** Need to extract full Preferred tier rates and complete parameter set.

---

## 5. iA AUTO FINANCE

### From PDF Tables:

**Rates:**
- 6th Gear: 11.49% ✅
- 5th Gear: 15.49%
- 4th Gear: 20.49%
- 3rd Gear: 25.49%
- 2nd Gear: 29.99%
- 1st Gear: 29.99%

**LTV:**
- **New Vehicle**: $60,000+ Amount to Finance / 90 Day Approvals
- **Used:**
  - 6th: 140% ✅
  - 5th: 140%
  - 4th: 135%
  - 3rd: 125%
  - 2nd: 125%
  - 1st: 110%

**Reserve Structure:**
```
> $50,000: $1,000
$45,001-$50,000: $750
$35,001-$45,000: $600
$20,001-$35,000: $500
$15,001-$20,000: $450
$10,001-$15,000: $300
< $10,000: $100
```

**Max Terms:** (Similar structure to other lenders by year/mileage)

**❓ QUESTION:** New vehicle LTV is "$60,000+ Amount to Finance" - is this a dollar limit or percentage? Need clarification.

---

## 6. NORTHLAKE

### From PDF Tables:

**Programs Found:**
- Program PDF: 1 table
- Booking PDF: 2 tables

**❓ QUESTION:** Need to extract detailed parameters. Tables found but need parsing.

---

## 7. AUTOCAPITAL

### From PDF Tables:

**Rates:**
- Tier 1: 13.49%
- Tier 2: 14.49%
- Tier 3: 15.99%
- Tier 4: 17.99%
- Tier 5: 21.49%
- Tier 6: 23.49%

**LTV:**
- **Front-End:**
  - Tier 1-3: 140%
  - Tier 4-5: 135%
  - Tier 6: 130%
- **All-In:**
  - Tier 1-2: 175%
  - Tier 3-4: 165%
  - Tier 5-6: 150%

**Max DSR:**
- Tier 1-2: 55%
- Tier 3: 50%
- Tier 4: 47%
- Tier 5-6: 43%

**Max Terms:**
- Tier 1-5: 84 months
- Tier 6: 72 months

**Fee:**
- All tiers: $799

---

## 8. EDEN PARK

### From PDF Tables:

**Tables Found:** 6 tables

**❓ QUESTION:** Need to extract detailed parameters. Multiple tables found.

---

## 9. PREFERA

### From PDF Tables:

**Tables Found:** 0 tables

**❓ CRITICAL:** PDF has no tables detected. May need different extraction method or PDF is image-based.

---

## 10. LENDCARE

### From PDF Tables:

**Rates:**
- Tier 1: 11.9% - 25.9%
- Tier 2: 26.9% - 28.9%
- Tier 3: 29.9%

**LTV:**
- Tier 1: 140%
- Tier 2: 140%
- Tier 3: 110%

**Aftermarket Products:**
- Tier 1: 30% of Selling Price
- Tier 2: 20% of Selling Price
- Tier 3: 20% of Selling Price

**Dealer Reserve:**
- Tier 1: $799
- Tier 2: $599
- Tier 3: $199-$399

**Max Loan Amount:**
- Tier 1: Up to $50,000
- Tier 2: Up to $30,000
- Tier 3: Up to $20,000

**Other:**
- Income Verification: No (Tier 1), Yes (Tier 2-3)
- GPS: No (Tier 1), Yes (Tier 2-3)

---

## SUMMARY OF ISSUES FOUND:

### ✅ FIXED:
1. TD LTV: 125% new / 140% used
2. SDA LTV: Dynamic for Star 5 (165% new/160% used) and Star 4 (160% new/150% used)
3. Subvented rates: Vehicle model-specific (Ram 1500/Durango get lower rates)

### ❓ NEED CLARIFICATION:
1. **Santander**: PDF only shows Tier 5-8, code has Tier 1-8. Where are Tier 1-4 parameters?
2. **RIFCO**: Need full Preferred tier rate structure
3. **iA Auto**: New vehicle LTV is "$60,000+" - is this a dollar limit or percentage?
4. **Northlake**: Tables found but need detailed parsing
5. **Eden Park**: 6 tables found but need detailed parsing
6. **Prefera**: No tables detected - may be image-based PDF
7. **All lenders**: Need to verify max terms by year/mileage match booking guides

### 📋 NEXT STEPS:
1. Parse remaining lender tables in detail
2. Compare all extracted parameters to current code
3. Create list of discrepancies for each lender
4. Fix any mismatches found
