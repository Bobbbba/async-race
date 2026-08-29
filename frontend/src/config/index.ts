import type { ImportMetaEnv } from '../types/env';

export interface AppConfig {
  apiUrl: string;
  appTitle: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

function getEnvVariable<T extends keyof ImportMetaEnv>(
  key: T,
  fallback: string = ''
): string {
  try {
    const value = import.meta.env[key];
    return typeof value === 'string' ? value : fallback;
  } catch {
    return fallback;
  }
}

export const config: AppConfig = {
  apiUrl: getEnvVariable('VITE_API_URL', 'http://localhost:3000'),
  appTitle: getEnvVariable('VITE_APP_TITLE', 'Async Race'),
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
};

export default config;