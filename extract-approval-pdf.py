import pdfplumber
import os
import json

def extract_approval_pdf(pdf_path):
    """Extract approval PDF using pdfplumber"""
    print(f"\nExtracting approval PDF: {pdf_path}")
    print("="*80)
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}")
        
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"\n{'='*80}")
            print(f"PAGE {page_num}")
            print("="*80)
            
            # Extract text
            text = page.extract_text()
            print("\n--- TEXT CONTENT ---")
            print(text[:1000] if text else "No text found")
            if text and len(text) > 1000:
                print(f"\n... ({len(text) - 1000} more characters)")
            
            # Extract tables
            tables = page.extract_tables()
            if tables:
                print(f"\n--- TABLES ({len(tables)} found) ---")
                for table_num, table in enumerate(tables, 1):
                    print(f"\nTable {table_num}:")
                    for row_num, row in enumerate(table[:10]):
                        print(f"  Row {row_num}: {row}")
                    if len(table) > 10:
                        print(f"  ... ({len(table) - 10} more rows)")
            else:
                print("\n--- NO TABLES FOUND ---")

# Extract SDA example approval
approval_path = os.path.join('lender-pdfs', 'sda example.pdf')
if os.path.exists(approval_path):
    extract_approval_pdf(approval_path)
else:
    print(f"File not found: {approval_path}")

print("\n" + "="*80)
print("Approval PDF extraction complete!")
print("="*80)
