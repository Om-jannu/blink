import { createClient } from '@supabase/supabase-js';

// For MVP, we'll use a local setup or you can replace with your Supabase project URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Secret {
  id: string;
  type: 'text' | 'file';
  encrypted_content: string;
  file_name?: string;
  file_size?: number;
  expiry_time: string;
  view_count: number;
  password_hash?: string;
  encryption_salt: string;
  owner_id?: string;
  created_at: string;
}

export interface Subscription {
  user_id: string;
  plan: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_end?: string; // ISO timestamp
  updated_at: string;
}

export interface CreateSecretData {
  type: 'text' | 'file';
  encrypted_content: string;
  file_name?: string;
  file_size?: number;
  expiry_time: string;
  password_hash?: string;
  encryption_salt: string;
  owner_id?: string;
}

/**
 * Creates a new secret in the database
 */
export async function createSecret(data: CreateSecretData): Promise<{ id: string; error?: string }> {
  try {
    const { data: secret, error } = await supabase
      .from('blink_secrets')
      .insert([data])
      .select('id')
      .single();

    if (error) {
      return { id: '', error: error.message };
    }

    return { id: secret.id };
  } catch (error) {
    return { id: '', error: 'Failed to create secret' };
  }
}

/**
 * Retrieves a secret by ID
 */
export async function getSecret(id: string): Promise<{ secret: Secret | null; error?: string }> {
  try {
    const { data: secret, error } = await supabase
      .from('blink_secrets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { secret: null, error: error.message };
    }

    return { secret };
  } catch (error) {
    return { secret: null, error: 'Failed to retrieve secret' };
  }
}

/**
 * Marks a secret as viewed and increments view count
 */
export async function markSecretAsViewed(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First get the current view count
    const { data: secret, error: fetchError } = await supabase
      .from('blink_secrets')
      .select('view_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // Then update with incremented count
    const { error } = await supabase
      .from('blink_secrets')
      .update({ view_count: (secret.view_count || 0) + 1 })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to mark secret as viewed' };
  }
}

/**
 * Deletes a secret by ID
 */
export async function deleteSecret(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('blink_secrets')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete secret' };
  }
}

/**
 * Forces a secret to expire immediately by updating expiry_time to now
 */
export async function expireSecretNow(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('blink_secrets')
      .update({ expiry_time: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to expire secret' };
  }
}

/**
 * Checks if a secret has expired
 */
export function isSecretExpired(expiryTime: string): boolean {
  return new Date(expiryTime) < new Date();
}

/**
 * Gets all secrets for a specific user
 */
export async function getUserSecrets(userId: string): Promise<{ secrets: Secret[] | null; error?: string }> {
  try {
    const { data: secrets, error } = await supabase
      .from('blink_secrets')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { secrets: null, error: error.message };
    }

    return { secrets: secrets || [] };
  } catch (error) {
    return { secrets: null, error: 'Failed to retrieve user secrets' };
  }
}

/**
 * Subscription helpers
 */
export async function getUserSubscription(userId: string): Promise<{ subscription: Subscription | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('blink_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return { subscription: null, error: error.message };
    return { subscription: data as Subscription };
  } catch (e) {
    return { subscription: null, error: 'Failed to fetch subscription' };
  }
}

export async function upsertUserSubscription(sub: Omit<Subscription, 'updated_at'>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('blink_subscriptions')
      .upsert({ ...sub, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Failed to upsert subscription' };
  }
}

/**
 * Cleans up expired secrets from the database
 */
export async function cleanupExpiredSecrets(): Promise<{ deleted: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('blink_secrets')
      .delete()
      .lt('expiry_time', new Date().toISOString())
      .select('id');

    if (error) {
      return { deleted: 0, error: error.message };
    }

    return { deleted: data?.length || 0 };
  } catch (error) {
    return { deleted: 0, error: 'Failed to cleanup expired secrets' };
  }
}
