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

// Helper function to encrypt text
function encryptText(text) {
  const key = CryptoJS.lib.WordArray.random(256/8).toString();
  const encrypted = CryptoJS.AES.encrypt(text, key).toString();
  return { encrypted, key };
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

// Helper function to encrypt file (simplified for API)
function encryptFile(fileData, fileName) {
  const key = CryptoJS.lib.WordArray.random(256/8).toString();
  const encrypted = CryptoJS.AES.encrypt(fileData, key).toString();
  return { encrypted, key };
}

// Rate limiting check
async function checkRateLimit(apiKeyId, endpoint) {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - 60); // 1 hour window

  const { data: requests } = await supabase
    .from('api_rate_limits')
    .select('request_count')
    .eq('api_key_id', apiKeyId)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1);

  const currentCount = requests?.[0]?.request_count || 0;
  const limit = 100; // 100 requests per hour for free users
  const remaining = Math.max(0, limit - currentCount);

  if (remaining > 0) {
    await supabase
      .from('api_rate_limits')
      .upsert({
        api_key_id: apiKeyId,
        endpoint,
        request_count: currentCount + 1,
        window_start: windowStart.toISOString(),
      });
  }

  return { remaining, limit };
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

    // Check rate limiting
    const rateLimit = await checkRateLimit(user.apiKeyId, req.url);
    
    if (rateLimit.remaining <= 0) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Rate limit of ${rateLimit.limit} requests per hour exceeded`
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimit.limit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await handleGetSecrets(req, res, user);
      case 'POST':
        return await handleCreateSecret(req, res, user);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
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

// GET /api/secrets - List user's secrets
async function handleGetSecrets(req, res, user) {
  try {
    const { data: secrets, error } = await supabase
      .from('blink_secrets')
      .select('id, type, file_name, file_size, expiry_time, password_hash, created_at, view_count')
      .eq('owner_user_id', user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch secrets', details: error.message });
    }

    const response = secrets.map(secret => ({
      id: secret.id,
      type: secret.type,
      file_name: secret.file_name,
      file_size: secret.file_size,
      expiry_time: secret.expiry_time,
      has_password: !!secret.password_hash,
      view_count: secret.view_count,
      view_url: `${process.env.VITE_APP_URL || 'https://your-app.vercel.app'}/view/${secret.id}`,
      created_at: secret.created_at,
    }));

    return res.status(200).json({
      secrets: response,
      count: response.length
    });

  } catch (error) {
    console.error('Get secrets error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/secrets - Create a new secret
async function handleCreateSecret(req, res, user) {
  try {
    const { type, content, file, expiry_minutes, password } = req.body;

    // Validation
    if (!type || !['text', 'file'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "text" or "file"' });
    }

    if (type === 'text' && !content) {
      return res.status(400).json({ error: 'Content is required for text secrets' });
    }

    if (type === 'file' && !file) {
      return res.status(400).json({ error: 'File data is required for file secrets' });
    }

    if (!expiry_minutes || expiry_minutes < 1 || expiry_minutes > 10080) {
      return res.status(400).json({ error: 'Expiry minutes must be between 1 and 10080 (1 week)' });
    }

    // Check user's plan for additional validations
    const { data: subscription } = await supabase
      .from('blink_subscriptions')
      .select('plan')
      .eq('user_id', user.userId)
      .single();

    const plan = subscription?.plan || 'free';

    // Validate password protection (Pro only)
    if (password && plan !== 'pro') {
      return res.status(403).json({ 
        error: 'Password protection is only available for Pro users',
        message: 'Upgrade to Pro to use password protection'
      });
    }

    // Validate file size limits
    if (type === 'file' && file) {
      const maxSize = plan === 'pro' ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB vs 5MB
      if (file.size > maxSize) {
        return res.status(400).json({ 
          error: `File size exceeds ${plan === 'pro' ? '50MB' : '5MB'} limit for ${plan} users` 
        });
      }
    }

    // Encrypt the content
    let encryptedContent, encryptionKey;

    if (type === 'text') {
      const result = encryptText(content);
      encryptedContent = result.encrypted;
      encryptionKey = result.key;
    } else {
      // For files, we expect base64 encoded data
      const result = encryptFile(file.data, file.name);
      encryptedContent = result.encrypted;
      encryptionKey = result.key;
    }

    // Calculate expiry time
    const expiryTime = new Date(Date.now() + expiry_minutes * 60 * 1000).toISOString();

    // Create secret data
    const secretData = {
      type,
      encrypted_content: encryptedContent,
      file_name: type === 'file' ? file.name : undefined,
      file_size: type === 'file' ? file.size : undefined,
      expiry_time: expiryTime,
      password_hash: password ? Buffer.from(password).toString('base64') : undefined,
      encryption_key_or_salt: encryptionKey,
      owner_user_id: user.userId,
    };

    // Insert into database
    const { data: secret, error: insertError } = await supabase
      .from('blink_secrets')
      .insert([secretData])
      .select('id, created_at')
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Failed to create secret', details: insertError.message });
    }

    // Track analytics
    await supabase
      .from('analytics_events')
      .insert([{
        user_id: user.userId,
        event_type: 'create',
        event_data: {
          type,
          hasPassword: !!password,
          fileSize: type === 'file' ? file.size : undefined,
          source: 'api'
        },
        secret_id: secret.id,
      }]);

    const response = {
      id: secret.id,
      type,
      file_name: type === 'file' ? file.name : undefined,
      file_size: type === 'file' ? file.size : undefined,
      expiry_time: expiryTime,
      has_password: !!password,
      view_url: `${process.env.VITE_APP_URL || 'https://your-app.vercel.app'}/view/${secret.id}#${encodeURIComponent(encryptionKey)}`,
      created_at: secret.created_at,
    };

    return res.status(201).json({
      secret: response,
      message: 'Secret created successfully'
    });

  } catch (error) {
    console.error('Create secret error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
