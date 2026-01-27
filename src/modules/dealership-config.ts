import fs from 'fs';
import path from 'path';

export interface DealershipConfig {
  dealershipName: string;
  websiteUrl: string;
  usedInventoryPath: string;
  newInventoryPath: string;
  location: string;
  postalCode: string;
  province: string;
  competitorRadiusKm: number;
  docFee: number;
  cbbApiKey?: string;
  cbbApiUrl?: string;
  logoUrl?: string;
}

const CONFIG_FILE = path.join(process.cwd(), 'dealership-config.json');

const DEFAULT_CONFIG: DealershipConfig = {
  dealershipName: 'My Dealership',
  websiteUrl: '',
  usedInventoryPath: '/search/used/',
  newInventoryPath: '/search/new/',
  location: 'Alberta',
  postalCode: 'T5J',
  province: 'AB',
  competitorRadiusKm: 100,
  docFee: 799,
  cbbApiKey: '',
  cbbApiUrl: 'https://api.canadianblackbook.com/v1',
};

let cachedConfig: DealershipConfig | null = null;

export function loadConfig(): DealershipConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      cachedConfig = JSON.parse(data);
      console.log('Loaded dealership config from file');
      return cachedConfig!;
    }
  } catch (error) {
    console.error('Failed to load config file:', error);
  }

  cachedConfig = { ...DEFAULT_CONFIG };
  return cachedConfig;
}

export function saveConfig(config: DealershipConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    cachedConfig = config;
    console.log('Saved dealership config to file');
  } catch (error) {
    console.error('Failed to save config file:', error);
    throw new Error('Failed to save configuration');
  }
}

export function updateConfig(updates: Partial<DealershipConfig>): DealershipConfig {
  const current = loadConfig();
  const updated = { ...current, ...updates };
  saveConfig(updated);
  return updated;
}
