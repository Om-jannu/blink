import { useState, useEffect } from 'react';
import { useAuth, SignInButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { Shield, FileText, Upload, Lock, Copy, Check, Eye, AlertCircle, ExternalLink, Code, Key, Terminal, Zap, User, ArrowRight, Clock, Globe, Laptop, Server, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { useStore } from '../lib/store';
import { encryptText, encryptFile } from '../lib/encryption';
import { createSecret, cleanupExpiredSecrets } from '../lib/supabase';
import { validateFileName } from '../lib/validation';
import { useDropzone } from 'react-dropzone';

export function LandingPage() {
  const { isSignedIn } = useAuth();
  const { activeTab, setActiveTab, blinkUserId } = useStore();
  const navigate = useNavigate();

  // Shared state for both text and file sharing
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [expiry, setExpiry] = useState('15');
  const [customExpiry, setCustomExpiry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [secretUrl, setSecretUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const expiryOptions = [
    { value: '15', label: '15 minutes' },
    { value: '60', label: '1 hour' },
    { value: '360', label: '6 hours' },
    { value: '1440', label: '1 day' },
    { value: '10080', label: '1 week' },
    { value: 'custom', label: 'Custom' },
  ];

  // Cleanup expired secrets on component mount
  useEffect(() => {
    const cleanup = async () => {
      try {
        await cleanupExpiredSecrets();
      } catch (error) {
        console.error('Failed to cleanup expired secrets:', error);
      }
    };

    cleanup(); // Run cleanup immediately
    const interval = setInterval(cleanup, 5 * 60 * 1000); // Periodic cleanup every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(secretUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyCodeToClipboard = async (code: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const openInNewTab = () => {
    window.open(secretUrl, '_blank', 'noopener,noreferrer');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
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
          owner_user_id: isSignedIn ? blinkUserId : undefined,
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
          owner_user_id: isSignedIn ? blinkUserId : undefined,
        };
      }

      const result = await createSecret(secretData);
      if (result.error) {
        setError(result.error);
        return;
      }

      const baseUrl = window.location.origin;
      const secretUrl = `${baseUrl}/view/${result.id}#${encodeURIComponent(key)}`;
      setSecretUrl(secretUrl);
    } catch (error) {
      console.error('Error creating secret:', error);
      setError('Failed to create secret');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero Section */}
      <main className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
        
        {/* Hero Content */}
        <section className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Column - Hero Content */}
              <div className="space-y-8">
                <div className="space-y-6">
                  <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                    Share secrets{' '}
                    <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      securely
                    </span>
                  </h1>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Send encrypted messages and files that disappear after viewing. 
                    No registration required, complete anonymity guaranteed.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
                    onClick={() => document.getElementById('secret-builder')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Shield className="w-5 h-5 mr-2" />
                    Start Sharing
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <SignInButton mode="modal">
                    <Button
                      variant="outline"
                      size="lg"
                      className="text-lg px-8 py-6"
                    >
                      <User className="w-5 h-5 mr-2" />
                      Sign In for Pro Features
                    </Button>
                  </SignInButton>
                </div>

                <div className="flex items-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>No registration required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>End-to-end encrypted</span>
                  </div>
                </div>
              </div>

              {/* Right Column - Secret Builder */}
              <div id="secret-builder" className="lg:sticky lg:top-8">
                {secretUrl ? (
                  <Card className="w-full border-2 border-green-200 dark:border-green-800">
                    <CardHeader className="text-center">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>
                      <CardTitle className="text-2xl">Secret Created!</CardTitle>
                      <CardDescription>
                        Your encrypted {activeTab === 'text' ? 'message' : 'file'} is ready to share.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label>Share this link:</Label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm bg-muted p-3 rounded border truncate" title={secretUrl}>
                            {secretUrl}
                          </code>
                          <Button size="sm" variant="outline" onClick={copyToClipboard}>
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                          {copied ? <><Check className="w-4 h-4 mr-2" />Copied!</> : <><Copy className="w-4 h-4 mr-2" />Copy Link</>}
                        </Button>
                        <Button onClick={openInNewTab} variant="outline" className="flex-1">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Open
                        </Button>
                      </div>
                      <div className="pt-4 border-t">
                        <Button
                          onClick={() => {
                            setSecretUrl('');
                            setText('');
                            setFile(null);
                            setExpiry('15');
                            setCustomExpiry('');
                            setError('');
                            setActiveTab('text');
                          }}
                          variant="outline"
                          className="w-full"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Create Another Secret
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="w-full shadow-2xl">
                    <CardHeader>
                      <CardTitle className="text-center text-2xl">Create Secret</CardTitle>
                      <CardDescription className="text-center">
                        Share encrypted messages and files that disappear after viewing
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'text' | 'file')}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="text">Text</TabsTrigger>
                          <TabsTrigger value="file">File</TabsTrigger>
                        </TabsList>
                        <TabsContent value="text" className="space-y-4">
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="text-content">Secret Message</Label>
                              <Textarea
                                id="text-content"
                                placeholder="Enter your secret message..."
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                className="min-h-[120px]"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="expiry">Expires in</Label>
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
                            {expiry === 'custom' && (
                              <div className="space-y-2">
                                <Label htmlFor="custom-expiry">Custom expiry (minutes)</Label>
                                <Input
                                  id="custom-expiry"
                                  type="number"
                                  placeholder="Enter minutes (1-10080)"
                                  value={customExpiry}
                                  onChange={(e) => setCustomExpiry(e.target.value)}
                                  min="1"
                                  max="10080"
                                  required
                                />
                              </div>
                            )}
                            {error && (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                              </Alert>
                            )}
                            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white dark:text-gray-900 shadow-md" disabled={isLoading || !text.trim()}>
                              {isLoading ? (
                                <>
                                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Shield className="w-4 h-4 mr-2" />
                                  Create Secret
                                </>
                              )}
                            </Button>
                          </form>
                        </TabsContent>
                        <TabsContent value="file" className="space-y-4">
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <Label>Upload File</Label>
                              <div
                                {...getRootProps()}
                                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                              >
                                <input {...getInputProps()} />
                                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                {file ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-center space-x-3">
                                      <FileText className="w-8 h-8 text-blue-600" />
                                      <div className="text-left">
                                        <p className="text-lg font-medium">{file.name}</p>
                                        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                      }}
                                      className="text-sm text-red-600 hover:text-red-700 underline"
                                    >
                                      Remove file
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-lg font-medium mb-2">
                                      Drop your file here or click to browse
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Maximum file size: 5MB
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Supported: Images, PDFs, documents, archives, and more
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="expiry">Expires in</Label>
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
                            {expiry === 'custom' && (
                              <div className="space-y-2">
                                <Label htmlFor="custom-expiry">Custom expiry (minutes)</Label>
                                <Input
                                  id="custom-expiry"
                                  type="number"
                                  placeholder="Enter minutes (1-10080)"
                                  value={customExpiry}
                                  onChange={(e) => setCustomExpiry(e.target.value)}
                                  min="1"
                                  max="10080"
                                  required
                                />
                              </div>
                            )}
                            {error && (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                              </Alert>
                            )}
                            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white dark:text-gray-900 shadow-md" disabled={isLoading || !file}>
                              {isLoading ? (
                                <>
                                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <Shield className="w-4 h-4 mr-2" />
                                  Create Secret
                                </>
                              )}
                            </Button>
                          </form>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl font-bold mb-6">
                Why choose <span className="text-primary">Blink</span>?
              </h2>
              <p className="text-xl text-muted-foreground">
                Built with security and privacy in mind, Blink offers the most secure way to share sensitive information.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">End-to-End Encryption</h3>
                <p className="text-muted-foreground">
                  Your data is encrypted client-side before transmission. We never see your secrets.
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">One-Time View</h3>
                <p className="text-muted-foreground">
                  Secrets disappear after being viewed once, ensuring maximum security.
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Anonymous Sharing</h3>
                <p className="text-muted-foreground">
                  No account required for basic sharing. Complete anonymity guaranteed.
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Auto-Expiry</h3>
                <p className="text-muted-foreground">
                  Set custom expiry times from 15 minutes to 1 week. Secrets auto-delete.
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">File & Text Support</h3>
                <p className="text-muted-foreground">
                  Share any type of file or text message securely with password protection.
                </p>
              </Card>

              <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Global Access</h3>
                <p className="text-muted-foreground">
                  Access your secrets from anywhere in the world with our global infrastructure.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">10K+</div>
                  <div className="text-muted-foreground">Secrets Shared</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
                  <div className="text-muted-foreground">Uptime</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">256-bit</div>
                  <div className="text-muted-foreground">Encryption</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">0</div>
                  <div className="text-muted-foreground">Data Breaches</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-6">Perfect for every use case</h2>
                <p className="text-xl text-muted-foreground">
                  From personal secrets to business communications, Blink has you covered.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Personal</h3>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Share passwords with family</li>
                    <li>• Send sensitive documents</li>
                    <li>• Private messages</li>
                    <li>• Personal photos</li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                      <Laptop className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Business</h3>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Share API keys securely</li>
                    <li>• Send confidential reports</li>
                    <li>• Legal documents</li>
                    <li>• Financial data</li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                      <Server className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Development</h3>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Database credentials</li>
                    <li>• Configuration files</li>
                    <li>• Debug information</li>
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Developer API Section */}
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-blue-500/5">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
                  <Code className="w-4 h-4" />
                  <span>Developer Tools</span>
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                  Build with our{' '}
                  <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    Developer API
                  </span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Integrate Blink's secure secret sharing into your applications with our powerful REST API. 
                  Perfect for developers, DevOps teams, and enterprise applications.
                </p>
              </div>

              {/* API Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">4</div>
                  <div className="text-sm text-muted-foreground">REST Endpoints</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">256-bit</div>
                  <div className="text-sm text-muted-foreground">AES Encryption</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
                  <div className="text-sm text-muted-foreground">API Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">&lt;100ms</div>
                  <div className="text-sm text-muted-foreground">Response Time</div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                {/* Features */}
                <div className="lg:col-span-1 space-y-6">
                  <Card className="border-2 border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Zap className="w-6 h-6 text-primary" />
                        Why Choose Our API?
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">Enterprise Security</h4>
                            <p className="text-sm text-muted-foreground">
                              Military-grade encryption with zero-knowledge architecture
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Key className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">Simple Authentication</h4>
                            <p className="text-sm text-muted-foreground">
                              API key-based auth with granular permissions
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Terminal className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">Developer Friendly</h4>
                            <p className="text-sm text-muted-foreground">
                              RESTful design with comprehensive documentation
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Clock className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">Lightning Fast</h4>
                            <p className="text-sm text-muted-foreground">
                              Sub-100ms response times with global CDN
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Code Examples */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-2 border-blue-200 dark:border-blue-800">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                          <Code className="w-5 h-5" />
                          Quick Start Examples
                        </CardTitle>
                        <Badge variant="outline" className="text-xs w-fit">Copy & Paste Ready</Badge>
                      </div>
                      <CardDescription className="text-sm sm:text-base">
                        Get started in minutes with these copy-paste examples
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6">
                      {/* JavaScript Example */}
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium ml-2">JavaScript/Node.js</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyCodeToClipboard(`// Create a text secret
const response = await fetch('https://your-app.vercel.app/api/secrets', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'text',
    content: 'My secret message',
    expiry_minutes: 60
  })
});

const secret = await response.json();
console.log('Secret URL:', secret.view_url);`, 'js-example')}
                            className="h-8 px-3 w-fit"
                          >
                            {copiedCode === 'js-example' ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                          <pre className="text-sm">
{`// Create a text secret
const response = await fetch('https://your-app.vercel.app/api/secrets', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'text',
    content: 'My secret message',
    expiry_minutes: 60
  })
});

const secret = await response.json();
console.log('Secret URL:', secret.view_url);`}
                          </pre>
                        </div>
                      </div>

                      {/* Python Example */}
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium ml-2">Python</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyCodeToClipboard(`import requests

# Create a file secret
response = requests.post(
    'https://your-app.vercel.app/api/secrets',
    headers={'x-api-key': 'your-api-key'},
    json={
        'type': 'file',
        'file': {
            'name': 'config.json',
            'data': 'base64_encoded_content',
            'size': 1024
        },
        'expiry_minutes': 30
    }
)

secret = response.json()
print(f"Secret URL: {secret['view_url']}")`, 'python-example')}
                            className="h-8 px-3 w-fit"
                          >
                            {copiedCode === 'python-example' ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                          <pre className="text-sm">
{`import requests

# Create a file secret
response = requests.post(
    'https://your-app.vercel.app/api/secrets',
    headers={'x-api-key': 'your-api-key'},
    json={
        'type': 'file',
        'file': {
            'name': 'config.json',
            'data': 'base64_encoded_content',
            'size': 1024
        },
        'expiry_minutes': 30
    }
)

secret = response.json()
print(f"Secret URL: {secret['view_url']}")`}
                          </pre>
                        </div>
                      </div>

                      {/* cURL Example */}
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium ml-2">cURL</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyCodeToClipboard(`# List all secrets
curl -X GET https://your-app.vercel.app/api/secrets \\
  -H "x-api-key: your-api-key" \\
  -H "Accept: application/json"`, 'curl-example')}
                            className="h-8 px-3 w-fit"
                          >
                            {copiedCode === 'curl-example' ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                          <pre className="text-sm">
{`# List all secrets
curl -X GET https://your-app.vercel.app/api/secrets \\
  -H "x-api-key: your-api-key" \\
  -H "Accept: application/json"`}
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* API Endpoints */}
              <div className="mb-16">
                <h3 className="text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8">API Endpoints</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 w-fit">POST</Badge>
                        <code className="text-xs sm:text-sm font-mono break-all">/api/secrets</code>
                      </div>
                      <h4 className="font-semibold mb-2 text-sm sm:text-base">Create Secret</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        Create a new text or file secret with custom expiry
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <strong>Body:</strong> type, content/file, expiry_minutes, password (optional)
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 w-fit">GET</Badge>
                        <code className="text-xs sm:text-sm font-mono break-all">/api/secrets</code>
                      </div>
                      <h4 className="font-semibold mb-2 text-sm sm:text-base">List Secrets</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        Retrieve all secrets created with your API key
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <strong>Returns:</strong> Array of secret metadata
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 w-fit">GET</Badge>
                        <code className="text-xs sm:text-sm font-mono break-all">/api/secrets/:id</code>
                      </div>
                      <h4 className="font-semibold mb-2 text-sm sm:text-base">Get Secret</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        Retrieve and decrypt a specific secret by ID
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <strong>Returns:</strong> Decrypted secret content
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 w-fit">DELETE</Badge>
                        <code className="text-xs sm:text-sm font-mono break-all">/api/secrets/:id</code>
                      </div>
                      <h4 className="font-semibold mb-2 text-sm sm:text-base">Delete Secret</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        Permanently delete a secret and its data
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <strong>Returns:</strong> Success confirmation
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* CTA Section */}
              <div className="text-center">
                <Card className="max-w-4xl mx-auto border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-blue-500/5">
                  <CardContent className="pt-8 pb-8 sm:pt-12 sm:pb-12 px-4 sm:px-6">
                    <div className="space-y-4 sm:space-y-6">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Code className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold">Ready to Start Building?</h3>
                      <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                        Join thousands of developers who trust Blink for secure secret sharing. 
                        Get your API key and start integrating in minutes.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                        {isSignedIn ? (
                          <Button
                            size="lg"
                            className="text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6"
                            onClick={() => navigate('/dashboard/api')}
                          >
                            <Key className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            Get Your API Key
                          </Button>
                        ) : (
                          <SignInButton mode="modal">
                            <Button
                              size="lg"
                              className="text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6"
                            >
                              <Key className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                              Get Your API Key
                            </Button>
                          </SignInButton>
                        )}
                        <Button
                          variant="outline"
                          size="lg"
                          className="text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6"
                          onClick={() => navigate('/api-docs')}
                        >
                          <Code className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          View Full Documentation
                        </Button>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground pt-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Free to start</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>No credit card required</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>24/7 support</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
