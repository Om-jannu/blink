import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Download, AlertCircle, Lock, FileText, File, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { decryptText, decryptFile, decryptTextWithPassword, decryptFileWithPassword } from '../lib/encryption';
import { getSecret, markSecretAsViewed, deleteSecret, isSecretExpired } from '../lib/supabase';

interface SecretViewerProps {
  secretId: string;
  encryptionKey: string; // Still needed for URL compatibility, but not used for decryption
}

export default function SecretViewer({ secretId, encryptionKey }: SecretViewerProps) {
  // Note: encryptionKey is kept for URL compatibility but not used for decryption
  // as we now get the salt/key from the database for better security
  console.log('SecretViewer initialized with encryptionKey:', encryptionKey ? 'present' : 'missing');
  const navigate = useNavigate();
  const [secret, setSecret] = useState<any>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    loadSecret();
  }, [secretId]);

  // Handle page reload - delete secret if it's anonymous and was already viewed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isAnonymous) {
        // Secret is already deleted, but we can add cleanup here if needed
        console.log('Page reloading - anonymous secret already deleted');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isAnonymous]);

  const loadSecret = async () => {
    try {
      const { secret: secretData, error: fetchError } = await getSecret(secretId);
      
      if (fetchError) {
        setError('Secret not found or has expired');
        return;
      }

      if (!secretData) {
        setError('Secret not found');
        return;
      }

      // Check if secret has expired
      if (isSecretExpired(secretData.expiry_time)) {
        setError('This secret has expired');
        return;
      }

      // Check if already viewed
      if (secretData.view_count > 0) {
        setError('This secret has already been viewed and is no longer available');
        return;
      }

      setSecret(secretData);

      // Check if this is an anonymous secret (no owner)
      const isAnonymousSecret = !secretData.owner_user_id;
      setIsAnonymous(isAnonymousSecret);
      console.log('Secret type:', isAnonymousSecret ? 'Anonymous' : 'Registered', 'Owner ID:', secretData.owner_user_id);

      // Check if password is required
      if (secretData.password_hash) {
        setPasswordRequired(true);
        setIsLoading(false);
        return;
      }

      // Decrypt content if no password required
      // For non-password secrets, use encryption key from database
      await decryptContent(secretData, secretData.encryption_key_or_salt, false, isAnonymousSecret);
      
    } catch (err) {
      setError('Failed to load secret');
    } finally {
      setIsLoading(false);
    }
  };

  const decryptContent = async (secretData: any, keyOrPassword: string, isPasswordProtected: boolean = false, isAnonymousSecret: boolean = false) => {
    try {
      let decrypted: string | File | null = null;

      if (secretData.type === 'text') {
        let result;
        if (isPasswordProtected) {
          // For password-protected secrets, use password + salt from database
          result = decryptTextWithPassword(secretData.encrypted_content, keyOrPassword, secretData.encryption_key_or_salt);
        } else {
          // For non-password secrets, use encryption key directly
          result = decryptText(secretData.encrypted_content, keyOrPassword);
        }
        
        if (result.success) {
          decrypted = result.decrypted;
        } else {
          setError('Failed to decrypt content. Invalid key or corrupted data.');
          return;
        }
      } else if (secretData.type === 'file') {
        if (isPasswordProtected) {
          // For password-protected secrets, use password + salt from database
          decrypted = await decryptFileWithPassword(secretData.encrypted_content, keyOrPassword, secretData.encryption_key_or_salt, secretData.file_name);
        } else {
          // For non-password secrets, use encryption key directly
          decrypted = await decryptFile(secretData.encrypted_content, keyOrPassword, secretData.file_name);
        }
        
        if (!decrypted) {
          setError('Failed to decrypt file. Invalid key or corrupted data.');
          return;
        }
      }

      setDecryptedContent(decrypted);
      setShowContent(true);
      console.log('Content set, showContent:', true, 'isAnonymous:', isAnonymousSecret);

      // For anonymous users, mark as viewed and delete after a small delay to allow content to display
      if (isAnonymousSecret) {
        // Use setTimeout to allow the UI to render the content first
        setTimeout(async () => {
          try {
            console.log('Deleting anonymous secret:', secretId);
            await markSecretAsViewed(secretId);
            console.log('Secret marked as viewed');
            await deleteSecret(secretId);
            console.log('Secret deleted from database');
          } catch (error) {
            console.error('Failed to delete anonymous secret:', error);
          }
        }, 100); // 100ms delay to ensure content renders
      }
      
    } catch (err) {
      setError('Failed to decrypt content');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // Verify password
      if (secret.password_hash && btoa(password) !== secret.password_hash) {
        setError('Incorrect password');
        setIsLoading(false);
        return;
      }

      // For password-protected secrets, use password + salt from database
      await decryptContent(secret, password, true, isAnonymous);
      
    } catch (err) {
      setError('Failed to decrypt content');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadFile = () => {
    if (!decryptedContent || !(decryptedContent instanceof window.File)) return;

    try {
      const url = URL.createObjectURL(decryptedContent);
      const a = document.createElement('a');
      a.href = url;
      a.download = decryptedContent.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <CardTitle className="text-2xl">Loading Secret...</CardTitle>
            <CardDescription>Decrypting your secure content</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">Secret Unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This could happen if the secret has expired, been viewed already, or the link is invalid.
              </AlertDescription>
            </Alert>
            <div className="pt-4 border-t">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                <Shield className="w-4 h-4 mr-2" />
                Create Your Own Secret
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (passwordRequired && !decryptedContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">Password Required</CardTitle>
            <CardDescription>This secret is protected with a password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Enter password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter the password"
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Decrypting...' : 'Decrypt Secret'}
              </Button>
            </form>
            <div className="pt-4 border-t">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                <Shield className="w-4 h-4 mr-2" />
                Create Your Own Secret
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show content for registered users (no deletion prompt)
  if (showContent && !isAnonymous) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-4xl w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              {secret?.type === 'file' ? <File className="w-8 h-8 text-green-600" /> : <FileText className="w-8 h-8 text-green-600" />}
            </div>
            <CardTitle className="text-3xl">
              {secret?.type === 'file' ? 'Encrypted File' : 'Secret Message'}
            </CardTitle>
            <CardDescription className="text-lg">
              Your secure content is ready to view
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {secret?.type === 'text' && decryptedContent && typeof decryptedContent === 'string' && (
              <Card className="bg-muted">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Message:</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(decryptedContent)}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {decryptedContent}
                  </div>
                </CardContent>
              </Card>
            )}

            {secret?.type === 'file' && decryptedContent instanceof window.File && (
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <File className="w-8 h-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">{decryptedContent.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {(decryptedContent.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={downloadFile}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="pt-4 border-t">
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                <Shield className="w-4 h-4 mr-2" />
                Create Your Own Secret
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (showContent && isAnonymous) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-4xl w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              {secret?.type === 'file' ? <File className="w-8 h-8 text-green-600" /> : <FileText className="w-8 h-8 text-green-600" />}
            </div>
            <CardTitle className="text-3xl">
              {secret?.type === 'file' ? 'Encrypted File' : 'Secret Message'}
            </CardTitle>
            <CardDescription className="text-lg">
              This content has been automatically deleted after viewing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {secret?.type === 'text' && typeof decryptedContent === 'string' && (
              <Card className="bg-muted">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Message:</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(decryptedContent)}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {decryptedContent}
                  </div>
                </CardContent>
              </Card>
            )}

            {secret?.type === 'file' && decryptedContent instanceof window.File && (
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <File className="w-8 h-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold">{decryptedContent.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {(decryptedContent.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={downloadFile}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200 mb-1">
                    Security Notice
                  </p>
                  <p className="text-green-700 dark:text-green-300">
                    This secret has been automatically deleted from our servers. The link is no longer valid.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="pt-4 border-t">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                <Shield className="w-4 h-4 mr-2" />
                Create Your Own Secret
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {secret?.type === 'file' ? <File className="w-8 h-8 text-green-600" /> : <FileText className="w-8 h-8 text-green-600" />}
          </div>
          <CardTitle className="text-3xl">
            {secret?.type === 'file' ? 'Encrypted File' : 'Secret Message'}
          </CardTitle>
          <CardDescription className="text-lg">
            This content will be deleted after viewing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {secret?.type === 'text' && typeof decryptedContent === 'string' && (
            <Card className="bg-muted">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Message:</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(decryptedContent)}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {decryptedContent}
                </div>
              </CardContent>
            </Card>
          )}

          {secret?.type === 'file' && decryptedContent instanceof window.File && (
            <Card className="bg-muted">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <File className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">{decryptedContent.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {(decryptedContent.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={downloadFile}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  Security Notice
                </p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  This secret has been automatically deleted after viewing. The link is no longer valid.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="pt-4 border-t">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              <Shield className="w-4 h-4 mr-2" />
              Create Your Own Secret
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
