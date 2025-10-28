import { supabase } from './supabase';
import CryptoJS from 'crypto-js';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateApiKeyData {
  name: string;
  permissions?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
  };
  expires_at?: string;
}

export interface ApiKeyWithToken {
  id: string;
  name: string;
  token: string; // Only returned on creation
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
  };
  expires_at: string | null;
  created_at: string;
}

// Generate a secure API key
function generateApiKey(): string {
  const randomPart = CryptoJS.lib.WordArray.random(32).toString();
  const timestamp = Date.now().toString(36);
  return `blink_${timestamp}_${randomPart}`;
}

// Hash API key for storage
function hashApiKey(key: string): string {
  return CryptoJS.SHA256(key).toString();
}

// Create a new API key
export async function createApiKey(
  userId: string,
  data: CreateApiKeyData
): Promise<{ success: boolean; data?: ApiKeyWithToken; error?: string }> {
  try {
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    
    const permissions = {
      read: data.permissions?.read ?? true,
      write: data.permissions?.write ?? true,
      delete: data.permissions?.delete ?? true,
    };

    const { data: result, error } = await supabase
      .from('blink_api_keys')
      .insert({
        user_id: userId,
        name: data.name,
        key_hash: keyHash,
        permissions,
        expires_at: data.expires_at || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        id: result.id,
        name: result.name,
        token: apiKey, // Return the plain key only once
        permissions: result.permissions,
        expires_at: result.expires_at,
        created_at: result.created_at,
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to create API key' };
  }
}

// Get all API keys for a user
export async function getUserApiKeys(
  userId: string
): Promise<{ success: boolean; data?: ApiKey[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('blink_api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: 'Failed to fetch API keys' };
  }
}

// Update API key
export async function updateApiKey(
  keyId: string,
  userId: string,
  updates: Partial<CreateApiKeyData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.permissions) updateData.permissions = updates.permissions;
    if (updates.expires_at !== undefined) updateData.expires_at = updates.expires_at;

    const { error } = await supabase
      .from('blink_api_keys')
      .update(updateData)
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update API key' };
  }
}

// Delete API key
export async function deleteApiKey(
  keyId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('blink_api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete API key' };
  }
}

// Verify API key and get user info
export async function verifyApiKeyAndGetUser(
  apiKey: string
): Promise<{ success: boolean; user?: { id: string; permissions: any }; error?: string }> {
  try {
    const keyHash = hashApiKey(apiKey);
    
    const { data, error } = await supabase
      .from('blink_api_keys')
      .select('user_id, permissions, is_active, expires_at')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return { success: false, error: 'Invalid API key' };
    }

    // Check if key is expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { success: false, error: 'API key has expired' };
    }

    // Update last used timestamp
    await supabase
      .from('blink_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', keyHash);

    return {
      success: true,
      user: {
        id: data.user_id,
        permissions: data.permissions,
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to verify API key' };
  }
}

// Toggle API key active status
export async function toggleApiKeyStatus(
  keyId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error: fetchError } = await supabase
      .from('blink_api_keys')
      .select('is_active')
      .eq('id', keyId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    const { error } = await supabase
      .from('blink_api_keys')
      .update({ is_active: !data.is_active })
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to toggle API key status' };
  }
}
