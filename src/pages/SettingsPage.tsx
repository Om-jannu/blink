import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Bell, 
  Shield, 
  Trash2, 
  Download,
  Info
} from 'lucide-react';

import { getUserSubscription, upsertUserSubscription } from '@/lib/supabase';

export function SettingsPage() {
  const { user } = useUser();
  const { userId } = useAuth();
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [status, setStatus] = useState('active');
  const [settings, setSettings] = useState({
    emailNotifications: true,
    securityAlerts: true,
    analyticsTracking: true,
    autoDeleteExpired: true,
    defaultExpiry: '0.25', // 15 minutes
    maxFileSize: '10', // MB
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const loadSub = async () => {
      if (!userId) return;
      const { subscription } = await getUserSubscription(userId);
      setPlan((subscription?.plan as any) || 'free');
      setStatus(subscription?.status || 'active');
    };
    loadSub();
  }, [userId]);

  const handleUpgrade = async () => {
    if (!userId) return;
    await upsertUserSubscription({ user_id: userId, plan: 'pro', status: 'active', current_period_end: undefined });
    setPlan('pro');
  };

  const handleDowngrade = async () => {
    if (!userId) return;
    await upsertUserSubscription({ user_id: userId, plan: 'free', status: 'active', current_period_end: undefined });
    setPlan('free');
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // In a real app, you'd fetch user data and create an export
      const exportData = {
        user: {
          id: user?.id,
          email: user?.emailAddresses?.[0]?.emailAddress,
          createdAt: user?.createdAt,
        },
        settings,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blink-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      // In a real app, you'd call an API to delete the account
      console.log('Account deletion requested');
      // For now, just sign out
      window.location.href = '/';
    } catch (error) {
      console.error('Account deletion failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and security settings
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your account details and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={user?.emailAddresses?.[0]?.emailAddress || 'Not available'}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="memberSince">Member Since</Label>
              <Input
                id="memberSince"
                value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Not available'}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label>Plan</Label>
              <Input value={plan.toUpperCase()} disabled className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <Input value={status} disabled className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            {plan === 'pro' ? (
              <Button variant="outline" onClick={handleDowngrade}>Downgrade to Free</Button>
            ) : (
              <Button onClick={handleUpgrade}>Upgrade to Pro</Button>
            )}
            <Button variant="outline">Manage Subscription</Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications about your secrets via email
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Security Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about security-related events
              </p>
            </div>
            <Switch
              checked={settings.securityAlerts}
              onCheckedChange={(checked) => handleSettingChange('securityAlerts', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Privacy
          </CardTitle>
          <CardDescription>
            Manage your security preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Analytics Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Allow anonymous usage analytics to improve the service
              </p>
            </div>
            <Switch
              checked={settings.analyticsTracking}
              onCheckedChange={(checked) => handleSettingChange('analyticsTracking', checked)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-delete Expired Secrets</Label>
              <p className="text-sm text-muted-foreground">
                Automatically delete expired secrets from your account
              </p>
            </div>
            <Switch
              checked={settings.autoDeleteExpired}
              onCheckedChange={(checked) => handleSettingChange('autoDeleteExpired', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Settings</CardTitle>
          <CardDescription>
            Configure default values for new secrets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="defaultExpiry">Default Expiry Time (hours)</Label>
              <Input
                id="defaultExpiry"
                type="number"
                min="0.25"
                max="168"
                step="0.25"
                value={settings.defaultExpiry}
                onChange={(e) => handleSettingChange('defaultExpiry', e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum: 15 minutes, Maximum: 1 week
              </p>
            </div>
            <div>
              <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
              <Input
                id="maxFileSize"
                type="number"
                min="1"
                max="100"
                value={settings.maxFileSize}
                onChange={(e) => handleSettingChange('maxFileSize', e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum file size for uploads
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export or delete your account data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You can export your data or delete your account at any time. 
              Account deletion is permanent and cannot be undone.
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Notice:</strong> All your secrets are encrypted client-side 
          before being stored. We never have access to your unencrypted data. 
          Your privacy and security are our top priorities.
        </AlertDescription>
      </Alert>
    </div>
  );
}
