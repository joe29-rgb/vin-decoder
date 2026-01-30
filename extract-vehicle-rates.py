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

# Extract subvented program PDF
sub_path = os.path.join('lender-pdfs', 'SUBVENTED PROGRAM.pdf')
text = extract_pdf_text(sub_path)

print("="*80)
print("SUBVENTED PROGRAM - VEHICLE-SPECIFIC RATES EXTRACTION")
print("="*80)

# Define vehicle models to search for
vehicles = [
    'Grand Caravan',
    'Pacifica',
    'Pacifica Hybrid',
    'Durango',
    'Charger',
    'Hornet',
    'Wagoneer',
    'Ram 1500',
    'Ram 2500',
    'Ram 3500',
    'Ram Promaster',
    'Ram Chassis Cab',
    'FIAT 500e'
]

print("\n### EXTRACTING RATES BY VEHICLE MODEL")
print("-" * 80)

for vehicle in vehicles:
    # Search for vehicle and extract rates after it
    pattern = rf'{vehicle}.*?([\d\.]{{4,}}%.*?[\d\.]{{4,}}%.*?[\d\.]{{4,}}%.*?[\d\.]{{4,}}%)'
    matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
    
    if matches:
        print(f"\n✓ {vehicle}:")
        for match in matches[:1]:  # Take first match
            # Extract all rates from the match
            rates = re.findall(r'(\d+\.\d{2})%', match)
            if rates:
                print(f"  Rates found: {', '.join(rates)}%")
                # Try to identify which tier each rate belongs to
                if len(rates) >= 4:
                    print(f"  Likely: KEY/STAR 6={rates[0]}%, 5={rates[1]}%, 4={rates[2]}%, 3={rates[3]}%")

# Also look for bonus cash amounts
print("\n\n### BONUS CASH AMOUNTS BY VEHICLE")
print("-" * 80)

for vehicle in vehicles:
    # Search for vehicle and bonus cash amount before rates
    pattern = rf'{vehicle}.*?\$(\d{{1,2}},?\d{{3}})'
    matches = re.findall(pattern, text, re.IGNORECASE)
    
    if matches:
        print(f"✓ {vehicle}: ${matches[0]} bonus cash")

# Extract the rate structure more systematically
print("\n\n### RATE STRUCTURE BY TIER")
print("-" * 80)

# Look for KEY 6, KEY 5, KEY 4, KEY 3 patterns
print("\nSearching for TD KEY program rates...")
for tier in [6, 5, 4, 3]:
    pattern = rf'KEY {tier}.*?(\d+\.\d{{2}})%'
    matches = re.findall(pattern, text, re.IGNORECASE)
    if matches:
        unique = sorted(set(matches))
        print(f"  KEY {tier}: {', '.join(unique)}%")

print("\nSearching for SDA STAR program rates...")
for tier in [6, 5, 4, 3]:
    pattern = rf'STAR {tier}.*?(\d+\.\d{{2}})%'
    matches = re.findall(pattern, text, re.IGNORECASE)
    if matches:
        unique = sorted(set(matches))
        print(f"  STAR {tier}: {', '.join(unique)}%")

# Look for specific vehicle rate patterns
print("\n\n### DETAILED VEHICLE RATE EXTRACTION")
print("-" * 80)

# Ram 1500 variants
ram_variants = [
    'Ram 1500 Tradesman',
    'Ram 1500 Warlock',
    'Ram 1500 Express',
    'Ram 1500 Big Horn',
    'Ram 1500 Sport',
    'Ram 1500 Rebel',
    'Ram 1500 Laramie',
    'Ram 1500 Limited',
    'Ram 1500 Longhorn',
    'Ram 1500 Tungsten',
    'Ram 1500 RHO'
]

for variant in ram_variants:
    # Look for variant with bonus cash and rates
    pattern = rf'{variant}.*?\$(\d{{1,2}},?\d{{3}}).*?(\d+\.\d{{2}})%.*?(\d+\.\d{{2}})%.*?(\d+\.\d{{2}})%.*?(\d+\.\d{{2}})%'
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if match:
        print(f"\n✓ {variant}:")
        print(f"  Bonus Cash: ${match.group(1)}")
        print(f"  Rates: {match.group(2)}%, {match.group(3)}%, {match.group(4)}%, {match.group(5)}%")

print("\n" + "="*80)
print("Extraction complete!")
print("="*80)
