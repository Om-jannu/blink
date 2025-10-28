import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to hash API keys
function hashApiKey(apiKey) {
  return CryptoJS.SHA256(apiKey).toString();
}

// Helper function to authenticate API key
async function authenticateApiKey(apiKey) {
  if (!apiKey) return null;
  
  const hashedKey = hashApiKey(apiKey);
  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, is_active')
    .eq('key_hash', hashedKey)
    .eq('is_active', true)
    .single();

  if (error || !keyData) return null;
  
  return {
    userId: keyData.user_id,
    apiKeyId: keyData.id,
    apiKeyName: keyData.name,
  };
}

// Helper function to decrypt text
function decryptText(encryptedText, key) {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key);
    return {
      success: true,
      decrypted: decrypted.toString(CryptoJS.enc.Utf8)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'API key required',
        message: 'Include your API key in the x-api-key header'
      });
    }

    // Authenticate the API key
    const user = await authenticateApiKey(apiKey);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid API key',
        message: 'The provided API key is invalid or inactive'
      });
    }

    // Get secret ID from URL
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Secret ID is required' });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await handleGetSecret(req, res, user, id);
      case 'DELETE':
        return await handleDeleteSecret(req, res, user, id);
      case 'PUT':
        return await handleExpireSecret(req, res, user, id);
      default:
        res.setHeader('Allow', ['GET', 'DELETE', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
}

// GET /api/secrets/[id] - Get specific secret details
async function handleGetSecret(req, res, user, secretId) {
  try {
    // Get secret from database
    const { data: secret, error } = await supabase
      .from('blink_secrets')
      .select('*')
      .eq('id', secretId)
      .eq('owner_user_id', user.userId)
      .single();

    if (error || !secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    // Check if expired
    const isExpired = new Date(secret.expiry_time) < new Date();
    
    if (isExpired) {
      return res.status(410).json({ 
        error: 'Secret has expired',
        message: 'This secret is no longer accessible'
      });
    }

    // Decrypt content
    let decryptedContent = null;
    
    try {
      if (secret.type === 'text') {
        const result = decryptText(secret.encrypted_content, secret.encryption_key_or_salt);
        if (result.success) {
          decryptedContent = result.decrypted;
        }
      } else {
        // For files, return the encrypted content and let client handle decryption
        decryptedContent = secret.encrypted_content;
      }
    } catch (error) {
      console.error('Decryption error:', error);
      return res.status(500).json({ error: 'Failed to decrypt secret' });
    }

    if (!decryptedContent) {
      return res.status(500).json({ error: 'Failed to decrypt secret' });
    }

    // Track view event
    await supabase
      .from('analytics_events')
      .insert([{
        user_id: user.userId,
        event_type: 'view',
        event_data: {
          type: secret.type,
          hasPassword: !!secret.password_hash,
          viewCount: secret.view_count + 1,
          source: 'api'
        },
        secret_id: secret.id,
      }]);

    // Update view count
    await supabase
      .from('blink_secrets')
      .update({ view_count: secret.view_count + 1 })
      .eq('id', secretId);

    const response = {
      id: secret.id,
      type: secret.type,
      content: secret.type === 'text' ? decryptedContent : undefined,
      file_name: secret.file_name,
      file_size: secret.file_size,
      file_data: secret.type === 'file' ? decryptedContent : undefined,
      expiry_time: secret.expiry_time,
      has_password: !!secret.password_hash,
      view_count: secret.view_count + 1,
      created_at: secret.created_at,
      is_expired: false,
    };

    return res.status(200).json({ secret: response });

  } catch (error) {
    console.error('Get secret error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE /api/secrets/[id] - Delete a secret
async function handleDeleteSecret(req, res, user, secretId) {
  try {
    // Get secret info for analytics
    const { data: secret } = await supabase
      .from('blink_secrets')
      .select('type, password_hash')
      .eq('id', secretId)
      .eq('owner_user_id', user.userId)
      .single();

    if (!secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    // Delete the secret
    const { error } = await supabase
      .from('blink_secrets')
      .delete()
      .eq('id', secretId)
      .eq('owner_user_id', user.userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete secret', details: error.message });
    }

    // Track deletion event
    await supabase
      .from('analytics_events')
      .insert([{
        user_id: user.userId,
        event_type: 'delete',
        event_data: {
          type: secret.type,
          hasPassword: !!secret.password_hash,
          source: 'api'
        },
        secret_id: secretId,
      }]);

    return res.status(200).json({ 
      message: 'Secret deleted successfully',
      deleted_id: secretId
    });

  } catch (error) {
    console.error('Delete secret error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/secrets/[id] - Expire a secret immediately
async function handleExpireSecret(req, res, user, secretId) {
  try {
    // Check if secret exists and belongs to user
    const { data: secret, error: fetchError } = await supabase
      .from('blink_secrets')
      .select('id, expiry_time')
      .eq('id', secretId)
      .eq('owner_user_id', user.userId)
      .single();

    if (fetchError || !secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    // Check if already expired
    if (new Date(secret.expiry_time) < new Date()) {
      return res.status(400).json({ error: 'Secret is already expired' });
    }

    // Set expiry time to now
    const { error } = await supabase
      .from('blink_secrets')
      .update({ 
        expiry_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', secretId)
      .eq('owner_user_id', user.userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to expire secret', details: error.message });
    }

    return res.status(200).json({ 
      message: 'Secret expired successfully',
      expired_id: secretId,
      expired_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Expire secret error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
