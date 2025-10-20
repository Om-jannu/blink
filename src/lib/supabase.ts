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
  encryption_key_or_salt: string; // Salt for password-protected, encryption key for non-password
  owner_user_id?: string;
  created_at: string;
}

export interface BlinkUser {
  id: string;                // UUID
  clerk_user_id: string;     // Clerk user id
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
  encryption_key_or_salt: string; // Salt for password-protected, encryption key for non-password
  owner_user_id?: string;      // UUID FK to blink_users.id
}

/**
 * Creates a new secret in the database
 */
export async function createSecret(data: CreateSecretData): Promise<{ id: string; error?: string }> {
  try {
    // Server-side (client-lib) validation of plan limits
    if (data.owner_user_id) {
      // Fetch plan for this user
      const subRes = await supabase
        .from('blink_subscriptions')
        .select('plan')
        .eq('user_id', data.owner_user_id)
        .single();
      const plan = (subRes.data?.plan as 'free' | 'pro') || 'free';

      // Server-side validation: Free users cannot use passwords
      if (plan === 'free' && data.password_hash) {
        return { id: '', error: 'Password protection is only available for Pro users. Please upgrade to use this feature.' };
      }

      // Enforce size limits based on plan for file secrets
      if (data.type === 'file' && typeof data.file_size === 'number') {
        const maxBytes = plan === 'pro' ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB vs 5MB
        if (data.file_size > maxBytes) {
          return { id: '', error: plan === 'pro' ? 'File size exceeds 50MB limit for Pro.' : 'File size exceeds 5MB limit for Free users.' };
        }
      }

      // Enforce count limits for Free plan
      if (plan === 'free') {
        const FREE_TEXT_LIMIT = 10;
        const FREE_FILE_LIMIT = 5;
        if (data.type === 'text') {
          const { count, error: cntErr } = await supabase
            .from('blink_secrets')
            .select('*', { count: 'exact', head: true })
            .eq('owner_user_id', data.owner_user_id)
            .eq('type', 'text');
          if (cntErr) return { id: '', error: cntErr.message };
          if ((count || 0) >= FREE_TEXT_LIMIT) {
            return { id: '', error: 'Free plan limit reached: 10 text secrets' };
          }
        } else if (data.type === 'file') {
          const { count, error: cntErr } = await supabase
            .from('blink_secrets')
            .select('*', { count: 'exact', head: true })
            .eq('owner_user_id', data.owner_user_id)
            .eq('type', 'file');
          if (cntErr) return { id: '', error: cntErr.message };
          if ((count || 0) >= FREE_FILE_LIMIT) {
            return { id: '', error: 'Free plan limit reached: 5 file secrets' };
          }
        }
      }
    } else {
      // Anonymous: optionally enforce a minimal safety limit for files
      if (data.type === 'file' && typeof data.file_size === 'number') {
        const maxBytes = 1 * 1024 * 1024; // keep anonymous conservative at 1MB
        if (data.file_size > maxBytes) {
          return { id: '', error: 'Anonymous uploads are limited to 1MB.' };
        }
      }
    }

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

export async function renewSecretExpiry(id: string, newExpiryTime: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Server-side validation: Check if secret exists and is not already expired
    const { data: secret, error: fetchError } = await supabase
      .from('blink_secrets')
      .select('expiry_time')
      .eq('id', id)
      .single();

    if (fetchError) {
      return { success: false, error: 'Secret not found' };
    }

    if (secret && new Date(secret.expiry_time) < new Date()) {
      return { success: false, error: 'Cannot renew expiry for an already expired secret' };
    }

    const { error } = await supabase
      .from('blink_secrets')
      .update({ expiry_time: newExpiryTime })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to renew secret expiry' };
  }
}

/**
 * Development mode: Upgrade user to pro without payment
 */
export async function upgradeToProDev(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // First, check if subscription exists
    const { data: existingSub, error: fetchError } = await supabase
      .from('blink_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return { success: false, error: fetchError.message };
    }

    const subscriptionData = {
      plan: 'pro',
      status: 'active',
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      updated_at: new Date().toISOString()
    };

    let result;
    if (existingSub) {
      // Update existing subscription
      result = await supabase
        .from('blink_subscriptions')
        .update(subscriptionData)
        .eq('user_id', userId);
    } else {
      // Create new subscription
      result = await supabase
        .from('blink_subscriptions')
        .insert([{
          user_id: userId,
          ...subscriptionData,
          created_at: new Date().toISOString()
        }]);
    }

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to upgrade to pro' };
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
    // userId here is blink_users.id (UUID)
    const { data: secrets, error } = await supabase
      .from('blink_secrets')
      .select('*')
      .eq('owner_user_id', userId)
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

/**
 * Blink users helpers: map Clerk id to UUID row in blink_users
 */
export async function getBlinkUserByClerkId(clerkUserId: string): Promise<{ user: BlinkUser | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('blink_users')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single();
    if (error) return { user: null, error: error.message };
    return { user: data as BlinkUser };
  } catch (e) {
    return { user: null, error: 'Failed to fetch user' };
  }
}

export async function upsertBlinkUser(clerkUserId: string): Promise<{ user: BlinkUser | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('blink_users')
      .upsert({ clerk_user_id: clerkUserId }, { onConflict: 'clerk_user_id' })
      .select('*')
      .single();
    if (error) return { user: null, error: error.message };
    return { user: data as BlinkUser };
  } catch (e) {
    return { user: null, error: 'Failed to upsert user' };
  }
}

export async function upsertUserSubscription(sub: Omit<Subscription, 'updated_at'>): Promise<{ success: boolean; error?: string }> {
  try {
    // For free users, explicitly set current_period_end to null
    const subscriptionData = {
      ...sub,
      updated_at: new Date().toISOString(),
      // If plan is free, set current_period_end to null to remove it
      current_period_end: sub.plan === 'free' ? null : sub.current_period_end
    };
    
    const { error } = await supabase
      .from('blink_subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' });
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
    let totalDeleted = 0;

    // 1) Delete anonymous expired secrets (no owner)
    const anonDel = await supabase
      .from('blink_secrets')
      .delete()
      .is('owner_user_id', null)
      .lt('expiry_time', new Date().toISOString())
      .select('id');
    if (anonDel.error) return { deleted: totalDeleted, error: anonDel.error.message };
    totalDeleted += anonDel.data?.length || 0;

    // 2) Delete FREE user secrets older than 30 days (long-lived cleanup), regardless of expiry
    const freeSubs = await supabase
      .from('blink_subscriptions')
      .select('user_id')
      .eq('plan', 'free');
    if (freeSubs.error) return { deleted: totalDeleted, error: freeSubs.error.message };
    const freeUserIds = (freeSubs.data || []).map((r: any) => r.user_id);
    if (freeUserIds.length > 0) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const freeDel = await supabase
        .from('blink_secrets')
        .delete()
        .in('owner_user_id', freeUserIds)
        .lt('created_at', thirtyDaysAgo)
        .select('id');
      if (freeDel.error) return { deleted: totalDeleted, error: freeDel.error.message };
      totalDeleted += freeDel.data?.length || 0;
    }

    return { deleted: totalDeleted };
  } catch (error) {
    return { deleted: 0, error: 'Failed to cleanup expired secrets' };
  }
}
