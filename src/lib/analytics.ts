import { supabase } from './supabase';

export interface AnalyticsEvent {
  id: string;
  user_id: string | null;
  secret_id: string | null;
  event_type: 'create' | 'view' | 'delete' | 'expire' | 'renew' | 'api_call';
  event_data: any;
  ip_address?: string;
  user_agent?: string;
  api_key_id?: string;
  created_at: string;
}

export interface UsageStats {
  id: string;
  user_id: string;
  date: string;
  secrets_created: number;
  secrets_viewed: number;
  secrets_deleted: number;
  files_uploaded: number;
  total_storage_bytes: number;
  api_calls: number;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsData {
  totalSecrets: number;
  totalViews: number;
  totalApiCalls: number;
  storageUsed: number;
  recentActivity: AnalyticsEvent[];
  dailyStats: UsageStats[];
  topSecrets: Array<{
    secret_id: string;
    view_count: number;
    last_viewed: string;
  }>;
}

// Track an analytics event
export async function trackEvent(
  eventType: AnalyticsEvent['event_type'],
  data: {
    userId?: string;
    secretId?: string;
    eventData?: any;
    ipAddress?: string;
    userAgent?: string;
    apiKeyId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('blink_analytics_events')
      .insert({
        user_id: data.userId || null,
        secret_id: data.secretId || null,
        event_type: eventType,
        event_data: data.eventData || {},
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null,
        api_key_id: data.apiKeyId || null,
      });

    if (error) {
      console.error('Analytics tracking error:', error);
      return { success: false, error: error.message };
    }

    // Update daily usage stats
    if (data.userId) {
      await updateDailyStats(data.userId, eventType, data.eventData);
    }

    return { success: true };
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return { success: false, error: 'Failed to track event' };
  }
}

// Update daily usage statistics
async function updateDailyStats(
  userId: string,
  eventType: string,
  eventData?: any
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get current stats for today
    const { data: existingStats } = await supabase
      .from('blink_usage_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    const updates: any = {};
    
    switch (eventType) {
      case 'create':
        updates.secrets_created = (existingStats?.secrets_created || 0) + 1;
        if (eventData?.type === 'file') {
          updates.files_uploaded = (existingStats?.files_uploaded || 0) + 1;
          updates.total_storage_bytes = (existingStats?.total_storage_bytes || 0) + (eventData?.size || 0);
        }
        break;
      case 'view':
        updates.secrets_viewed = (existingStats?.secrets_viewed || 0) + 1;
        break;
      case 'delete':
        updates.secrets_deleted = (existingStats?.secrets_deleted || 0) + 1;
        break;
      case 'api_call':
        updates.api_calls = (existingStats?.api_calls || 0) + 1;
        break;
    }

    if (existingStats) {
      // Update existing record
      await supabase
        .from('blink_usage_stats')
        .update(updates)
        .eq('id', existingStats.id);
    } else {
      // Create new record
      await supabase
        .from('blink_usage_stats')
        .insert({
          user_id: userId,
          date: today,
          ...updates,
        });
    }
  } catch (error) {
    console.error('Failed to update daily stats:', error);
  }
}

// Get analytics data for a user
export async function getUserAnalytics(
  userId: string,
  days: number = 30
): Promise<{ success: boolean; data?: AnalyticsData; error?: string }> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total counts
    const [
      { data: totalSecrets },
      { data: totalViews },
      { data: totalApiCalls },
      { data: storageData },
      { data: recentActivity },
      { data: dailyStats },
      { data: topSecrets }
    ] = await Promise.all([
      supabase
        .from('blink_secrets')
        .select('id', { count: 'exact' })
        .eq('owner_user_id', userId),
      
      supabase
        .from('blink_analytics_events')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('event_type', 'view'),
      
      supabase
        .from('blink_analytics_events')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('event_type', 'api_call'),
      
      supabase
        .from('blink_usage_stats')
        .select('total_storage_bytes')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1),
      
      supabase
        .from('blink_analytics_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(50),
      
      supabase
        .from('blink_usage_stats')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true }),
      
      supabase
        .from('blink_analytics_events')
        .select('secret_id, created_at')
        .eq('user_id', userId)
        .eq('event_type', 'view')
        .gte('created_at', startDate.toISOString())
    ]);

    // Process top secrets
    const secretViewCounts: { [key: string]: { count: number; lastViewed: string } } = {};
    topSecrets?.forEach(event => {
      if (event.secret_id) {
        if (!secretViewCounts[event.secret_id]) {
          secretViewCounts[event.secret_id] = { count: 0, lastViewed: event.created_at };
        }
        secretViewCounts[event.secret_id].count++;
        if (event.created_at > secretViewCounts[event.secret_id].lastViewed) {
          secretViewCounts[event.secret_id].lastViewed = event.created_at;
        }
      }
    });

    const topSecretsArray = Object.entries(secretViewCounts)
      .map(([secret_id, data]) => ({
        secret_id,
        view_count: data.count,
        last_viewed: data.lastViewed,
      }))
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, 10);

    const analyticsData: AnalyticsData = {
      totalSecrets: totalSecrets?.length || 0,
      totalViews: totalViews?.length || 0,
      totalApiCalls: totalApiCalls?.length || 0,
      storageUsed: storageData?.[0]?.total_storage_bytes || 0,
      recentActivity: recentActivity || [],
      dailyStats: dailyStats || [],
      topSecrets: topSecretsArray,
    };

    return { success: true, data: analyticsData };
  } catch (error) {
    return { success: false, error: 'Failed to fetch analytics data' };
  }
}

// Get system-wide analytics (for admin)
export async function getSystemAnalytics(
  days: number = 30
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      { data: totalUsers },
      { data: totalSecrets },
      { data: totalViews },
      { data: totalApiCalls },
      { data: dailyStats }
    ] = await Promise.all([
      supabase
        .from('blink_users')
        .select('id', { count: 'exact' }),
      
      supabase
        .from('blink_secrets')
        .select('id', { count: 'exact' }),
      
      supabase
        .from('blink_analytics_events')
        .select('id', { count: 'exact' })
        .eq('event_type', 'view'),
      
      supabase
        .from('blink_analytics_events')
        .select('id', { count: 'exact' })
        .eq('event_type', 'api_call'),
      
      supabase
        .from('blink_usage_stats')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true })
    ]);

    return {
      success: true,
      data: {
        totalUsers: totalUsers?.length || 0,
        totalSecrets: totalSecrets?.length || 0,
        totalViews: totalViews?.length || 0,
        totalApiCalls: totalApiCalls?.length || 0,
        dailyStats: dailyStats || [],
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to fetch system analytics' };
  }
}

// Get real-time metrics
export async function getRealTimeMetrics(
  userId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      { data: recentEvents },
      { data: hourlyStats },
      { data: dailyStats }
    ] = await Promise.all([
      supabase
        .from('blink_analytics_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false }),
      
      supabase
        .from('blink_analytics_events')
        .select('event_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', oneHourAgo.toISOString()),
      
      supabase
        .from('blink_usage_stats')
        .select('*')
        .eq('user_id', userId)
        .gte('date', oneDayAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(1)
    ]);

    // Process hourly activity
    const hourlyActivity: { [key: string]: number } = {};
    hourlyStats?.forEach(event => {
      const hour = new Date(event.created_at).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    return {
      success: true,
      data: {
        recentEvents: recentEvents || [],
        hourlyActivity,
        dailyStats: dailyStats?.[0] || null,
        lastUpdated: now.toISOString(),
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to fetch real-time metrics' };
  }
}
