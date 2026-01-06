/**
 * LENDER PROGRAMS DATABASE
 * Complete list of all lender programs with tiers for manual approval builder
 */

export const LENDER_PROGRAMS_MAP: Record<string, string[]> = {
  'TD': [
    '2-Key',
    '3-Key',
    '4-Key',
    '5-Key'
  ],
  'Santander': [
    'Tier 1',
    'Tier 2',
    'Tier 3',
    'Tier 4',
    'Tier 5',
    'Tier 6',
    'Tier 7',
    'Tier 8'
  ],
  'SDA': [
    'Star 1',
    'Star 2',
    'Star 3',
    'Star 4',
    'Star 5',
    'Star 6',
    'Star 7',
    'StartRight'
  ],
  'RIFCO': [
    'Prime',
    'Near Prime',
    'Subprime',
    'Deep Subprime'
  ],
  'IAAutoFinance': [
    'Tier A',
    'Tier B',
    'Tier C',
    'Tier D'
  ],
  'EdenPark': [
    'Prime',
    'Standard',
    'Value'
  ],
  'AutoCapital': [
    'Tier 1',
    'Tier 2',
    'Tier 3'
  ],
  'LendCare': [
    'Prime',
    'Standard'
  ],
  'Northlake': [
    'Tier A',
    'Tier B',
    'Tier C'
  ]
};

export function getLenderPrograms(lender: string): string[] {
  return LENDER_PROGRAMS_MAP[lender] || [];
}
