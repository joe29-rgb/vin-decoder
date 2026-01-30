import pdfplumber
import os

def extract_rifco_parameters():
    """Extract detailed RIFCO parameters from both PDFs"""
    print("="*80)
    print("RIFCO - DETAILED EXTRACTION")
    print("="*80)
    
    # RIFCO Standard
    print("\n### RIFCO STANDARD")
    print("-" * 80)
    std_path = os.path.join('lender-pdfs', 'rifco standard.pdf')
    
    with pdfplumber.open(std_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"\nPage {page_num}:")
            tables = page.extract_tables()
            if tables:
                for table_num, table in enumerate(tables, 1):
                    print(f"\n  Table {table_num}:")
                    for row in table[:15]:
                        print(f"    {row}")
            
            # Also extract text for rates/terms
            text = page.extract_text()
            if 'rate' in text.lower() or 'term' in text.lower():
                print(f"\n  Key text snippets:")
                lines = text.split('\n')
                for line in lines:
                    if any(word in line.lower() for word in ['rate', 'term', 'ltv', 'advance', 'reserve', 'dsr']):
                        print(f"    {line[:100]}")
    
    # RIFCO Preferred
    print("\n\n### RIFCO PREFERRED")
    print("-" * 80)
    pref_path = os.path.join('lender-pdfs', 'rifco prefered.pdf')
    
    with pdfplumber.open(pref_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"\nPage {page_num}:")
            tables = page.extract_tables()
            if tables:
                for table_num, table in enumerate(tables, 1):
                    print(f"\n  Table {table_num}:")
                    for row in table[:15]:
                        print(f"    {row}")
            
            # Also extract text
            text = page.extract_text()
            if 'rate' in text.lower() or 'term' in text.lower():
                print(f"\n  Key text snippets:")
                lines = text.split('\n')
                for line in lines:
                    if any(word in line.lower() for word in ['rate', 'term', 'ltv', 'advance', 'reserve', 'dsr', 'tier']):
                        print(f"    {line[:100]}")

extract_rifco_parameters()

print("\n" + "="*80)
print("EXTRACTION COMPLETE")
print("="*80)
