import { useState } from 'react';
import { UserButton } from '@clerk/clerk-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  LayoutDashboard, 
  Eye, 
  Settings, 
  Menu, 
  X,
  Shield,
  Crown,
  Key,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { upgradeToProDev } from '@/lib/supabase';
import { toast } from 'sonner';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'My Secrets',
    href: '/dashboard/secrets',
    icon: Eye,
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    name: 'API Keys',
    href: '/dashboard/api',
    icon: Key,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { userPlan, blinkUserId, setUserPlan, setSubscriptionStatus } = useStore();

  const handleUpgrade = async () => {
    if (!blinkUserId) return;
    
    setIsUpgrading(true);
    try {
      const { success, error } = await upgradeToProDev(blinkUserId);
      if (success) {
        setUserPlan('pro');
        setSubscriptionStatus('active');
        toast.success('Successfully upgraded to Pro! (Development mode)');
        window.location.reload();
      } else {
        toast.error(error || 'Failed to upgrade to Pro');
      }
    } catch (err) {
      toast.error('Failed to upgrade to Pro');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center justify-between px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent group-hover:from-primary/80 group-hover:to-blue-600/80 transition-all duration-200">Blink</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="hover:bg-muted/50"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 p-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Button
                    key={item.name}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      isActive ? "text-white dark:text-gray-900 bg-gradient-to-r from-primary to-blue-600 shadow-md" : "hover:bg-gradient-to-r hover:from-primary/10 hover:to-blue-600/10"
                    )}
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.name}
                  </Button>
                );
              })}
            </nav>
            <div className="border-t p-4">
              {userPlan === 'free' ? (
                <Card className="border-0 shadow-none bg-gradient-to-r from-primary/10 to-blue-600/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-4 h-4 text-purple-600" />
                      <CardTitle className="text-sm">Upgrade to Pro</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      Unlock unlimited secrets and advanced features
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-primary to-blue-600 text-white dark:text-gray-900 border-0 hover:from-primary/90 hover:to-blue-600/90"
                      onClick={handleUpgrade}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? 'Upgrading...' : 'Upgrade Now'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center space-x-3">
                  <Badge variant="default" className="bg-gradient-to-r from-primary to-blue-600">
                    <Crown className="w-3 h-3 mr-1" />
                    Pro
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background border-r">
          <div className="flex h-16 shrink-0 items-center px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent group-hover:from-primary/80 group-hover:to-blue-600/80 transition-all duration-200">Blink</span>
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-1 p-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start",
                        isActive ? "text-white dark:text-gray-900 bg-gradient-to-r from-primary to-blue-600 shadow-md" : "hover:bg-gradient-to-r hover:from-primary/10 hover:to-blue-600/10"
                      )}
                      onClick={() => navigate(item.href)}
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {item.name}
                    </Button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t p-4">
              {userPlan === 'free' ? (
                <Card className="border-0 shadow-none bg-gradient-to-r from-primary/10 to-blue-600/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-4 h-4 text-purple-600" />
                      <CardTitle className="text-sm">Upgrade to Pro</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      Unlock unlimited secrets and advanced features
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-primary to-blue-600 text-white dark:text-gray-900 border-0 hover:from-primary/90 hover:to-blue-600/90"
                      onClick={handleUpgrade}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? 'Upgrading...' : 'Upgrade Now'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center space-x-3">
                  <Badge variant="default" className="bg-gradient-to-r from-primary to-blue-600">
                    <Crown className="w-3 h-3 mr-1" />
                    Pro
                  </Badge>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <ThemeToggle />
              <UserButton />
            </div>
          </div>
        </div>

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
