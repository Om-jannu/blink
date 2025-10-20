import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './lib/theme-provider';
import { AuthProvider } from './lib/auth-provider';
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
import { ThemeToggle } from './components/theme-toggle';
import { DashboardLayout } from './components/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { MySecretsPage } from './pages/MySecretsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useStore } from './lib/store';
import { encryptText, encryptFile, decryptText, decryptFile } from './lib/encryption';
import { createSecret, getSecret, markSecretAsViewed, isSecretExpired, cleanupExpiredSecrets } from './lib/supabase';
import { validateFileName } from './lib/validation';
import { useDropzone } from 'react-dropzone';
import './App.css';

// Landing Page Component
function LandingPage() {
  const { isSignedIn } = useAuth();
  const { activeTab, setActiveTab } = useStore();
  
  // Redirect authenticated users to dashboard only on home route
  useEffect(() => {
    if (isSignedIn && window.location.pathname === '/') {
      window.location.href = '/dashboard';
    }
  }, [isSignedIn]);
  
  // Shared state for both text and file sharing
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('0.25');
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
    { value: '0.25', label: '15 minutes' },
    { value: '1', label: '1 hour' },
    { value: '6', label: '6 hours' },
    { value: '24', label: '1 day' },
    { value: '168', label: '1 week' },
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
    
    if (path.startsWith('/view/') && hash) {
      const id = path.split('/view/')[1];
      const key = decodeURIComponent(hash.substring(1));
      
      if (id && key) {
        setSecretId(id);
        setViewingSecret(true);
        loadSecret(id);
      }
    }
  }, []);

  const loadSecret = async (id: string) => {
    try {
      const { secret, error } = await getSecret(id);
      if (error) throw new Error(error);
      if (!secret) throw new Error('Secret not found');

      if (isSecretExpired(secret.expiry_time)) {
        setViewingError('This secret has expired');
        return;
      }

      setSecretType(secret.type);
      setSecretFileName(secret.file_name || '');
      setSecretFileSize(secret.file_size || 0);
      setPasswordRequired(!!secret.password_hash);

      // Auto-decrypt if no password is required
      if (!secret.password_hash) {
        await handleSecretView(secret);
      }
    } catch (error) {
      setViewingError('Failed to load secret');
    }
  };

  const handleSecretPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretPassword) return;

    try {
      const { secret, error } = await getSecret(secretId);
      if (error) throw new Error(error);
      if (!secret) throw new Error('Secret not found');

      if (secret.password_hash && secret.password_hash !== btoa(secretPassword)) {
        setViewingError('Invalid password');
        return;
      }

      await handleSecretView(secret);
    } catch (error) {
      setViewingError('Failed to decrypt secret');
    }
  };

  const handleSecretView = async (secret: any) => {
    try {
      const hash = window.location.hash.substring(1);
      const key = decodeURIComponent(hash);

      let decryptedContent: string;
      if (secret.type === 'text') {
        const result = decryptText(secret.encrypted_content, key);
        if (!result.success) {
          setViewingError('Failed to decrypt secret');
          return;
        }
        decryptedContent = result.decrypted;
      } else { // For file type
        const result = await decryptFile(secret.encrypted_content, key, secret.file_name || 'file');
        if (!result) {
          setViewingError('Failed to decrypt secret');
          return;
        }
        const arrayBuffer = await result.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = Array.from(uint8Array).map(byte => String.fromCharCode(byte)).join('');
        decryptedContent = btoa(binaryString); // Store as Base64
      }

      setSecretContent(decryptedContent);
      setSecretViewed(true);
      setPasswordRequired(false);

      // Mark as viewed
      await markSecretAsViewed(secretId);
    } catch (error) {
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
    maxSize: 10 * 1024 * 1024, // 10MB limit
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const resetForm = () => {
    setText('');
    setFile(null);
    setPassword('');
    setExpiry('0.25');
    setCustomExpiry('');
    setSecretUrl('');
    setError('');
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
        expiryHours = parseFloat(customExpiry);
      } else {
        expiryHours = parseFloat(expiry);
      }
      
      let encrypted: string;
      let key: string;
      let secretData: any;

      if (activeTab === 'text') {
        const result = encryptText(text, password || undefined);
        encrypted = result.encrypted;
        key = result.key;
        secretData = {
          type: 'text',
          encrypted_content: encrypted,
          expiry_time: new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString(),
          password_hash: password ? btoa(password) : undefined,
          encryption_salt: key,
          owner_id: isSignedIn ? undefined : undefined // Will be set by the user's auth state
        };
      } else {
        const result = await encryptFile(file!, password || undefined);
        encrypted = result.encrypted;
        key = result.key;
        secretData = {
          type: 'file',
          encrypted_content: encrypted,
          file_name: file!.name,
          file_size: file!.size,
          expiry_time: new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString(),
          password_hash: password ? btoa(password) : undefined,
          encryption_salt: key,
          owner_id: isSignedIn ? undefined : undefined // Will be set by the user's auth state
        };
      }

      const { id, error: dbError } = await createSecret(secretData);

      if (dbError) throw new Error(dbError);

      const secretUrl = `${window.location.origin}/view/${id}#${encodeURIComponent(key)}`;
      setSecretUrl(secretUrl);
      resetForm();
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
          <div className="max-w-4xl mx-auto">
            {/* Authenticated User Message */}
            {isSignedIn && (
              <Card className="max-w-2xl mx-auto mb-8">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Welcome Back!</CardTitle>
                  <CardDescription>
                    You're signed in. Redirecting you to your dashboard...
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button onClick={() => window.location.href = '/dashboard'} className="w-full">
                    <User className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}
          {/* Secret Viewer */}
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
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{viewingError}</AlertDescription>
                      </Alert>
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
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Loading secret...</p>
                    {viewingError && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{viewingError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Success/Share UI shown ONLY when not viewing a secret */}
          {!viewingSecret && (
          secretUrl ? (
            <Card className="max-w-2xl mx-auto">
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
                  <Button onClick={resetForm} variant="outline">
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
            <Card className="max-w-2xl mx-auto">
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

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="password">Password (Optional)</Label>
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Add password protection"
                          />
                        </div>
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
                          <Label htmlFor="custom-expiry">Custom Expiry (hours)</Label>
                          <Input
                            id="custom-expiry"
                            type="number"
                            min="0.25"
                            max="168"
                            step="0.25"
                            value={customExpiry}
                            onChange={(e) => setCustomExpiry(e.target.value)}
                            placeholder="Enter hours (0.25 = 15 minutes)"
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
                          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
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
                                Maximum file size: 10MB
        </p>
      </div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="file-password">Password (Optional)</Label>
                          <Input
                            id="file-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Add password protection"
                          />
                        </div>
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
                          <Label htmlFor="file-custom-expiry">Custom Expiry (hours)</Label>
                          <Input
                            id="file-custom-expiry"
                            type="number"
                            min="0.25"
                            max="168"
                            step="0.25"
                            value={customExpiry}
                            onChange={(e) => setCustomExpiry(e.target.value)}
                            placeholder="Enter hours (0.25 = 15 minutes)"
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

          {/* Create new secret button for viewer-only screens */}
          {viewingSecret && (
            <div className="max-w-2xl mx-auto mb-8 flex justify-center">
              <Button onClick={() => {
                if (isSignedIn) {
                  window.location.href = '/dashboard/secrets';
                } else {
                  window.location.href = '/';
                }
              }}>
                <Shield className="w-4 h-4 mr-2" /> Create New Secret
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

// Main App Component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/view/:id" element={<LandingPage />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/secrets" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <MySecretsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/settings" 
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

function AppWrapper() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="blink-theme">
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default AppWrapper;