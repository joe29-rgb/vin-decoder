import pdfplumber
import os
import json

def extract_complete_lender_data(lender_name, pdf_files):
    """Extract ALL data from lender PDFs - rates, LTV, DSR, reserves, booking guides, fees"""
    print("\n" + "="*100)
    print(f"LENDER: {lender_name}")
    print("="*100)
    
    all_data = {
        'lender': lender_name,
        'files': [],
        'rate_tables': [],
        'booking_guides': [],
        'reserve_tables': [],
        'ltv_tables': [],
        'fee_tables': [],
        'all_text': []
    }
    
    for pdf_file in pdf_files:
        pdf_path = os.path.join('lender-pdfs', pdf_file)
        if not os.path.exists(pdf_path):
            print(f"  ⚠️  File not found: {pdf_file}")
            continue
            
        print(f"\n📄 Processing: {pdf_file}")
        print("-" * 100)
        
        file_data = {
            'filename': pdf_file,
            'pages': []
        }
        
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                print(f"\n  PAGE {page_num}:")
                
                page_data = {
                    'page_num': page_num,
                    'tables': [],
                    'text': ''
                }
                
                # Extract ALL tables
                tables = page.extract_tables()
                if tables:
                    print(f"    ✓ Found {len(tables)} table(s)")
                    for table_num, table in enumerate(tables, 1):
                        print(f"\n    TABLE {table_num}:")
                        
                        # Print entire table
                        for row_num, row in enumerate(table):
                            print(f"      Row {row_num}: {row}")
                        
                        page_data['tables'].append(table)
                        
                        # Categorize table type
                        table_str = str(table).lower()
                        if any(word in table_str for word in ['rate', 'tier', 'gear', 'star', 'key', 'ride']):
                            all_data['rate_tables'].append({
                                'file': pdf_file,
                                'page': page_num,
                                'table': table
                            })
                        if any(word in table_str for word in ['year', 'term', 'mileage', 'km', 'booking']):
                            all_data['booking_guides'].append({
                                'file': pdf_file,
                                'page': page_num,
                                'table': table
                            })
                        if any(word in table_str for word in ['reserve', 'dealer']):
                            all_data['reserve_tables'].append({
                                'file': pdf_file,
                                'page': page_num,
                                'table': table
                            })
                        if any(word in table_str for word in ['ltv', 'advance']):
                            all_data['ltv_tables'].append({
                                'file': pdf_file,
                                'page': page_num,
                                'table': table
                            })
                        if any(word in table_str for word in ['fee', 'admin']):
                            all_data['fee_tables'].append({
                                'file': pdf_file,
                                'page': page_num,
                                'table': table
                            })
                
                # Extract ALL text
                text = page.extract_text()
                if text:
                    page_data['text'] = text
                    all_data['all_text'].append({
                        'file': pdf_file,
                        'page': page_num,
                        'text': text
                    })
                    
                    # Print key lines
                    print(f"\n    KEY TEXT LINES:")
                    lines = text.split('\n')
                    for line in lines:
                        if any(word in line.lower() for word in ['rate', 'tier', 'ltv', 'advance', 'reserve', 'dsr', 'income', 'term', 'fee', 'year', 'km', 'mileage']):
                            print(f"      {line[:150]}")
                
                file_data['pages'].append(page_data)
        
        all_data['files'].append(file_data)
    
    return all_data

# Define all lenders and their PDF files
lenders = {
    'TD Auto Finance': [
        'td non prime.pdf',
        'td prime.pdf',
        'td eco.pdf',
        'td hol.pdf'
    ],
    'SDA (Scotia Dealer Advantage)': [
        'sda rate.pdf'
    ],
    'Santander': [
        'santander tier program.pdf',
        'santander prime.pdf'
    ],
    'RIFCO': [
        'rifco standard.pdf',
        'rifco prefered.pdf'
    ],
    'iA Auto Finance': [
        'ia gear program.pdf'
    ],
    'Northlake': [
        'northlake program.pdf',
        'north lake booking.pdf'
    ],
    'AutoCapital': [
        'auto capital tier.pdf'
    ],
    'Eden Park': [
        'eden park ride program.pdf'
    ],
    'Prefera': [
        'prefera.pdf'
    ],
    'LendCare': [
        'lendcare auto program.pdf'
    ]
}

# Extract data from ALL lenders
all_lender_data = {}

for lender_name, pdf_files in lenders.items():
    lender_data = extract_complete_lender_data(lender_name, pdf_files)
    all_lender_data[lender_name] = lender_data

# Save complete extraction to JSON
output_file = 'COMPLETE-LENDER-EXTRACTION.json'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(all_lender_data, f, indent=2, ensure_ascii=False)

print("\n" + "="*100)
print(f"✅ COMPLETE EXTRACTION SAVED TO: {output_file}")
print("="*100)

# Print summary
print("\n📊 EXTRACTION SUMMARY:")
print("-" * 100)
for lender_name, data in all_lender_data.items():
    print(f"\n{lender_name}:")
    print(f"  Files processed: {len(data['files'])}")
    print(f"  Rate tables found: {len(data['rate_tables'])}")
    print(f"  Booking guides found: {len(data['booking_guides'])}")
    print(f"  Reserve tables found: {len(data['reserve_tables'])}")
    print(f"  LTV tables found: {len(data['ltv_tables'])}")
    print(f"  Fee tables found: {len(data['fee_tables'])}")
