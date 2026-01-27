import re

# Read the file
with open('src/modules/lender-programs.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all termByModelYear properties with their arrays
# This regex matches the entire termByModelYear property including the array
pattern = r',?\s*termByModelYear:\s*\[\s*(?:\{[^}]+\},?\s*)+\]'
content = re.sub(pattern, '', content)

# Clean up any double commas that might result
content = re.sub(r',\s*,', ',', content)

# Write back
with open('src/modules/lender-programs.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Removed all termByModelYear properties")
