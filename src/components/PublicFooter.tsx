import { Shield, Github, Twitter, Mail, Heart, ArrowRight, Sparkles, Zap, Lock, Globe, Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function PublicFooter() {
  return (
    <footer className="relative border-t bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="relative">
        {/* Main Footer Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-md">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      Blink
                    </span>
                    <span className="text-sm text-muted-foreground -mt-1">Secure Secret Sharing</span>
                  </div>
                </div>
                
                {/* Live & Secure Status */}
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">
                    Live & Secure
                  </span>
                </div>
              </div>
              
              <p className="text-muted-foreground leading-relaxed max-w-md">
                The most secure way to share sensitive information. End-to-end encrypted, 
                anonymous, and designed to disappear forever. Your secrets stay private.
              </p>

              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-muted-foreground">256-bit Encryption</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-muted-foreground">Zero-Knowledge</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span className="text-muted-foreground">Anonymous</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                  <span className="text-muted-foreground">Auto-Delete</span>
                </div>
              </div>

              {/* CTA Button */}
              <Button 
                asChild 
                className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white dark:text-gray-900 shadow-md"
              >
                <Link to="/" className="flex items-center space-x-2">
                  <span>Start Sharing Securely</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            {/* Quick Links */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Code2 className="w-5 h-5 text-primary" />
                <span>Product</span>
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link 
                    to="/" 
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/api-docs" 
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    API Documentation
                  </Link>
                </li>
                <li>
                  <a 
                    href="/dashboard" 
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    Dashboard
                  </a>
                </li>
                <li>
                  <a 
                    href="/dashboard/api" 
                    className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:translate-x-1 inline-block"
                  >
                    API Keys
                  </a>
                </li>
              </ul>
            </div>

            {/* Features */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Zap className="w-5 h-5 text-primary" />
                <span>Features</span>
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4 text-green-500" />
                  <span>End-to-End Encryption</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>Anonymous Sharing</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <span>One-Time View</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Code2 className="w-4 h-4 text-orange-500" />
                  <span>Developer API</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  <span>Password Protection</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t bg-muted/30 backdrop-blur">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              {/* Copyright */}
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>© 2024 Blink. Made with</span>
                <Heart className="w-4 h-4 text-red-500 fill-current" />
                <span>for privacy.</span>
              </div>

              {/* Social Links */}
              <div className="flex items-center space-x-6">
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:scale-110"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:scale-110"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a 
                  href="mailto:support@blink.app" 
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 hover:scale-110"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
