import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Plus, 
  Trash2, 
  Key, 
  HardDrive,
  Activity,
  Clock,
  FileText
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { getUserAnalytics, getRealTimeMetrics, type AnalyticsData } from '@/lib/analytics';
import { toast } from 'sonner';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color?: string;
}

function MetricCard({ title, value, change, icon, color = "bg-blue-500" }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <p className="text-xs text-muted-foreground mt-1">{change}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${color} text-white`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityItemProps {
  type: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

function ActivityItem({ type, description, timestamp, icon }: ActivityItemProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'create': return 'text-green-600 bg-green-100';
      case 'view': return 'text-blue-600 bg-blue-100';
      case 'delete': return 'text-red-600 bg-red-100';
      case 'api_call': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg">
      <div className={`p-2 rounded-full ${getTypeColor(type)}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{description}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [refreshing, setRefreshing] = useState(false);
  const { blinkUserId } = useStore();

  useEffect(() => {
    if (blinkUserId) {
      loadAnalytics();
      loadRealTimeMetrics();
    }
  }, [blinkUserId, timeRange]);

  const loadAnalytics = async () => {
    if (!blinkUserId) return;
    
    setLoading(true);
    const { success, data } = await getUserAnalytics(blinkUserId, parseInt(timeRange));
    
    if (success && data) {
      setAnalytics(data);
    } else {
      toast.error('Failed to load analytics');
    }
    setLoading(false);
  };

  const loadRealTimeMetrics = async () => {
    if (!blinkUserId) return;
    
    const { success, data } = await getRealTimeMetrics(blinkUserId);
    
    if (success && data) {
      setRealTimeMetrics(data);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAnalytics(), loadRealTimeMetrics()]);
    setRefreshing(false);
    toast.success('Analytics refreshed');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'create': return <Plus className="w-3 h-3" />;
      case 'view': return <Eye className="w-3 h-3" />;
      case 'delete': return <Trash2 className="w-3 h-3" />;
      case 'api_call': return <Key className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const getActivityDescription = (event: any) => {
    switch (event.event_type) {
      case 'create':
        return `Created ${event.event_data?.type || 'secret'}`;
      case 'view':
        return 'Viewed secret';
      case 'delete':
        return 'Deleted secret';
      case 'api_call':
        return 'API call made';
      default:
        return 'Activity';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Insights into your secret usage</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Insights into your secret usage and activity</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <Activity className="w-4 h-4 mr-2" />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Secrets"
          value={analytics?.totalSecrets || 0}
          icon={<FileText className="w-5 h-5" />}
          color="bg-blue-500"
        />
        <MetricCard
          title="Total Views"
          value={analytics?.totalViews || 0}
          icon={<Eye className="w-5 h-5" />}
          color="bg-green-500"
        />
        <MetricCard
          title="API Calls"
          value={analytics?.totalApiCalls || 0}
          icon={<Key className="w-5 h-5" />}
          color="bg-purple-500"
        />
        <MetricCard
          title="Storage Used"
          value={formatBytes(analytics?.storageUsed || 0)}
          icon={<HardDrive className="w-5 h-5" />}
          color="bg-orange-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Your latest secret operations and API calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {analytics?.recentActivity?.length ? (
                analytics.recentActivity.slice(0, 10).map((event, index) => (
                  <ActivityItem
                    key={index}
                    type={event.event_type}
                    description={getActivityDescription(event)}
                    timestamp={event.created_at}
                    icon={getActivityIcon(event.event_type)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Secrets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Most Viewed Secrets</span>
            </CardTitle>
            <CardDescription>
              Your most frequently accessed secrets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.topSecrets?.length ? (
                analytics.topSecrets.slice(0, 5).map((secret, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">Secret {secret.secret_id.slice(0, 8)}...</p>
                        <p className="text-xs text-muted-foreground">
                          Last viewed {new Date(secret.last_viewed).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {secret.view_count} views
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No view data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Stats */}
      {analytics?.dailyStats && analytics.dailyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Daily Usage</span>
            </CardTitle>
            <CardDescription>
              Your secret activity over the selected time period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.dailyStats.slice(-7).map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {new Date(stat.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stat.secrets_created} created, {stat.secrets_viewed} viewed
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-green-600">{stat.secrets_created}</p>
                      <p className="text-xs text-muted-foreground">Created</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-blue-600">{stat.secrets_viewed}</p>
                      <p className="text-xs text-muted-foreground">Viewed</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-purple-600">{stat.api_calls}</p>
                      <p className="text-xs text-muted-foreground">API Calls</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Metrics */}
      {realTimeMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Real-time Metrics</span>
            </CardTitle>
            <CardDescription>
              Live activity from the last hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {realTimeMetrics.recentEvents?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Events (1h)</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {Object.keys(realTimeMetrics.hourlyActivity || {}).length}
                </p>
                <p className="text-sm text-muted-foreground">Active Hours</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {realTimeMetrics.dailyStats?.secrets_created || 0}
                </p>
                <p className="text-sm text-muted-foreground">Today's Secrets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
