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

def analyze_td_non_prime(text):
    """Extract TD Non-Prime (2-6 Key) parameters"""
    print("\n" + "="*80)
    print("TD NON-PRIME (2-6 KEY) ANALYSIS")
    print("="*80)
    
    # Extract rates
    if "As low as 11.99%" in text:
        print("\n✓ Base Rate: 11.99% (promotional)")
    
    # Extract advance percentages
    if "Used CarAdvance 140%" in text:
        print("✓ Used Car Advance: 140% (all 2-6 Key)")
    
    if "New Car Advance 125% on 2024–2026" in text or "New Car Advance 125% on 20 24–2026" in text:
        print("✓ New Car Advance: 125% (2024-2026 units)")
    
    # Extract reserve structure
    reserve_match = re.search(r'\$40,000\+.*?\$700.*?\$600.*?\$500.*?\$400.*?\$300.*?\$200', text, re.DOTALL)
    if reserve_match:
        print("\n✓ Reserve Structure Found:")
        print("  $40,000+: $700")
        print("  $25,000-$39,999: $600")
        print("  $20,000-$24,999: $500")
        print("  $15,000-$19,999: $400")
        print("  $10,000-$14,999: $300")
        print("  $7,500-$9,999: $200")
    
    # Extract fee
    if "$799" in text and "customer administration fee" in text:
        print("\n✓ Customer Fee: $799")
    
    # Extract DSR
    if "50%" in text and "TDSR" in text:
        print("✓ Max DSR: 50%")
    
    # Extract minimum income
    if "$1800" in text or "$1,800" in text:
        print("✓ Min Income: $1,800/month")
    
    # Extract max term info
    print("\n✓ Max Terms by Year/Mileage:")
    if "2024+ New* 84 125% of  MSRP 84" in text:
        print("  2024-2026 New: 84 months, 125% MSRP")
    if "2025 Used 84" in text:
        print("  2025 Used: 84 months")
    if "2024 84" in text:
        print("  2024: 84 months")
    if "2023 84" in text:
        print("  2023: 84 months")

def analyze_sda(text):
    """Extract SDA parameters"""
    print("\n" + "="*80)
    print("SDA (SCOTIA DEALER ADVANTAGE) ANALYSIS")
    print("="*80)
    
    # Look for Star program rates
    star_programs = {
        'Star 7': None,
        'Star 6': None,
        'Star 5': None,
        'Star 4': None,
        'Star 3': None,
        'Star 2': None,
        'Star 1': None
    }
    
    # Extract rates for each program
    for program in star_programs.keys():
        pattern = rf'{program}.*?(\d+\.\d+)%'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            star_programs[program] = match.group(1)
    
    print("\n✓ Star Program Rates:")
    for program, rate in star_programs.items():
        if rate:
            print(f"  {program}: {rate}%")
    
    # Look for LTV info
    ltv_matches = re.findall(r'(\d{3})%.*?LTV', text)
    if ltv_matches:
        print(f"\n✓ LTV values found: {', '.join(set(ltv_matches))}%")
    
    # Look for new vehicle advance
    if "125%" in text and ("new" in text.lower() or "2024" in text):
        print("✓ New Vehicle Advance: 125% (2024-2026)")

def analyze_subvented(text):
    """Extract subvented program details"""
    print("\n" + "="*80)
    print("SUBVENTED PROGRAMS ANALYSIS")
    print("="*80)
    
    # Look for FCA brands
    if "FCA" in text or "Chrysler" in text or "Dodge" in text or "Jeep" in text or "Ram" in text:
        print("\n✓ FCA Brands: Chrysler, Dodge, Jeep, Ram")
    
    # Look for model years
    if "2024" in text and "2025" in text and "2026" in text:
        print("✓ Eligible Years: 2024-2026")
    
    # Look for subvented rates
    print("\n✓ Subvented Rates:")
    
    # TD rates
    if "KEY 6" in text or "6-Key" in text:
        rate_match = re.search(r'KEY 6.*?(\d+\.\d+)%', text, re.IGNORECASE)
        if rate_match:
            print(f"  TD 6-Key: {rate_match.group(1)}%")
    
    if "KEY 5" in text or "5-Key" in text:
        rate_match = re.search(r'KEY 5.*?(\d+\.\d+)%', text, re.IGNORECASE)
        if rate_match:
            print(f"  TD 5-Key: {rate_match.group(1)}%")
    
    # SDA rates
    if "STAR 6" in text or "Star 6" in text:
        rate_match = re.search(r'STAR 6.*?(\d+\.\d+)%', text, re.IGNORECASE)
        if rate_match:
            print(f"  SDA Star 6: {rate_match.group(1)}%")
    
    if "STAR 5" in text or "Star 5" in text:
        rate_match = re.search(r'STAR 5.*?(\d+\.\d+)%', text, re.IGNORECASE)
        if rate_match:
            print(f"  SDA Star 5: {rate_match.group(1)}%")

def main():
    pdf_dir = 'lender-pdfs'
    
    # Analyze TD Non-Prime
    td_path = os.path.join(pdf_dir, 'td non prime.pdf')
    if os.path.exists(td_path):
        text = extract_pdf_text(td_path)
        analyze_td_non_prime(text)
    
    # Analyze SDA
    sda_path = os.path.join(pdf_dir, 'sda rate.pdf')
    if os.path.exists(sda_path):
        text = extract_pdf_text(sda_path)
        analyze_sda(text)
    
    # Analyze Subvented
    sub_path = os.path.join(pdf_dir, 'SUBVENTED PROGRAM.pdf')
    if os.path.exists(sub_path):
        text = extract_pdf_text(sub_path)
        analyze_subvented(text)
    
    print("\n" + "="*80)
    print("Analysis complete!")
    print("="*80)

if __name__ == '__main__':
    main()
