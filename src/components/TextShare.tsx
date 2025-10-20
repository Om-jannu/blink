import { useState } from 'react';
import { ArrowLeft, Copy, Check, Shield, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from './theme-toggle';
import { encryptText } from '../lib/encryption';
import { createSecret } from '../lib/supabase';

interface TextShareProps {
  onBack: () => void;
}

export default function TextShare({ onBack }: TextShareProps) {
  const [text, setText] = useState('');
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [secretUrl, setSecretUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const expiryOptions = [
    { value: '15', label: '15 minutes' },
    { value: '1', label: '1 hour' },
    { value: '6', label: '6 hours' },
    { value: '24', label: '24 hours' },
    { value: '168', label: '7 days' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // Encrypt the text
      const { encrypted, key } = encryptText(text, password || undefined);
      
      // Calculate expiry time
      const expiryHours = parseFloat(expiry);
      const expiryTime = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
      
      // Create secret in database
      const { id, error: dbError } = await createSecret({
        type: 'text',
        encrypted_content: encrypted,
        expiry_time: expiryTime,
        password_hash: password ? btoa(password) : undefined,
        encryption_key_or_salt: key,
      });

      if (dbError) {
        throw new Error(dbError);
      }

      // Create the shareable URL with key in fragment
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/view/${id}#${encodeURIComponent(key)}`;
      setSecretUrl(shareUrl);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create secret');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(secretUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (secretUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Secret Created!</CardTitle>
            <CardDescription className="text-lg">
              Your encrypted message is ready to share. The link will expire after viewing or at the set time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Share this link:</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-muted p-2 rounded border break-all">
                  {secretUrl}
                </code>
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="sm"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button
                onClick={onBack}
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Create Another
              </Button>
              <Button
                onClick={copyToClipboard}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                onClick={onBack}
                variant="ghost"
                size="sm"
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-2xl">Share Secret Text</CardTitle>
            </div>
            <ThemeToggle />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="text">Your secret message</Label>
              <Textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your secret message here..."
                className="min-h-[120px]"
                required
              />
              <p className="text-sm text-muted-foreground">
                This will be encrypted before storage. We can't see your message.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password (optional)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Add extra security"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry">Expires in</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger>
                    <Clock className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Select expiry time" />
                  </SelectTrigger>
                  <SelectContent>
                    {expiryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={!text.trim() || isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
            >
              {isLoading ? 'Creating Secret...' : 'Create Secret Link'}
            </Button>
          </form>

          <Alert className="mt-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">Security Features:</p>
                <ul className="text-sm space-y-1">
                  <li>• End-to-end encryption (AES-256)</li>
                  <li>• One-time view only</li>
                  <li>• Auto-deletion after expiry</li>
                  <li>• No account required</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
