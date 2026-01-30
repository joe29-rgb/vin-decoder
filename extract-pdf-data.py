import PyPDF2
import os
import json

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
        return f"Error reading {pdf_path}: {str(e)}"

def main():
    pdf_dir = 'lender-pdfs'
    output_file = 'lender-pdfs/extracted-data.txt'
    
    pdf_files = [
        'td non prime.pdf',
        'td prime.pdf',
        'td eco.pdf',
        'td hol.pdf',
        'sda rate.pdf',
        'santander tier program.pdf',
        'santander prime.pdf',
        'rifco standard.pdf',
        'rifco prefered.pdf',
        'ia gear program.pdf',
        'northlake program.pdf',
        'north lake booking.pdf',
        'auto capital tier.pdf',
        'eden park ride program.pdf',
        'prefera.pdf',
        'lendcare auto program.pdf',
        'SUBVENTED PROGRAM.pdf'
    ]
    
    with open(output_file, 'w', encoding='utf-8') as out:
        for pdf_file in pdf_files:
            pdf_path = os.path.join(pdf_dir, pdf_file)
            if os.path.exists(pdf_path):
                print(f"Extracting: {pdf_file}")
                out.write(f"\n{'='*80}\n")
                out.write(f"FILE: {pdf_file}\n")
                out.write(f"{'='*80}\n\n")
                
                text = extract_pdf_text(pdf_path)
                out.write(text)
                out.write('\n\n')
            else:
                print(f"File not found: {pdf_file}")
    
    print(f"\nExtraction complete! Output saved to: {output_file}")

if __name__ == '__main__':
    main()
