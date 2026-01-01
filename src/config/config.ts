import dotenv from 'dotenv';

dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '10000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  GHL_API_KEY: process.env.GHL_API_KEY || '',
  GHL_BASE_URL: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com/v1',
  GHL_LOCATION_ID: process.env.GHL_LOCATION_ID || '',
  GHL_INBOUND_WEBHOOK_URL: process.env.GHL_INBOUND_WEBHOOK_URL || '',
  GHL_WEBHOOK_SECRET: process.env.GHL_WEBHOOK_SECRET || '',

  VINAUDIT_API_KEY: process.env.VINAUDIT_API_KEY || '',

  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',

  RATE_LIMIT_WINDOW_MS: 60000,
  RATE_LIMIT_MAX_REQUESTS: 120,
} as const;

export type AppConfig = typeof config;
export default config;
