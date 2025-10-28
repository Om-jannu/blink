import { useState, useEffect } from 'react';
import { useAuth, SignInButton, UserButton } from '@clerk/clerk-react';
import { Shield, FileText, Upload, Lock, Copy, Check, Eye, AlertCircle, Download, ExternalLink, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '../components/theme-toggle';
import { useStore } from '../lib/store';
import { encryptText, encryptFile, decryptText, decryptFile } from '../lib/encryption';
import { createSecret, getSecret, markSecretAsViewed, isSecretExpired, cleanupExpiredSecrets, deleteSecret } from '../lib/supabase';
import { validateFileName } from '../lib/validation';
import CryptoJS from 'crypto-js';
import { useDropzone } from 'react-dropzone';

export function LandingPage() {
  const { isSignedIn } = useAuth();
  const { activeTab, setActiveTab, blinkUserId } = useStore();

  // Shared state for both text and file sharing
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [expiry, setExpiry] = useState('15');
  const [customExpiry, setCustomExpiry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [secretUrl, setSecretUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Secret viewing state
  const [viewingSecret, setViewingSecret] = useState(false);
  const [secretId, setSecretId] = useState('');
  const [secretContent, setSecretContent] = useState('');
  const [secretType, setSecretType] = useState<'text' | 'file'>('text');
  const [secretFileName, setSecretFileName] = useState('');
  const [secretFileSize, setSecretFileSize] = useState(0);
  const [secretPassword, setSecretPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [secretViewed, setSecretViewed] = useState(false);
  const [viewingError, setViewingError] = useState('');

  const expiryOptions = [
    { value: '15', label: '15 minutes' },
    { value: '60', label: '1 hour' },
    { value: '360', label: '6 hours' },
    { value: '1440', label: '1 day' },
    { value: '10080', label: '1 week' },
    { value: 'custom', label: 'Custom' },
  ];

  // Cleanup expired secrets on load and periodically
  useEffect(() => {
    const cleanup = async () => {
      try {
        await cleanupExpiredSecrets();
      } catch (error) {
        console.warn('Failed to cleanup expired secrets:', error);
      }
    };

    cleanup(); // Run cleanup immediately
    const interval = setInterval(cleanup, 5 * 60 * 1000); // Periodic cleanup every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Check for secret viewing URL on load
  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;

    console.log('URL Detection:', { path, hash });

    if (path.startsWith('/view/')) {
      const id = path.split('/view/')[1];

      console.log('Secret URL detected:', { path, id, idLength: id?.length, idType: typeof id });

      if (id && id.trim() !== '') {
        console.log('Setting viewingSecret to true');
        setSecretId(id);
        setViewingSecret(true);
        loadSecret(id);
      } else {
        console.error('Invalid secret ID:', { id, path });
      }
    }
  }, []);

  // Debug viewingSecret state changes
  useEffect(() => {
    console.log('viewingSecret state changed:', viewingSecret);
  }, [viewingSecret]);

  // Debug secretId state changes
  useEffect(() => {
    console.log('secretId state changed:', secretId);
  }, [secretId]);

  const loadSecret = async (id: string) => {
    try {
       console.log('Loading secret with ID:', id);
      console.log('ID type:', typeof id);
      console.log('ID length:', id?.length);
      console.log('ID trimmed:', id?.trim());
      const { secret, error } = await getSecret(id);
      if (error) {
        console.log('Secret retrieval error:', error);
        if (error.includes('No rows found') || error.includes('PGRST116') || error.includes('Cannot coerce the result to a single JSON object')) {
          setViewingError('This secret has been deleted or does not exist. It may have been viewed already (one-time secrets) or expired.');
        } else {
          setViewingError('Failed to load secret');
        }
        return;
      }
      if (!secret) {
        setViewingError('This secret has been deleted or does not exist');
        return;
      }

      console.log('Secret loaded:', secret);
      console.log('Secret ID from database:', secret.id);
      console.log('Secret owner_user_id from database:', secret.owner_user_id);

      if (isSecretExpired(secret.expiry_time)) {
        setViewingError('This secret has expired');
        return;
      }

      setSecretType(secret.type);
      setSecretFileName(secret.file_name || '');
      setSecretFileSize(secret.file_size || 0);
      setPasswordRequired(!!secret.password_hash);

      console.log('Secret type:', secret.type, 'Password required:', !!secret.password_hash);

      // Auto-decrypt if no password is required
      if (!secret.password_hash) {
        await handleSecretView(secret);
      }
    } catch (error) {
      console.error('Failed to load secret:', error);
      setViewingError('Failed to load secret');
    }
  };

  const handleSecretPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretPassword) return;

    try {
      const { secret, error } = await getSecret(secretId);
      if (error) {
        console.log('Secret retrieval error in password submit:', error);
        if (error.includes('No rows found') || error.includes('PGRST116') || error.includes('Cannot coerce the result to a single JSON object')) {
          setViewingError('This secret has been deleted or does not exist. It may have been viewed already (one-time secrets) or expired.');
        } else {
          setViewingError('Failed to load secret');
        }
        return;
      }
      if (!secret) {
        setViewingError('This secret has been deleted or does not exist');
        return;
      }

      if (secret.password_hash && secret.password_hash !== btoa(secretPassword)) {
        setViewingError('Invalid password');
        return;
      }

      // For password-protected secrets, derive the key from password + salt
      const salt = secret.encryption_key_or_salt;

      // Derive the actual decryption key from password + salt
      const derivedKey = CryptoJS.PBKDF2(secretPassword, salt, {
        keySize: 256 / 32,
        iterations: 100000
      }).toString();

      await handleSecretViewWithKey(secret, derivedKey);
    } catch (error) {
      setViewingError('Failed to decrypt secret');
    }
  };

  const handleSecretView = async (secret: any) => {
    try {
      // For anonymous secrets, use the encryption key from the database
      const key = secret.encryption_key_or_salt;
      console.log('Decrypting secret with key from database:', key);
      await handleSecretViewWithKey(secret, key);
    } catch (error) {
      console.error('Failed to decrypt secret:', error);
      setViewingError('Failed to decrypt secret');
    }
  };

  const handleSecretViewWithKey = async (secret: any, key: string) => {
    try {
      console.log('Decrypting secret:', { type: secret.type, keyLength: key.length });
      let decryptedContent: string;
      if (secret.type === 'text') {
        const result = decryptText(secret.encrypted_content, key);
        if (!result.success) {
          console.error('Text decryption failed');
          setViewingError('Failed to decrypt secret');
          return;
        }
        decryptedContent = result.decrypted;
        console.log('Text decrypted successfully');
      } else { // For file type
        const result = await decryptFile(secret.encrypted_content, key, secret.file_name || 'file');
        if (!result) {
          console.error('File decryption failed');
          setViewingError('Failed to decrypt secret');
          return;
        }
        const arrayBuffer = await result.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('');
        decryptedContent = btoa(binaryString); // Store as Base64
        console.log('File decrypted successfully');
      }

      setSecretContent(decryptedContent);
      setSecretViewed(true);
      setPasswordRequired(false);

      console.log('Secret viewed successfully');

      // Mark as viewed
      await markSecretAsViewed(secret.id);

      // One-time for anonymous: delete after first successful view
      console.log('Secret owner_user_id:', secret.owner_user_id);
      console.log('Secret ID to delete:', secret.id);
      console.log('Secret ID type:', typeof secret.id);
      console.log('Secret ID length:', secret.id?.length);
      
      if (!secret.owner_user_id) {
        console.log('Deleting anonymous secret:', secret.id);
        const deleteResult = await deleteSecret(secret.id);
        console.log('Delete result:', deleteResult);
        if (deleteResult.success) {
          console.log('Anonymous secret deleted successfully');
        } else {
          console.error('Failed to delete secret:', deleteResult.error);
        }
      } else {
        console.log('Secret has owner, not deleting');
      }
    } catch (error) {
      console.error('Failed to decrypt secret:', error);
      setViewingError('Failed to decrypt secret');
    }
  };

  const downloadFile = () => {
    if (!secretContent || !secretFileName) return;

    try {
      const binaryString = atob(secretContent); // Decode Base64
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Detect MIME type based on file extension
      const extension = secretFileName.split('.').pop()?.toLowerCase();
      let mimeType = 'application/octet-stream';

      if (extension === 'png') mimeType = 'image/png';
      else if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
      else if (extension === 'gif') mimeType = 'image/gif';
      else if (extension === 'pdf') mimeType = 'application/pdf';
      else if (extension === 'txt') mimeType = 'text/plain';
      else if (extension === 'doc') mimeType = 'application/msword';
      else if (extension === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = secretFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];

        // Validate file name
        const validation = validateFileName(file.name);
        if (!validation.isValid) {
          setError(validation.error || 'Invalid file name');
          return;
        }

        setFile(file);
        setError(''); // Clear any previous errors
      }
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB limit for anonymous users
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const openInNewTab = () => {
    window.open(secretUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'text' && !text.trim()) return;
    if (activeTab === 'file' && !file) return;

    // Additional validation for file uploads
    if (activeTab === 'file' && file) {
      const validation = validateFileName(file.name);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file name');
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      // Cleanup expired secrets before creating new ones
      await cleanupExpiredSecrets();

      // Calculate expiry time
      let expiryHours: number;
      if (expiry === 'custom') {
        if (!customExpiry || isNaN(parseFloat(customExpiry)) || parseFloat(customExpiry) <= 0) {
          setError('Please enter a valid custom expiry time');
          return;
        }
        expiryHours = parseFloat(customExpiry) / 60; // Convert minutes to hours
      } else {
        expiryHours = parseFloat(expiry) / 60; // Convert minutes to hours
      }

      let encrypted: string;
      let key: string;
      let secretData: any;

      if (activeTab === 'text') {
        const result = encryptText(text);
        encrypted = result.encrypted;
        key = result.key;
        secretData = {
          type: 'text',
          encrypted_content: encrypted,
          expiry_time: new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString(),
          password_hash: undefined,
          encryption_key_or_salt: key,
          owner_user_id: isSignedIn ? blinkUserId : undefined // Signed-in users have blinkUserId, anonymous users have no owner
        };
      } else {
        const result = await encryptFile(file!);
        encrypted = result.encrypted;
        key = result.key;
        secretData = {
          type: 'file',
          encrypted_content: encrypted,
          file_name: file!.name,
          file_size: file!.size,
          expiry_time: new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString(),
          password_hash: undefined,
          encryption_key_or_salt: key,
          owner_user_id: isSignedIn ? blinkUserId : undefined // Signed-in users have blinkUserId, anonymous users have no owner
        };
      }

      console.log('Creating secret with data:', secretData);
      const { id, error: dbError } = await createSecret(secretData);

      if (dbError) throw new Error(dbError);
      console.log('Secret created with ID:', id);

      // Encryption key is now stored in the database

      const secretUrl = `${window.location.origin}/view/${id}#${encodeURIComponent(key)}`;
      setSecretUrl(secretUrl);
      // Don't call resetForm() here - we want to show the success screen
      setText('');
      setFile(null);
      setExpiry('15');
      setCustomExpiry('');
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create secret');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">Blink</span>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">Secure • Private • Anonymous</Badge>
              {isSignedIn ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/dashboard'}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                  <UserButton afterSignOutUrl="/" />
                </div>
              ) : (
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </SignInButton>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Secret Viewer - Available for all users */}
          {viewingSecret && (
            <Card className="max-w-2xl mx-auto mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <CardTitle>Secret Viewer</CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {secretType === 'text' ? 'Text' : 'File'}
                  </Badge>
                </div>
                <CardDescription>
                  {secretType === 'file' && secretFileName && (
                    <div className="flex items-center gap-2 mt-2">
                      <Upload className="w-4 h-4" />
                      <span>{secretFileName} ({formatFileSize(secretFileSize)})</span>
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {passwordRequired ? (
                  <form onSubmit={handleSecretPasswordSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="secret-password">Password Required</Label>
                      <Input
                        id="secret-password"
                        type="password"
                        value={secretPassword}
                        onChange={(e) => setSecretPassword(e.target.value)}
                        placeholder="Enter password to view secret"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      <Lock className="w-4 h-4 mr-2" />
                      Decrypt Secret
                    </Button>
                    {viewingError && (
                      <div className="space-y-4">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{viewingError}</AlertDescription>
                        </Alert>
                        <div className="flex justify-center pt-4">
                          <Button 
                            onClick={() => window.location.href = '/'}
                            variant="outline"
                            className="w-full"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Create Your Own Secret
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>
                ) : secretViewed ? (
                  <div className="space-y-4">
                    {secretType === 'text' ? (
                      <div className="p-4 bg-muted rounded-lg">
                        <pre className="whitespace-pre-wrap">{secretContent}</pre>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg text-center">
                          <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            File ready for download: {secretFileName}
                          </p>
                        </div>
                        <Button onClick={downloadFile} className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          Download {secretFileName}
                        </Button>
                      </div>
                    )}
                    <Alert>
                      <Eye className="h-4 w-4" />
                      <AlertDescription>
                        This secret has been viewed and is no longer accessible.
                        The link will not work again.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex justify-center pt-4">
                      <Button 
                        onClick={() => window.location.href = '/'}
                        variant="outline"
                        className="w-full"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Create Your Own Secret
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading secret...</p>
                    {viewingError && (
                      <div className="space-y-4">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{viewingError}</AlertDescription>
                        </Alert>
                        <div className="flex justify-center pt-4">
                          <Button 
                            onClick={() => window.location.href = '/'}
                            variant="outline"
                            className="w-full"
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Create Your Own Secret
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Main Landing Page Content */}
          {!viewingSecret && (
            <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[600px]">
              {/* Left Column - Content */}
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                      <Shield className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold tracking-tight">Blink</h1>
                      <p className="text-lg text-muted-foreground">Secure Secret Sharing</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold">
                      Share secrets that <span className="text-primary">disappear forever</span>
                    </h2>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                      Send encrypted messages and files that self-destruct after viewing.
                      Zero-knowledge encryption ensures your secrets stay private.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <Lock className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold">End-to-End Encrypted</h3>
                    <p className="text-sm text-muted-foreground">
                      Your data is encrypted client-side before transmission
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold">One-Time View</h3>
                    <p className="text-sm text-muted-foreground">
                      Secrets disappear after being viewed once
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold">Anonymous</h3>
                    <p className="text-sm text-muted-foreground">
                      No account required for basic sharing
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => document.getElementById('secret-builder')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Start Sharing
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => window.location.href = '/dashboard'}
                  >
                    <User className="w-5 h-5 mr-2" />
                    Sign In for More Features
                  </Button>
                </div>
              </div>

              {/* Right Column - Secret Builder */}
              <div id="secret-builder" className="lg:sticky lg:top-8">
                {/* Success/Share UI shown ONLY when not viewing a secret */}
                {!viewingSecret && (
                  secretUrl ? (
                    <Card className="w-full">
                      <CardHeader className="text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Check className="w-8 h-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Secret Created Successfully!</CardTitle>
                        <CardDescription>
                          Your encrypted {activeTab === 'text' ? 'message' : 'file'} is ready to share.
                          The link will expire after viewing or at the set time.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label>Share this link:</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm bg-muted p-2 rounded border truncate" title={secretUrl}>
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

                        <div className="flex flex-wrap gap-2 justify-center">
                          <Button onClick={() => {
                            setSecretUrl('');
                            setText('');
                            setFile(null);
                            setExpiry('15');
                            setCustomExpiry('');
                            setError('');
                          }} variant="outline">
                            Create Another
                          </Button>
                          <Button onClick={copyToClipboard}>
                            {copied ? 'Copied!' : 'Copy Link'}
                          </Button>
                          <Button onClick={openInNewTab} variant="outline">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open in New Tab
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    /* Sharing Interface with Tabs */
                    <Card className="w-full">
                      <CardHeader className="text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Shield className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Share a Secret</CardTitle>
                        <CardDescription className="text-center">
                          Choose how you want to share your secret
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'text' | 'file')} className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="text" className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Text
                            </TabsTrigger>
                            <TabsTrigger value="file" className="flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              File
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="text" className="space-y-4 mt-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div>
                                <Label htmlFor="text">Your Secret Message</Label>
                                <Textarea
                                  id="text"
                                  value={text}
                                  onChange={(e) => setText(e.target.value)}
                                  placeholder="Enter your secret message here..."
                                  className="min-h-[120px]"
                                  required
                                />
                              </div>

                              <div className="grid gap-4 md:grid-cols-1">
                                <div>
                                  <Label htmlFor="expiry">Expiry Time</Label>
                                  <Select value={expiry} onValueChange={setExpiry}>
                                    <SelectTrigger>
                                      <SelectValue />
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

                              {expiry === 'custom' && (
                                <div>
                                  <Label htmlFor="custom-expiry">Custom Expiry (minutes)</Label>
                                  <Input
                                    id="custom-expiry"
                                    type="number"
                                    min="1"
                                    max="10080"
                                    step="1"
                                    value={customExpiry}
                                    onChange={(e) => setCustomExpiry(e.target.value)}
                                    placeholder="Enter minutes (e.g., 15, 60, 120)"
                                  />
                                </div>
                              )}

                              {error && (
                                <Alert variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>{error}</AlertDescription>
                                </Alert>
                              )}

                              <Button type="submit" className="w-full" disabled={isLoading || !text.trim()}>
                                {isLoading ? (
                                  <>
                                    <Lock className="w-4 h-4 mr-2 animate-spin" />
                                    Creating Secret...
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-4 h-4 mr-2" />
                                    Create Secret Link
                                  </>
                                )}
                              </Button>
                            </form>
                          </TabsContent>

                          <TabsContent value="file" className="space-y-4 mt-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div>
                                <Label>Upload File</Label>
                                <div
                                  {...getRootProps()}
                                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                                    }`}
                                >
                                  <input {...getInputProps()} />
                                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                  {file ? (
        <div>
                                      <p className="font-medium">{file.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {formatFileSize(file.size)}
                                      </p>
        </div>
                                  ) : (
                                    <div>
                                      <p className="font-medium">
                                        {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to select'}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        Maximum file size: 5MB
        </p>
      </div>
                                  )}
                                </div>
                              </div>

                              <div className="grid gap-4 md:grid-cols-1">
                                <div>
                                  <Label htmlFor="file-expiry">Expiry Time</Label>
                                  <Select value={expiry} onValueChange={setExpiry}>
                                    <SelectTrigger>
                                      <SelectValue />
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

                              {expiry === 'custom' && (
                                <div>
                                  <Label htmlFor="file-custom-expiry">Custom Expiry (minutes)</Label>
                                  <Input
                                    id="file-custom-expiry"
                                    type="number"
                                    min="1"
                                    max="10080"
                                    step="1"
                                    value={customExpiry}
                                    onChange={(e) => setCustomExpiry(e.target.value)}
                                    placeholder="Enter minutes (e.g., 15, 60, 120)"
                                  />
                                </div>
                              )}

                              {error && (
                                <Alert variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>{error}</AlertDescription>
                                </Alert>
                              )}

                              <Button type="submit" className="w-full" disabled={isLoading || !file}>
                                {isLoading ? (
                                  <>
                                    <Lock className="w-4 h-4 mr-2 animate-spin" />
                                    Creating Secret...
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-4 h-4 mr-2" />
                                    Create Secret Link
                                  </>
                                )}
                              </Button>
                            </form>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
