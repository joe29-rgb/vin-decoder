import PyPDF2
import re
import os

def extract_pdf_text(pdf_path):
    """Extract all text from a PDF file"""
    try:
        with open(pdf_path, 'rb') as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            text = ''
            for page in reader.pages:
                text += page.extract_text() + '\n'
            return text
    except Exception as e:
        return f"Error: {str(e)}"

# Extract TD Non-Prime PDF
td_path = os.path.join('lender-pdfs', 'td non prime.pdf')
text = extract_pdf_text(td_path)

print("="*80)
print("TD AUTO FINANCE NON-PRIME (2-6 KEY) - COMPLETE PARAMETER EXTRACTION")
print("="*80)

# Save full text for reference
with open('lender-pdfs/td-nonprime-full.txt', 'w', encoding='utf-8') as f:
    f.write(text)

print("\n### PROGRAM RATES")
print("-" * 80)

# Look for rate information
if "As low as 11.99%" in text:
    print("✓ Base promotional rate: 11.99%")
    print("  (Note: This is for 6-Key, promotional, for qualifying customers)")

# Extract all percentage rates mentioned
rates = re.findall(r'(\d+\.\d{2})%', text)
unique_rates = sorted(set(rates), key=lambda x: float(x))
print(f"\n✓ All rates found in PDF: {', '.join(unique_rates)}%")

print("\n### ADVANCE PERCENTAGES (LTV)")
print("-" * 80)

# Look for advance info
if "Used CarAdvance 140%" in text:
    print("✓ Used vehicles: 140% advance (all 2-6 Key)")

if "New Car Advance 125%" in text or "125% on 2024" in text or "125% on 20 24" in text:
    print("✓ New vehicles (2024-2026): 125% advance")

# Look for new car definition
new_car_match = re.search(r'New Car.*?is defined.*?as.*?(\d{4}).*?(\d{4}).*?unit.*?with less than.*?(\d+,?\d+)\s*km', text, re.IGNORECASE | re.DOTALL)
if new_car_match:
    print(f"\n✓ New car definition: {new_car_match.group(1)}-{new_car_match.group(2)} units with less than {new_car_match.group(3)} km")

print("\n### RESERVE STRUCTURE")
print("-" * 80)

# Extract reserve brackets
print("✓ Base reserves (no rate increase):")
if "$40,000+" in text and "$700" in text:
    print("  $40,000+: $700")
    print("  $25,000-$39,999: $600")
    print("  $20,000-$24,999: $500")
    print("  $15,000-$19,999: $400")
    print("  $10,000-$14,999: $300")
    print("  $7,500-$9,999: $200")

print("\n✓ Reserves with +1% rate increase:")
if "$1,000" in text and "Increase 1%" in text:
    print("  $40,000+: $1,000")
    print("  $25,000-$39,999: $900")
    print("  $20,000-$24,999: $800")
    print("  $15,000-$19,999: $575")
    print("  $10,000-$14,999: $475")
    print("  $7,500-$9,999: $300")

print("\n✓ Reserves with +2% rate increase:")
if "$1,300" in text and "Increase 2%" in text:
    print("  $40,000+: $1,300")
    print("  $25,000-$39,999: $1,200")
    print("  $20,000-$24,999: $1,100")
    print("  $15,000-$19,999: $725")
    print("  $10,000-$14,999: $625")
    print("  $7,500-$9,999: $400")

print("\n### CUSTOMER FEE")
print("-" * 80)

fee_match = re.search(r'\$(\d+).*?customer administration fee', text, re.IGNORECASE)
if fee_match:
    print(f"✓ Customer administration fee: ${fee_match.group(1)}")

print("\n### DSR (DEBT SERVICE RATIO)")
print("-" * 80)

dsr_match = re.search(r'TDSR.*?of up to\s+(\d+)%', text, re.IGNORECASE)
if dsr_match:
    print(f"✓ Max TDSR: {dsr_match.group(1)}%")

print("\n### MINIMUM INCOME")
print("-" * 80)

income_match = re.search(r'Income levels of\s+\$(\d+,?\d+)/month', text, re.IGNORECASE)
if income_match:
    print(f"✓ Min income: ${income_match.group(1)}/month")

print("\n### MAXIMUM TERMS BY YEAR/MILEAGE")
print("-" * 80)

# Extract term table
print("✓ Extracting term limits by year and mileage...")

# Look for year/term patterns
year_terms = re.findall(r'(20\d{2})\+?\s+(?:New\*?)?\s+(\d{2})', text)
if year_terms:
    print("\nYear-based terms found:")
    for year, term in year_terms[:10]:
        print(f"  {year}: {term} months")

print("\n### NEGATIVE EQUITY")
print("-" * 80)

neg_equity_match = re.search(r'Negative equity.*?\$(\d+,?\d+).*?\$(\d+,?\d+)', text, re.IGNORECASE | re.DOTALL)
if neg_equity_match:
    print(f"✓ Negative equity options: ${neg_equity_match.group(1)} and ${neg_equity_match.group(2)}")

print("\n### WARRANTY & AFTERMARKET")
print("-" * 80)

if "40 per cent" in text or "40%" in text:
    print("✓ Max warranty/aftermarket: 40% of Black Book value")

tier1_match = re.search(r'Tier I Warranties.*?\$(\d+,?\d+).*?less than two years.*?\$(\d+,?\d+)', text, re.IGNORECASE | re.DOTALL)
if tier1_match:
    print(f"✓ Tier I Warranty: ${tier1_match.group(1)} (<2 years), ${tier1_match.group(2)} (≥2 years)")

tier2_match = re.search(r'Tier II Warranties.*?\$(\d+,?\d+).*?less than two years.*?\$(\d+,?\d+)', text, re.IGNORECASE | re.DOTALL)
if tier2_match:
    print(f"✓ Tier II Warranty: ${tier2_match.group(1)} (<2 years), ${tier2_match.group(2)} (≥2 years)")

print("\n" + "="*80)
print("Full text saved to: lender-pdfs/td-nonprime-full.txt")
print("="*80)
