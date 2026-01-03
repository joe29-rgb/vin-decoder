import { LenderContact } from '../types/types';

export function getContactsForBank(bank: string): { contacts: LenderContact[]; address?: string } | null {
  const b = (bank || '').toLowerCase().trim();
  switch (true) {
    case /autocapital|acc\b/.test(b):
      return {
        contacts: [
          { role: 'Credit & Funding', phone: '1-855-646-0534', fax: '1-877-776-6213', email: 'accdocuments@autocapitalcanada.ca' },
        ],
        address: 'PO Box 980, Station A, Toronto, ON M5W 1G5',
      };
    case /national\s*bank|nbc/.test(b):
      return {
        contacts: [
          { role: 'General', phone: '514-871-7412' },
          { role: 'Toll-Free', phone: '1-877-290-1280' },
          { role: 'Fax', fax: '1-888-663-6114' },
        ],
        address: '800 St-Jacques, Suite 09881, Montreal, QC H3C 1A3',
      };
    case /cibc/.test(b):
      return {
        contacts: [
          { role: 'Dealer Credit Centre', phone: '1-855-598-1856' },
          { role: 'Customer Care', phone: '1-800-465-2422' },
          { role: 'Funding Fax', fax: '1-877-776-6197' },
          { role: 'Funding Email', email: 'cibcemailfunding@autocapital.ca' },
        ],
        address: 'CIBC Auto Finance, 305 Milner Ave, 5th Floor, Scarborough, ON M1B 3V4',
      };
    case /eden\s*park/.test(b):
      return {
        contacts: [
          { role: 'Credit', phone: '1-855-366-8667 ext. 761' },
          { role: 'Income', phone: '1-855-366-8667 ext. 763' },
          { role: 'Inside Sales', phone: '1-855-366-8667 ext. 767' },
          { role: 'Funding', phone: '1-855-366-8667 ext. 762' },
          { role: 'Customer Service', phone: '1-855-366-8667 ext. 765' },
          { role: 'Faxes', email: 'faxes@edenparkcanada.com' },
        ],
        address: '52 Titan Rd, Etobicoke, ON M8Z 2J8',
      };
    case /general\s*bank/.test(b):
      return {
        contacts: [
          { role: 'Credit Department', phone: '1-844-733-0434', email: 'GBCCreditTeam@generalbank.ca' },
          { role: 'Dealer Support', phone: '1-877-443-5620', email: 'GBCDealerSupport@generalbank.ca' },
        ],
        address: 'Suite 100, 11523 – 100 Avenue NW, Edmonton, AB T5K 0J8',
      };
    case /^ia\b|\bia\s*auto/.test(b):
      return {
        contacts: [
          { role: 'Income/Credit/Funding', phone: '1-855-378-5626', fax: '1-855-379-5626', email: 'docs.auto@ia.ca' },
          { role: 'Customer Service', phone: '1-855-378-5626', email: 'customerservice.auto@ia.ca' },
        ],
        address: '1415 Joshuas Creek Drive, Suite 104, Oakville, ON L6H 7G4',
      };
    case /lendcare/.test(b):
      return {
        contacts: [
          { role: 'Partner Support', phone: '1-833-291-4045', email: 'partnersupport@lendcare.ca' },
          { role: 'GPS', email: 'gps@lendcare.ca' },
          { role: 'Customer Service', email: 'customerservice@lendcare.ca' },
        ],
        address: '1315 Pickering Parkway, 4th Floor, Pickering, ON L1V 7G5',
      };
    case /northlake/.test(b):
      return {
        contacts: [
          { role: 'General', phone: '1-888-652-5320', fax: '1-888-652-0030', email: 'info@northlakefinancial.ca' },
        ],
        address: '201 Minets Point Road, Barrie, ON L4N 4C2',
      };
    case /rbc/.test(b):
      return {
        contacts: [
          { role: 'Credit Center', phone: '1-888-529-6999', fax: '1-866-213-7965' },
        ],
        address: 'RBC Automotive Finance',
      };
    case /rifco/.test(b):
      return {
        contacts: [
          { role: 'Dealer Services', phone: '1-855-478-2439', email: 'dealerservices@rifco.net' },
          { role: 'Income', email: 'poi@rifco.net' },
          { role: 'Funding', email: 'funding@rifco.net' },
        ],
        address: 'Rifco National Auto Finance',
      };
    case /santander/.test(b):
      return {
        contacts: [
          { role: 'Credit Center', phone: '1-888-486-4356 ext. 5024', email: 'credit@santanderconsumer.ca' },
          { role: 'Income', phone: '1-855-227-3655', email: 'poi@santanderconsumer.ca' },
          { role: 'Funding', phone: '1-888-486-4356 ext. 5023', email: 'funding@santanderconsumer.ca' },
          { role: 'Dealer Support', phone: '1-888-486-4356 ext. 3514', email: 'ds@santanderconsumer.ca' },
        ],
        address: 'Santander Consumer Bank',
      };
    case /sda|scotia\s*dealer\s*advantage|scotiabank/.test(b):
      return {
        contacts: [
          { role: 'Dealer Support', phone: '1-877-298-3113', email: 'dealerservices@SDAAuto.com' },
          { role: 'Income (Employer Only)', phone: '1-855-275-8844' },
          { role: 'CBCC', phone: '1-877-375-2771' },
        ],
        address: 'Scotia Dealer Advantage',
      };
    case /servus|connectfirst/.test(b):
      return {
        contacts: [
          { role: 'Credit', phone: '1-877-473-7887', email: 'DealerServices@Servus.ca' },
          { role: 'Funding', phone: '1-888-736-4260 ext. 2', email: 'AutomotiveFinanceDocuments@connectfirstcu.com' },
        ],
        address: '151 Karl Clark Road NW, Edmonton, AB T6N 1H5',
      };
    case /td\b|td\s*auto/.test(b):
      return {
        contacts: [
          { role: 'General', phone: '1-855-TD-AUTO1' },
        ],
        address: 'TD Auto Finance',
      };
    case /ws\s*leasing|prospera/.test(b):
      return {
        contacts: [
          { role: 'General', phone: '1-844-528-3802', url: 'https://prospera.ca' },
        ],
        address: 'WS Leasing Ltd.',
      };
    default:
      return null;
  }
}
