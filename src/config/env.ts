import dotenv from 'dotenv';
dotenv.config();

const provider = (process.env.AI_PROVIDER || 'groq').toLowerCase();
const rawKey = (process.env.AI_API_KEY || '').replace(/^["']|["']$/g, '').trim();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rewire_db?schema=public',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'rewire_jwt_access_secret_development_fallback_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'rewire_jwt_refresh_secret_development_fallback_2026',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // AI Coach Config
  AI_PROVIDER: provider, // 'groq' | 'gemini' | 'openai'
  AI_API_KEY: rawKey,
  AI_MODEL: process.env.AI_MODEL || (provider === 'gemini' ? 'gemini-1.5-flash' : 'openai/gpt-oss-120b'),
  AI_BASE_URL: process.env.AI_BASE_URL || (provider === 'groq' ? 'https://api.groq.com/openai/v1' : '')
};
