import pdfplumber
import os
import json

def extract_tables_from_pdf(pdf_path, output_file):
    """Extract tables from PDF using pdfplumber"""
    print(f"\nExtracting tables from: {pdf_path}")
    print("="*80)
    
    with pdfplumber.open(pdf_path) as pdf:
        all_tables = []
        
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"\nPage {page_num}:")
            tables = page.extract_tables()
            
            if tables:
                print(f"  Found {len(tables)} table(s)")
                for table_num, table in enumerate(tables, 1):
                    print(f"\n  Table {table_num}:")
                    all_tables.append({
                        'page': page_num,
                        'table_num': table_num,
                        'data': table
                    })
                    
                    # Print first few rows
                    for row_num, row in enumerate(table[:5]):
                        print(f"    Row {row_num}: {row}")
                    
                    if len(table) > 5:
                        print(f"    ... ({len(table) - 5} more rows)")
            else:
                print("  No tables found")
    
    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_tables, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*80}")
    print(f"Saved to: {output_file}")
    return all_tables

# Extract from key PDFs
pdf_files = [
    ('SUBVENTED PROGRAM.pdf', 'subvented-tables.json'),
    ('td non prime.pdf', 'td-nonprime-tables.json'),
    ('sda rate.pdf', 'sda-tables.json'),
]

for pdf_file, output_file in pdf_files:
    pdf_path = os.path.join('lender-pdfs', pdf_file)
    output_path = os.path.join('lender-pdfs', output_file)
    
    if os.path.exists(pdf_path):
        try:
            extract_tables_from_pdf(pdf_path, output_path)
        except Exception as e:
            print(f"Error processing {pdf_file}: {e}")
    else:
        print(f"File not found: {pdf_path}")

print("\n" + "="*80)
print("Table extraction complete!")
print("="*80)
