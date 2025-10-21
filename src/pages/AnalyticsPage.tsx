import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Eye, 
  FileText, 
  Upload,
  BarChart3,
  Activity,
  Calendar
} from 'lucide-react';
import { getUserSecrets } from '@/lib/supabase';
import { useStore } from '@/lib/store';

export function AnalyticsPage() {
  const { userId } = useAuth();
  const { userSecrets, setUserSecrets, setSecretsLoading } = useStore();
  const [analytics, setAnalytics] = useState({
    totalSecrets: 0,
    totalViews: 0,
    activeSecrets: 0,
    expiredSecrets: 0,
    textSecrets: 0,
    fileSecrets: 0,
    averageViewsPerSecret: 0,
    mostViewedSecret: null as any,
    recentActivity: [] as any[],
  });

  useEffect(() => {
    if (userId) {
      loadUserSecrets();
    }
  }, [userId]);

  useEffect(() => {
    if (userSecrets.length > 0) {
      calculateAnalytics();
    }
  }, [userSecrets]);

  const loadUserSecrets = async () => {
    if (!userId) return;
    
    setSecretsLoading(true);
    try {
      const { secrets, error } = await getUserSecrets(userId);
      if (error) {
        console.error('Failed to load user secrets:', error);
        return;
      }
      setUserSecrets(secrets || []);
    } catch (error) {
      console.error('Failed to load user secrets:', error);
    } finally {
      setSecretsLoading(false);
    }
  };

  const calculateAnalytics = () => {
    const now = new Date();
    const totalSecrets = userSecrets.length;
    const totalViews = userSecrets.reduce((sum, secret) => sum + secret.view_count, 0);
    const activeSecrets = userSecrets.filter(secret => new Date(secret.expiry_time) > now).length;
    const expiredSecrets = totalSecrets - activeSecrets;
    const textSecrets = userSecrets.filter(secret => secret.type === 'text').length;
    const fileSecrets = userSecrets.filter(secret => secret.type === 'file').length;
    const averageViewsPerSecret = totalSecrets > 0 ? totalViews / totalSecrets : 0;
    
    const mostViewedSecret = userSecrets.reduce((max, secret) => 
      secret.view_count > max.view_count ? secret : max, 
      userSecrets[0] || { view_count: 0 }
    );

    // Recent activity (last 10 secrets)
    const recentActivity = userSecrets
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(secret => ({
        ...secret,
        isExpired: new Date(secret.expiry_time) < now,
        daysSinceCreated: Math.floor((now.getTime() - new Date(secret.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }));

    setAnalytics({
      totalSecrets,
      totalViews,
      activeSecrets,
      expiredSecrets,
      textSecrets,
      fileSecrets,
      averageViewsPerSecret: Math.round(averageViewsPerSecret * 10) / 10,
      mostViewedSecret,
      recentActivity,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Insights into your secret sharing activity
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Secrets</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSecrets}</div>
            <p className="text-xs text-muted-foreground">
              All time created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Times viewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Secrets</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.activeSecrets}</div>
            <p className="text-xs text-muted-foreground">
              Currently accessible
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Views/Secret</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageViewsPerSecret}</div>
            <p className="text-xs text-muted-foreground">
              Average engagement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Type Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Content Types</CardTitle>
            <CardDescription>
              Breakdown of your secret types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Text Secrets</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{analytics.textSecrets}</span>
                  <Badge variant="secondary">
                    {analytics.totalSecrets > 0 ? Math.round((analytics.textSecrets / analytics.totalSecrets) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-green-500" />
                  <span>File Secrets</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{analytics.fileSecrets}</span>
                  <Badge variant="secondary">
                    {analytics.totalSecrets > 0 ? Math.round((analytics.fileSecrets / analytics.totalSecrets) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Overview</CardTitle>
            <CardDescription>
              Current status of your secrets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{analytics.activeSecrets}</span>
                  <Badge variant="secondary">
                    {analytics.totalSecrets > 0 ? Math.round((analytics.activeSecrets / analytics.totalSecrets) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Expired</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{analytics.expiredSecrets}</span>
                  <Badge variant="secondary">
                    {analytics.totalSecrets > 0 ? Math.round((analytics.expiredSecrets / analytics.totalSecrets) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Viewed Secret */}
      {analytics.mostViewedSecret && analytics.mostViewedSecret.view_count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Viewed Secret</CardTitle>
            <CardDescription>
              Your most popular secret
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              {analytics.mostViewedSecret.type === 'text' ? (
                <FileText className="w-8 h-8 text-blue-500" />
              ) : (
                <Upload className="w-8 h-8 text-green-500" />
              )}
              <div className="flex-1">
                <div className="font-medium">
                  {analytics.mostViewedSecret.type === 'text' 
                    ? 'Text Secret' 
                    : analytics.mostViewedSecret.file_name
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  Created: {formatDate(analytics.mostViewedSecret.created_at)}
                  {analytics.mostViewedSecret.file_size && (
                    <span className="ml-2">• {formatFileSize(analytics.mostViewedSecret.file_size)}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{analytics.mostViewedSecret.view_count}</div>
                <div className="text-sm text-muted-foreground">views</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest secret sharing activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No activity yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.recentActivity.map((secret) => (
                <div key={secret.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {secret.type === 'text' ? (
                      <FileText className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Upload className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <div className="font-medium">
                        {secret.type === 'text' ? 'Text Secret' : secret.file_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(secret.created_at)} • {secret.daysSinceCreated} days ago
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={secret.isExpired ? 'destructive' : 'secondary'}>
                      {secret.isExpired ? 'Expired' : 'Active'}
                    </Badge>
                    <Badge variant="outline">
                      {secret.view_count} view{secret.view_count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
