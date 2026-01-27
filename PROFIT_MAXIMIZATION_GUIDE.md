# 💰 Profit Maximization - Complete User Guide

## Overview

The profit maximization system helps dealerships extract maximum gross profit from every deal by intelligently comparing multiple approval programs and automatically recommending the most profitable option.

---

## 🎯 Key Concept

**Lower interest rate = MORE advance capacity = MORE profit**

When a customer is approved at $900/month:
- **SDA 6 Star (13.49%)** → $66,500 max advance → **$22,850 profit**
- **Santander Tier 4 (24.49%)** → $45,500 max advance → **$4,300 profit**

**Using the wrong program costs you $18,550 in profit!**

---

## 📋 Complete Workflow

### **Step 1: Add Approvals**

When you receive approvals from lenders, enter them into the system:

1. Navigate to **Approvals Manager** (`/approvals-manager.html`)
2. Click **"Add Approval"**
3. Enter approval details:
   - Lender (TD, SDA, Santander, etc.)
   - Program (Star 4, Tier 6, 5-Key, etc.)
   - Interest Rate
   - Max Payment
   - Down Payment
   - Trade Info (if applicable)

**The system automatically:**
- Calculates maximum advance for each approval
- Ranks approvals by profit potential
- Detects subvented rates for new FCA vehicles
- Shows visual indicators (🥇🥈🥉)

---

### **Step 2: View Ranked Approvals**

The **Approvals Manager** displays all active approvals ranked by profit:

```
🥇 SDA 6 Star - 13.49%
   Max Advance: $66,500
   Profit Potential: $22,850
   ⭐ HIGHEST PROFIT - Use this first!

🥈 TD 5-Key - 14.5%
   Max Advance: $60,500
   Profit Potential: $17,600
   ✅ Good alternative

🥉 IA 5th Gear - 15.49%
   Max Advance: $59,000
   Profit Potential: $16,100
   ✅ Good alternative

⚠️  Santander Tier 4 - 24.49%
   Max Advance: $45,500
   Profit Potential: $4,300
   ⚠️ LAST RESORT - Only if others decline
```

**Visual Indicators:**
- 🥇 Gold border = Highest profit
- 🥈 Silver border = Second best
- 🥉 Bronze border = Third best
- ⚠️ Red border = Last resort (lowest profit)

---

### **Step 3: Score Inventory**

Click **"Score All Inventory"** to see which vehicles work with your approvals:

1. System scores EVERY vehicle against EVERY approval
2. Automatically selects the BEST program per vehicle (highest profit)
3. Displays results sorted by profit potential

**Multi-Approval Scoring Page shows:**
- Total vehicles that qualify
- Active approvals count
- Total profit potential across all deals
- Average profit per deal

**For each vehicle:**
- Best program (⭐ indicator)
- Interest rate (⭐ if subvented)
- Max advance amount
- Profit potential
- Alternative program count

---

### **Step 4: Compare Programs**

Click **"Compare"** on any vehicle to see ALL program options:

```
⭐ SDA 6 Star (RECOMMENDED)
   Rate: 13.49%
   Max Advance: $66,500
   Front Gross: $18,600
   Reserve: $600
   Total Gross: $22,850

✅ TD 5-Key
   Rate: 14.5%
   Max Advance: $60,500
   Total Gross: $17,600
   ⚠️ You lose $5,250 profit vs best program

⚠️ Santander Tier 4
   Rate: 24.49%
   Max Advance: $45,500
   Total Gross: $4,300
   ⚠️ You lose $18,550 profit vs best program
```

**Profit Loss Warnings:**
- Red warning box shows exactly how much profit you lose
- Helps justify using lower-rate programs to management
- Makes it obvious when you're leaving money on the table

---

### **Step 5: Build Deal**

Click **"Build Deal"** on your selected vehicle:

1. System pre-populates deal worksheet with:
   - Vehicle details
   - Best program (highest profit)
   - Correct interest rate (including subvented rates)
   - All fees (doc fee, PPSA based on province)
   - Reserve amount
   - Calculated payment

2. **Profit Comparison Section** shows:
   - Current program details
   - Alternative programs available
   - Profit loss if switching
   - One-click program switching

3. **Deal Worksheet Features:**
   - Real-time calculations
   - DealerTrack-style layout
   - Copy all values to clipboard
   - Push to GHL
   - Export PDF / Print

---

## ⭐ Subvented Rate Detection

The system automatically detects when subvented rates apply:

**Requirements:**
- Vehicle year: 2024-2026
- Vehicle make: Chrysler, Dodge, Jeep, Ram
- Lender: TD or SDA
- Program: Tier/Star 3-6

**Subvented Rates:**
```
Star 6 / Key 6: 8.99% (vs 11.99% standard)
Star 5 / Key 5: 7.99% (vs 14.5% standard)
Star 4 / Key 4: 16.99% (vs 18.49% standard)
Star 3 / Key 3: 20.09% (vs 21.99% standard)
```

**Visual Indicator:**
- ⭐ icon appears next to rate
- Gold color highlighting
- "SUBVENTED" badge

**Impact Example:**
```
2025 Ram 1500 with SDA 6 Star ($900/month)

Standard Rate (13.49%):
  Max Advance: $66,500
  Profit: $22,850

Subvented Rate (8.99%):
  Max Advance: $73,000
  Profit: $28,600

EXTRA PROFIT: $5,750 with subvented rate!
```

---

## 🎨 Visual Indicators Guide

### **Approval Rankings:**
- 🥇 **Gold** = #1 (Highest profit)
- 🥈 **Silver** = #2
- 🥉 **Bronze** = #3
- **Gray** = #4+
- ⚠️ **Red** = Last resort

### **Program Badges:**
- ⭐ **Green** = HIGHEST PROFIT (recommended)
- ✅ **Blue** = Good alternative
- ⚠️ **Red** = LAST RESORT (profit loss)

### **Rate Indicators:**
- ⭐ **Gold star** = Subvented rate (new FCA vehicles)
- **White text** = Standard rate

### **Profit Warnings:**
- 🔴 **Red box** = Profit loss warning
- Shows exact dollar amount lost vs best program

---

## 📊 Profit Maximization Strategies

### **Strategy 1: Max Front Gross**
- Set selling price to maximum that hits payment limit
- Minimal aftermarket
- **Best for:** High-cost vehicles, maximizing front-end profit

**Example:**
```
Vehicle Cost: $55,000
Max Advance: $66,500 (SDA 6 Star)
Max Selling Price: $73,000
Front Gross: $18,000
Reserve: $600
Aftermarket: $0
TOTAL GROSS: $18,600
```

### **Strategy 2: Balanced**
- Moderate selling price
- Moderate aftermarket package
- **Best for:** Most deals, balanced profit distribution

**Example:**
```
Vehicle Cost: $55,000
Max Advance: $66,500
Selling Price: $65,000
Front Gross: $10,000
Reserve: $600
Aftermarket: $8,000 (warranty, gap, protection)
Back Gross: $4,000 (50% margin)
TOTAL GROSS: $14,600
```

### **Strategy 3: Max Aftermarket**
- Lower selling price (closer to cost)
- Maximum aftermarket products
- **Best for:** Lower-cost vehicles, maximizing back-end profit

**Example:**
```
Vehicle Cost: $55,000
Max Advance: $66,500
Selling Price: $58,000
Front Gross: $3,000
Reserve: $600
Aftermarket: $15,000 (full package)
Back Gross: $7,500 (50% margin)
TOTAL GROSS: $11,100
```

---

## 🚀 Best Practices

### **1. Always Use Lowest Rate First**
- Lower rate = more advance = more profit
- Start with SDA/TD programs (lowest rates)
- Only use high-rate programs as last resort

### **2. Check for Subvented Rates**
- New 2024-2026 FCA vehicles get 4-5% lower rates
- System detects automatically
- Can add $5,000+ extra profit per deal

### **3. Target Full Payment**
- Don't leave money on the table
- If approved at $900/month, aim for $900/month
- Use profit comparison to maximize advance

### **4. Show Profit Loss to Management**
- Use comparison view to justify program selection
- Red warnings make profit loss obvious
- Helps get buy-in for using lower-rate programs

### **5. Factor in Reserve**
- TD, IA, Eden Park, AutoCapital, Prefera = Dynamic reserves
- SDA, Santander, RIFCO, Northlake = Flat reserves
- Higher advance = higher reserve (for dynamic lenders)

---

## 🔧 Technical Details

### **Maximum Advance Formula**
```
P = PMT × [(1 - (1 + r)^-n) / r]

Where:
  P = Maximum Principal (advance)
  PMT = Monthly Payment
  r = Monthly Interest Rate (annual / 12 / 100)
  n = Number of Months
```

### **API Endpoints**

**Rank Approvals:**
```javascript
POST /approvals/rank
Body: {
  approvals: [...],
  termMonths: 84
}
```

**Score Inventory:**
```javascript
POST /approvals/score-multi
Body: {
  approvals: [...],
  trade: {...},
  province: 'AB',
  docFee: 799
}
```

**Profit Scenarios:**
```javascript
POST /approvals/profit-scenarios
Body: {
  vehicle: {...},
  approvals: [...],
  trade: {...}
}
```

---

## 📱 Page Navigation

1. **Approvals Manager** (`/approvals-manager.html`)
   - Add/view/rank approvals
   - See profit potential per program
   - Navigate to scoring

2. **Multi-Approval Scoring** (`/multi-approval-scoring.html`)
   - Score all inventory
   - Compare programs per vehicle
   - Build deals

3. **Deal Worksheet** (`/deal-worksheet.html`)
   - Pre-populated with best program
   - Profit comparison section
   - Real-time calculations
   - Export/print/push to GHL

---

## ⚠️ Important Notes

### **PPSA Fees**
- PPSA is now a **provincial constant**, not a dealership setting
- Alberta: $38.73
- Ontario: $65.00
- Other provinces: See `src/constants/provincial-fees.ts`
- Automatically applied based on dealership province

### **Lender Guidelines**
- All lender programs are **correct and must not be modified**
- Rates, reserves, fees, LTV, DSR limits are real-world rules
- System respects all lender guidelines automatically
- No arbitrary limits imposed by the app

### **Data Storage**
- Approvals stored in Supabase (multi-tenant)
- Isolated by `dealership_id`
- Real-time scoring across all active approvals
- No manual program selection needed

---

## 🎓 Training Tips

### **For New Users:**
1. Start with one approval to understand the flow
2. Add more approvals to see profit comparison
3. Use "Compare" button to understand profit differences
4. Build a few deals to see real-world profit impact

### **For Managers:**
1. Review profit comparison reports weekly
2. Track profit loss from using suboptimal programs
3. Train staff on subvented rate detection
4. Monitor average profit per deal metrics

### **For F&I:**
1. Always check for subvented rates on new FCA vehicles
2. Use profit comparison to justify program selection
3. Target full payment approval amount
4. Balance front/back gross based on vehicle cost

---

## 📈 Success Metrics

Track these KPIs to measure profit maximization impact:

- **Average Profit Per Deal** (target: $15,000+)
- **Subvented Rate Usage** (% of eligible deals)
- **Profit Loss from Suboptimal Programs** (minimize)
- **Best Program Selection Rate** (target: 90%+)
- **Average Advance vs. Approval Max** (target: 95%+)

---

## 🆘 Troubleshooting

**Q: Why don't I see profit comparison?**
A: Need multiple approvals for the same customer. Add more approvals to see comparison.

**Q: Why isn't subvented rate showing?**
A: Check vehicle year (2024-2026), make (FCA brands), and lender (TD/SDA only).

**Q: Profit seems wrong?**
A: Verify vehicle cost, trade values, and down payment are correct. System uses these for calculations.

**Q: Can I override program selection?**
A: Yes, use "Switch Program" button in profit comparison section. System will warn about profit loss.

**Q: How do I add new lenders?**
A: Contact support. Lender programs are carefully configured and require developer access.

---

**Built for maximum profit extraction on every deal.** 💰
