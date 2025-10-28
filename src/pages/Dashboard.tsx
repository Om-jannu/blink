import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Eye,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle,
  Settings,
  Calendar
} from 'lucide-react';
import { getUserSecrets, getUserSubscription, upgradeToProDev } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { userId } = useAuth();
  const { userSecrets, setUserSecrets, setSecretsLoading, blinkUserId, userPlan, setUserPlan, setSubscriptionStatus } = useStore();
  const [stats, setStats] = useState({
    totalSecrets: 0,
    activeSecrets: 0,
    expiredSecrets: 0,
    totalViews: 0,
    textSecrets: 0,
    fileSecrets: 0,
    averageViewsPerSecret: 0,
    mostViewedSecret: null as any,
    recentActivity: [] as any[],
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (userId) {
      loadUserSecrets();
    }
  }, [userId]);

  const [isUpgrading, setIsUpgrading] = useState(false);
  
  useEffect(() => {
    const fetchPlan = async () => {
      if (!blinkUserId) return;
      const { subscription } = await getUserSubscription(blinkUserId);
      setUserPlan(subscription?.plan || 'free');
      setSubscriptionStatus(subscription?.status || null);
    };
    fetchPlan();
  }, [blinkUserId, setUserPlan, setSubscriptionStatus]);

  const handleDevUpgrade = async () => {
    if (!blinkUserId) return;
    
    setIsUpgrading(true);
    try {
      const { success, error } = await upgradeToProDev(blinkUserId);
      if (success) {
        setUserPlan('pro');
        setSubscriptionStatus('active');
        toast.success('Successfully upgraded to Pro! (Development mode)');
      } else {
        toast.error(error || 'Failed to upgrade to Pro');
      }
    } catch (err) {
      toast.error('Failed to upgrade to Pro');
    } finally {
      setIsUpgrading(false);
    }
  };

  useEffect(() => {
    if (userSecrets.length > 0) {
      calculateStats();
    }
  }, [userSecrets]);

  const loadUserSecrets = async () => {
    if (!userId || !blinkUserId) return;

    setSecretsLoading(true);
    try {
      const { secrets, error } = await getUserSecrets(blinkUserId);
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

  const calculateStats = () => {
    const now = new Date();
    const totalSecrets = userSecrets.length;
    const activeSecrets = userSecrets.filter(secret => new Date(secret.expiry_time) > now).length;
    const expiredSecrets = totalSecrets - activeSecrets;
    const totalViews = userSecrets.reduce((sum, secret) => sum + secret.view_count, 0);
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

    setStats({
      totalSecrets,
      activeSecrets,
      expiredSecrets,
      totalViews,
      textSecrets,
      fileSecrets,
      averageViewsPerSecret: Math.round(averageViewsPerSecret * 10) / 10,
      mostViewedSecret,
      recentActivity,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const recentSecrets = userSecrets.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your secret sharing activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={userPlan === 'pro' ? 'default' : 'secondary'}>{userPlan?.toUpperCase() || 'FREE'}</Badge>
          {userPlan === 'free' ? (
            <Button 
              variant="outline" 
              onClick={handleDevUpgrade}
              disabled={isUpgrading}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
            >
              <Shield className="w-4 h-4 mr-2" /> 
              {isUpgrading ? 'Upgrading...' : 'Upgrade to Pro (Dev)'}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/dashboard/settings')}>
              Manage Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Overview */}
      <div className="space-y-6">

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Secrets</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSecrets}</div>
              <p className="text-xs text-muted-foreground">
                All time created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Secrets</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeSecrets}</div>
              <p className="text-xs text-muted-foreground">
                Currently accessible
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews}</div>
              <p className="text-xs text-muted-foreground">
                Times viewed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.expiredSecrets}</div>
              <p className="text-xs text-muted-foreground">
                No longer accessible
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
                    <span className="font-medium">{stats.textSecrets}</span>
                    <Badge variant="secondary">
                      {stats.totalSecrets > 0 ? Math.round((stats.textSecrets / stats.totalSecrets) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-green-500" />
                    <span>File Secrets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.fileSecrets}</span>
                    <Badge variant="secondary">
                      {stats.totalSecrets > 0 ? Math.round((stats.fileSecrets / stats.totalSecrets) * 100) : 0}%
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
                    <span className="font-medium">{stats.activeSecrets}</span>
                    <Badge variant="secondary">
                      {stats.totalSecrets > 0 ? Math.round((stats.activeSecrets / stats.totalSecrets) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Expired</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.expiredSecrets}</span>
                    <Badge variant="secondary">
                      {stats.totalSecrets > 0 ? Math.round((stats.expiredSecrets / stats.totalSecrets) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Secrets */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Secrets</CardTitle>
              <CardDescription>
                Your latest shared secrets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentSecrets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No secrets created yet</p>
                  <Button
                    className="mt-4"
                    onClick={() => navigate('/dashboard/secrets')}
                  >
                    Create Your First Secret
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSecrets.map((secret) => (
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
                            {new Date(secret.created_at).toLocaleDateString()}
                            {secret.file_size && (
                              <span className="ml-2">• {formatFileSize(secret.file_size)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={new Date(secret.expiry_time) < new Date() ? 'destructive' : 'secondary'}>
                          {new Date(secret.expiry_time) < new Date() ? 'Expired' : 'Active'}
                        </Badge>
                        <Badge variant="outline">
                          {secret.view_count} view{secret.view_count !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {userSecrets.length > 5 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/dashboard/secrets')}
                    >
                      View All Secrets
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start"
                onClick={() => navigate('/dashboard/secrets')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Create & Manage Secrets
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/dashboard/settings')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Analytics */}
      </div>
      <div className="space-y-6">
        {/* Most Viewed Secret */}
        {stats.mostViewedSecret && stats.mostViewedSecret.view_count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Most Viewed Secret</CardTitle>
              <CardDescription>
                Your most popular secret
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                {stats.mostViewedSecret.type === 'text' ? (
                  <FileText className="w-8 h-8 text-blue-500" />
                ) : (
                  <Upload className="w-8 h-8 text-green-500" />
                )}
                <div className="flex-1">
                  <div className="font-medium">
                    {stats.mostViewedSecret.type === 'text'
                      ? 'Text Secret'
                      : stats.mostViewedSecret.file_name
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(stats.mostViewedSecret.created_at).toLocaleDateString()}
                    {stats.mostViewedSecret.file_size && (
                      <span className="ml-2">• {formatFileSize(stats.mostViewedSecret.file_size)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{stats.mostViewedSecret.view_count}</div>
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
            {stats.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((secret) => (
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
                          {new Date(secret.created_at).toLocaleDateString()} • {secret.daysSinceCreated} days ago
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
    </div>
  );
}
