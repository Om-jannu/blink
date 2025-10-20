import { Shield, Lock, FileText, Upload, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from './theme-toggle';

interface LandingPageProps {
  onShareText: () => void;
  onShareFile: () => void;
}

export default function LandingPage({ onShareText, onShareFile }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Blink
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-xs">
              Secure • Private • Anonymous
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Share secrets that{' '}
            <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              vanish
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Send encrypted files and messages that self-destruct after being viewed. 
            No accounts, no tracking, no permanent storage.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              onClick={onShareText}
              size="lg"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <FileText className="w-5 h-5 mr-2" />
              Share Text
            </Button>
            <Button
              onClick={onShareFile}
              variant="outline"
              size="lg"
              className="px-8 py-4 font-semibold text-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
            >
              <Upload className="w-5 h-5 mr-2" />
              Share File
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="p-6">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Lock className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-xl">End-to-End Encryption</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Your data is encrypted client-side before upload. We can't see your secrets.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-xl">Auto-Destruct</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Files and messages automatically delete after being viewed or expiring.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="p-6">
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">One-Time View</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Each secret can only be viewed once. No second chances, maximum security.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* How it works */}
          <Card className="p-8">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl">How it works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    1
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Upload & Encrypt</h3>
                  <p className="text-muted-foreground">
                    Choose your file or text, set expiry time, and we encrypt it client-side.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    2
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Share Link</h3>
                  <p className="text-muted-foreground">
                    Get a secure link with the decryption key. Share it with anyone.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    3
                  </div>
                  <h3 className="text-xl font-semibold mb-2">View & Destroy</h3>
                  <p className="text-muted-foreground">
                    Recipient views the content once, then it's permanently deleted.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-slate-200 dark:border-slate-700">
        <div className="text-center text-muted-foreground">
          <p>Built with privacy in mind. No tracking, no accounts, no permanent storage.</p>
        </div>
      </footer>
    </div>
  );
}
