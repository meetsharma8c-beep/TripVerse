import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const STORAGE_KEY = 'tripverse_supabase_config_v1';

/**
 * Retrieve active Supabase credentials from environment or runtime configuration
 */
export function getStoredSupabaseConfig(): SupabaseConfig | null {
  // 1. Try Vite environment variables first
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (
    envUrl && 
    envKey && 
    envUrl.startsWith('https://') && 
    !envUrl.includes('your-project-id') && 
    !envKey.includes('your-anon') && 
    envKey.trim().length > 20
  ) {
    return {
      url: envUrl.trim(),
      anonKey: envKey.trim()
    };
  }

  // 2. Try localStorage for dynamic production credentials entered in client UI
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.url && parsed.anonKey && parsed.url.startsWith('https://')) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    supabaseClientInstance = null;
    window.dispatchEvent(new CustomEvent('tripverse_supabase_config_updated'));
  }
}

export function removeSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    supabaseClientInstance = null;
    window.dispatchEvent(new CustomEvent('tripverse_supabase_config_updated'));
  }
}

let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Initialize or retrieve the active Supabase client singleton
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClientInstance) return supabaseClientInstance;

  const config = getStoredSupabaseConfig();
  if (!config) return null;

  try {
    supabaseClientInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return supabaseClientInstance;
  } catch (err) {
    console.error('[Supabase] Failed to initialize client:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return getStoredSupabaseConfig() !== null;
}
