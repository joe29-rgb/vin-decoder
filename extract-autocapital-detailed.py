import pdfplumber
import os

def extract_autocapital_parameters():
    """Extract detailed AutoCapital parameters from PDF"""
    print("="*80)
    print("AUTOCAPITAL - DETAILED EXTRACTION")
    print("="*80)
    
    pdf_path = os.path.join('lender-pdfs', 'auto capital tier.pdf')
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"\n{'='*80}")
            print(f"PAGE {page_num}")
            print("="*80)
            
            tables = page.extract_tables()
            if tables:
                for table_num, table in enumerate(tables, 1):
                    print(f"\nTable {table_num}:")
                    for row in table:
                        print(f"  {row}")
            
            # Extract text
            text = page.extract_text()
            if text:
                print("\n--- KEY TEXT SNIPPETS ---")
                lines = text.split('\n')
                for line in lines:
                    if any(word in line.lower() for word in ['tier', 'rate', 'ltv', 'advance', 'reserve', 'dsr', 'income', 'term', 'fee']):
                        print(f"  {line[:120]}")

extract_autocapital_parameters()

print("\n" + "="*80)
print("EXTRACTION COMPLETE")
print("="*80)
