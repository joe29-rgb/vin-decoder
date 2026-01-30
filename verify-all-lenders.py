import pdfplumber
import os
import json
import re

def extract_tables_from_pdf(pdf_path):
    """Extract all tables from a PDF"""
    tables = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            page_tables = page.extract_tables()
            if page_tables:
                for table in page_tables:
                    tables.append({
                        'page': page_num,
                        'data': table
                    })
    return tables

def verify_td_parameters():
    """Verify TD Auto Finance parameters"""
    print("\n" + "="*80)
    print("TD AUTO FINANCE - PARAMETER VERIFICATION")
    print("="*80)
    
    # TD Non-Prime
    td_nonprime = extract_tables_from_pdf('lender-pdfs/td non prime.pdf')
    
    print("\n### TD NON-PRIME (2-6 KEY)")
    print("-" * 80)
    
    # Find LTV table
    for table_info in td_nonprime:
        table = table_info['data']
        for row in table:
            if row and 'Used CarAdvance' in str(row):
                print("\n✓ LTV Table Found:")
                print(f"  Used: {row}")
                # Get next row for new
                idx = table.index(row)
                if idx + 1 < len(table):
                    print(f"  New: {table[idx + 1]}")
                break
    
    # Find reserve table
    for table_info in td_nonprime:
        table = table_info['data']
        if table and table[0] and '$40,000+' in str(table[0]):
            print("\n✓ Reserve Structure:")
            for row in table[:3]:
                print(f"  {row}")
            break
    
    # TD Prime
    print("\n### TD PRIME")
    print("-" * 80)
    td_prime = extract_tables_from_pdf('lender-pdfs/td prime.pdf')
    print(f"  Tables found: {len(td_prime)}")
    
    # TD Eco
    print("\n### TD ECO")
    print("-" * 80)
    td_eco = extract_tables_from_pdf('lender-pdfs/td eco.pdf')
    print(f"  Tables found: {len(td_eco)}")
    
    # TD HOL
    print("\n### TD HOL (Holiday)")
    print("-" * 80)
    td_hol = extract_tables_from_pdf('lender-pdfs/td hol.pdf')
    print(f"  Tables found: {len(td_hol)}")

def verify_sda_parameters():
    """Verify SDA parameters"""
    print("\n" + "="*80)
    print("SDA (SCOTIA DEALER ADVANTAGE) - PARAMETER VERIFICATION")
    print("="*80)
    
    sda_tables = extract_tables_from_pdf('lender-pdfs/sda rate.pdf')
    
    print("\n### SDA RATES & LTV")
    print("-" * 80)
    
    # Find rate/LTV table
    for table_info in sda_tables:
        table = table_info['data']
        for row in table:
            if row and 'Star 7' in str(row):
                print("\n✓ Star Programs Table:")
                idx = table.index(row)
                for i in range(idx, min(idx + 5, len(table))):
                    print(f"  {table[i]}")
                break
    
    # Find max term table
    for table_info in sda_tables:
        table = table_info['data']
        for row in table:
            if row and 'Model Year' in str(row) and 'Max' in str(row):
                print("\n✓ Max Term Table:")
                idx = table.index(row)
                for i in range(idx, min(idx + 8, len(table))):
                    print(f"  {table[i]}")
                break

def verify_santander_parameters():
    """Verify Santander parameters"""
    print("\n" + "="*80)
    print("SANTANDER - PARAMETER VERIFICATION")
    print("="*80)
    
    # Tier program
    sant_tier = extract_tables_from_pdf('lender-pdfs/santander tier program.pdf')
    print(f"\n### SANTANDER TIER PROGRAM")
    print(f"  Tables found: {len(sant_tier)}")
    
    # Show first few tables
    for i, table_info in enumerate(sant_tier[:3]):
        print(f"\n  Table {i+1} (Page {table_info['page']}):")
        table = table_info['data']
        for row in table[:5]:
            print(f"    {row}")
    
    # Prime program
    sant_prime = extract_tables_from_pdf('lender-pdfs/santander prime.pdf')
    print(f"\n### SANTANDER PRIME")
    print(f"  Tables found: {len(sant_prime)}")

def verify_rifco_parameters():
    """Verify RIFCO parameters"""
    print("\n" + "="*80)
    print("RIFCO - PARAMETER VERIFICATION")
    print("="*80)
    
    # Standard
    rifco_std = extract_tables_from_pdf('lender-pdfs/rifco standard.pdf')
    print(f"\n### RIFCO STANDARD")
    print(f"  Tables found: {len(rifco_std)}")
    
    # Show first table
    if rifco_std:
        print(f"\n  First table (Page {rifco_std[0]['page']}):")
        for row in rifco_std[0]['data'][:5]:
            print(f"    {row}")
    
    # Preferred
    rifco_pref = extract_tables_from_pdf('lender-pdfs/rifco prefered.pdf')
    print(f"\n### RIFCO PREFERRED")
    print(f"  Tables found: {len(rifco_pref)}")

def verify_ia_auto_parameters():
    """Verify iA Auto Finance parameters"""
    print("\n" + "="*80)
    print("iA AUTO FINANCE - PARAMETER VERIFICATION")
    print("="*80)
    
    ia_tables = extract_tables_from_pdf('lender-pdfs/ia gear program.pdf')
    print(f"  Tables found: {len(ia_tables)}")
    
    # Show first few tables
    for i, table_info in enumerate(ia_tables[:3]):
        print(f"\n  Table {i+1} (Page {table_info['page']}):")
        table = table_info['data']
        for row in table[:5]:
            print(f"    {row}")

def verify_northlake_parameters():
    """Verify Northlake parameters"""
    print("\n" + "="*80)
    print("NORTHLAKE - PARAMETER VERIFICATION")
    print("="*80)
    
    # Program
    north_prog = extract_tables_from_pdf('lender-pdfs/northlake program.pdf')
    print(f"\n### NORTHLAKE PROGRAM")
    print(f"  Tables found: {len(north_prog)}")
    
    # Booking
    north_book = extract_tables_from_pdf('lender-pdfs/north lake booking.pdf')
    print(f"\n### NORTHLAKE BOOKING")
    print(f"  Tables found: {len(north_book)}")

def verify_autocapital_parameters():
    """Verify AutoCapital parameters"""
    print("\n" + "="*80)
    print("AUTOCAPITAL - PARAMETER VERIFICATION")
    print("="*80)
    
    auto_tables = extract_tables_from_pdf('lender-pdfs/auto capital tier.pdf')
    print(f"  Tables found: {len(auto_tables)}")
    
    # Show first table
    if auto_tables:
        print(f"\n  First table (Page {auto_tables[0]['page']}):")
        for row in auto_tables[0]['data'][:8]:
            print(f"    {row}")

def verify_eden_park_parameters():
    """Verify Eden Park parameters"""
    print("\n" + "="*80)
    print("EDEN PARK - PARAMETER VERIFICATION")
    print("="*80)
    
    eden_tables = extract_tables_from_pdf('lender-pdfs/eden park ride program.pdf')
    print(f"  Tables found: {len(eden_tables)}")
    
    # Show first table
    if eden_tables:
        print(f"\n  First table (Page {eden_tables[0]['page']}):")
        for row in eden_tables[0]['data'][:8]:
            print(f"    {row}")

def verify_prefera_parameters():
    """Verify Prefera parameters"""
    print("\n" + "="*80)
    print("PREFERA - PARAMETER VERIFICATION")
    print("="*80)
    
    pref_tables = extract_tables_from_pdf('lender-pdfs/prefera.pdf')
    print(f"  Tables found: {len(pref_tables)}")
    
    # Show first table
    if pref_tables:
        print(f"\n  First table (Page {pref_tables[0]['page']}):")
        for row in pref_tables[0]['data'][:8]:
            print(f"    {row}")

def verify_lendcare_parameters():
    """Verify LendCare parameters"""
    print("\n" + "="*80)
    print("LENDCARE - PARAMETER VERIFICATION")
    print("="*80)
    
    lend_tables = extract_tables_from_pdf('lender-pdfs/lendcare auto program.pdf')
    print(f"  Tables found: {len(lend_tables)}")
    
    # Show first table
    if lend_tables:
        print(f"\n  First table (Page {lend_tables[0]['page']}):")
        for row in lend_tables[0]['data'][:8]:
            print(f"    {row}")

# Run all verifications
print("="*80)
print("COMPREHENSIVE LENDER VERIFICATION")
print("="*80)

verify_td_parameters()
verify_sda_parameters()
verify_santander_parameters()
verify_rifco_parameters()
verify_ia_auto_parameters()
verify_northlake_parameters()
verify_autocapital_parameters()
verify_eden_park_parameters()
verify_prefera_parameters()
verify_lendcare_parameters()

print("\n" + "="*80)
print("VERIFICATION COMPLETE")
print("="*80)
