import { useState, useEffect } from 'react';
import { useAuth, SignInButton, UserButton } from '@clerk/clerk-react';
import { Shield, Menu, X, User, Code, Home, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { Link, useLocation } from 'react-router-dom';

export function PublicNavbar() {
  const { isSignedIn } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'API Docs', href: '/api-docs', icon: Code },
    ...(isSignedIn ? [{ name: 'Dashboard', href: '/dashboard', icon: Zap }] : []),
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      isScrolled 
        ? 'border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-lg shadow-black/5' 
        : 'border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Blink
              </span>
              <span className="text-xs text-muted-foreground -mt-1">Secure Sharing</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'text-white dark:text-gray-900 bg-gradient-to-r from-primary to-blue-600 shadow-md'
                        : 'text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-primary/10 hover:to-blue-600/10'
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-3">

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Auth Section */}
            {isSignedIn ? (
              <UserButton 
                afterSignOutUrl="/" 
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  }
                }}
              />
            ) : (
              <SignInButton mode="modal">
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white dark:text-gray-900 shadow-md"
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </SignInButton>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden hover:bg-muted/50 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-muted/30 backdrop-blur">
            <div className="px-2 pt-4 pb-6 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium ${
                        isActive
                          ? 'text-white dark:text-gray-900 bg-gradient-to-r from-primary to-blue-600 shadow-md'
                          : 'text-muted-foreground hover:text-foreground hover:bg-gradient-to-r hover:from-primary/10 hover:to-blue-600/10'
                      }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Status */}
              <div className="px-4 py-3 mt-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Secure • Private • Anonymous
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
