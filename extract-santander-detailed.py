import pdfplumber
import os

def extract_santander_parameters():
    """Extract detailed Santander parameters from PDF"""
    print("="*80)
    print("SANTANDER TIER PROGRAM - DETAILED EXTRACTION")
    print("="*80)
    
    pdf_path = os.path.join('lender-pdfs', 'santander tier program.pdf')
    
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[0]
        tables = page.extract_tables()
        
        print("\n### TIER PROGRAM PARAMETERS")
        print("-" * 80)
        
        # Find the main tier table
        for table in tables:
            if table and len(table) > 0:
                # Check if this is the tier parameters table
                if any('Tier' in str(row) for row in table):
                    print("\n✓ Tier Parameters Table:")
                    for row in table:
                        print(f"  {row}")
        
        print("\n### QUALITY BONUS TABLE")
        print("-" * 80)
        
        # Find quality bonus table
        for table in tables:
            if table and len(table) > 0:
                if any('LTV' in str(row) and '$7,500' in str(row) for row in table):
                    print("\n✓ Quality Bonus (LTV-based):")
                    for row in table:
                        print(f"  {row}")
        
        print("\n### VEHICLE BOOKING GUIDE")
        print("-" * 80)
        
        # Find booking guide table
        for table in tables:
            if table and len(table) > 0:
                if any('Year' in str(row) and 'Term' in str(row) for row in table):
                    print("\n✓ Booking Guide:")
                    for row in table[:12]:  # First 12 rows
                        print(f"  {row}")

extract_santander_parameters()

print("\n" + "="*80)
print("EXTRACTION COMPLETE")
print("="*80)
