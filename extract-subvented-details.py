import PyPDF2
import os
import re

def extract_pdf_text(pdf_path):
    """Extract all text from a PDF file"""
    try:
        with open(pdf_path, 'rb') as pdf_file:
            reader = PyPDF2.PdfReader(pdf_file)
            text = ''
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                text += f"\n\n===== PAGE {i+1} =====\n\n{page_text}"
            return text
    except Exception as e:
        return f"Error: {str(e)}"

# Extract subvented program PDF
subvented_path = os.path.join('lender-pdfs', 'SUBVENTED PROGRAM.pdf')
print("Extracting SUBVENTED PROGRAM.pdf...\n")
print("="*80)

text = extract_pdf_text(subvented_path)

# Save to file for analysis
with open('lender-pdfs/subvented-extracted.txt', 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved to: lender-pdfs/subvented-extracted.txt")
print("\nSearching for key information...\n")
print("="*80)

# Look for vehicle makes
print("\n### VEHICLE MAKES/MODELS:")
if 'Chrysler' in text:
    print("✓ Chrysler found")
if 'Dodge' in text:
    print("✓ Dodge found")
if 'Jeep' in text:
    print("✓ Jeep found")
if 'Ram' in text:
    print("✓ Ram found")

# Look for model years
print("\n### MODEL YEARS:")
years = re.findall(r'20(24|25|26)', text)
if years:
    print(f"✓ Years found: {', '.join(set(years))}")

# Look for rebate types
print("\n### REBATE TYPES:")
rebate_keywords = ['Bonus Cash', 'Conquest', 'Loyalty', 'Stackable', 'Non-Stackable', 
                   'Customer Cash', 'Dealer Cash', 'Finance Cash', 'Lease Cash']
for keyword in rebate_keywords:
    if keyword.lower() in text.lower():
        print(f"✓ {keyword} mentioned")

# Look for TD and SDA programs
print("\n### LENDERS:")
if 'TD' in text or 'TD Auto Finance' in text:
    print("✓ TD Auto Finance found")
if 'SDA' in text or 'Scotia' in text:
    print("✓ Scotia Dealer Advantage (SDA) found")

# Look for KEY/STAR tiers
print("\n### PROGRAM TIERS:")
for i in range(2, 7):
    if f'{i}-Key' in text or f'KEY {i}' in text or f'Key {i}' in text:
        print(f"✓ TD {i}-Key found")
    if f'Star {i}' in text or f'STAR {i}' in text or f'Star{i}' in text:
        print(f"✓ SDA Star {i} found")

# Look for interest rates
print("\n### INTEREST RATES FOUND:")
rates = re.findall(r'(\d+\.\d{2})%', text)
if rates:
    unique_rates = sorted(set(rates))
    print(f"Rates: {', '.join(unique_rates)}%")

# Look for amount financed brackets
print("\n### AMOUNT FINANCED BRACKETS:")
amounts = re.findall(r'\$\d{1,3},?\d{3}', text)
if amounts:
    unique_amounts = sorted(set(amounts))
    print(f"Found: {', '.join(unique_amounts[:10])}...")

print("\n" + "="*80)
print("Full text saved to: lender-pdfs/subvented-extracted.txt")
print("Review this file to see the complete structure")
print("="*80)
