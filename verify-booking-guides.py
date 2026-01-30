import json

# Load the complete extraction
with open('COMPLETE-LENDER-EXTRACTION.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("="*100)
print("BOOKING GUIDE VERIFICATION - EXACT YEAR/MILEAGE/TERM MATCHING")
print("="*100)

# Extract booking guides for each lender
for lender_name, lender_data in data.items():
    if not lender_data['booking_guides']:
        continue
    
    print(f"\n{'='*100}")
    print(f"LENDER: {lender_name}")
    print("="*100)
    
    for guide_num, guide in enumerate(lender_data['booking_guides'], 1):
        print(f"\n📋 Booking Guide {guide_num} (File: {guide['file']}, Page: {guide['page']})")
        print("-" * 100)
        
        table = guide['table']
        
        # Print header
        if table and len(table) > 0:
            print(f"\nHEADER: {table[0]}")
            print("\nDATA ROWS:")
            
            for row_num, row in enumerate(table[1:], 1):
                print(f"  Row {row_num}: {row}")
        
        print("\n" + "-" * 100)
        print("EXTRACTED RULES:")
        print("-" * 100)
        
        # Parse the table to extract year/mileage/term rules
        if table and len(table) > 1:
            header = table[0]
            
            # Try to identify year column and term columns
            for row in table[1:]:
                if row and len(row) > 0:
                    # First column is usually year
                    year_info = str(row[0]).strip() if row[0] else ""
                    
                    if year_info and year_info != 'None':
                        print(f"\n  Year: {year_info}")
                        
                        # Extract terms from remaining columns
                        for col_idx in range(1, len(row)):
                            if row[col_idx] and str(row[col_idx]).strip() and str(row[col_idx]).strip() != 'None':
                                col_header = header[col_idx] if col_idx < len(header) else f"Column {col_idx}"
                                print(f"    {col_header}: {row[col_idx]}")

print("\n" + "="*100)
print("RATE TABLE VERIFICATION - EXACT TIER/RATE/LTV/DSR MATCHING")
print("="*100)

for lender_name, lender_data in data.items():
    if not lender_data['rate_tables']:
        continue
    
    print(f"\n{'='*100}")
    print(f"LENDER: {lender_name}")
    print("="*100)
    
    for rate_num, rate_table in enumerate(lender_data['rate_tables'], 1):
        print(f"\n📊 Rate Table {rate_num} (File: {rate_table['file']}, Page: {rate_table['page']})")
        print("-" * 100)
        
        table = rate_table['table']
        
        if table and len(table) > 0:
            print("\nCOMPLETE TABLE:")
            for row_num, row in enumerate(table):
                print(f"  Row {row_num}: {row}")

print("\n" + "="*100)
print("RESERVE TABLE VERIFICATION")
print("="*100)

for lender_name, lender_data in data.items():
    if not lender_data['reserve_tables']:
        continue
    
    print(f"\n{'='*100}")
    print(f"LENDER: {lender_name}")
    print("="*100)
    
    for reserve_num, reserve_table in enumerate(lender_data['reserve_tables'], 1):
        print(f"\n💰 Reserve Table {reserve_num} (File: {reserve_table['file']}, Page: {reserve_table['page']})")
        print("-" * 100)
        
        table = reserve_table['table']
        
        if table and len(table) > 0:
            for row_num, row in enumerate(table):
                print(f"  Row {row_num}: {row}")

print("\n" + "="*100)
print("✅ VERIFICATION COMPLETE - Review all tables above for EXACT matching")
print("="*100)
