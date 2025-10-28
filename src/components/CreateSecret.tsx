import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  FileText, 
  Upload, 
  Lock, 
  Copy, 
  Check, 
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { encryptText, encryptFile } from '@/lib/encryption';
import { createSecret, cleanupExpiredSecrets } from '@/lib/supabase';
import { validateFileName } from '@/lib/validation';
import { useDropzone } from 'react-dropzone';

export function CreateSecret() {
  const { userId } = useAuth();
  const { activeTab, setActiveTab, userPlan } = useStore();
  
  // Form state
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiry, setExpiry] = useState('15');
  const [customExpiry, setCustomExpiry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [secretUrl, setSecretUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const expiryOptions = [
    { value: '15', label: '15 minutes' },
    { value: '1', label: '1 hour' },
    { value: '6', label: '6 hours' },
    { value: '24', label: '1 day' },
    { value: '168', label: '1 week' },
    { value: 'custom', label: 'Custom' },
  ];

  // Cleanup expired secrets on load
  useEffect(() => {
    const cleanup = async () => {
      try {
        await cleanupExpiredSecrets();
      } catch (error) {
        console.warn('Failed to cleanup expired secrets:', error);
      }
    };
    cleanup();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors.some(e => e.code === 'file-too-large')) {
          const maxSize = userPlan === 'pro' ? 50 : 5;
          setError(`File size exceeds ${maxSize}MB limit for ${userPlan === 'pro' ? 'Pro' : 'Free'} users.`);
          return;
        }
      }
      
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
    maxSize: userPlan === 'pro' ? 50 * 1024 * 1024 : 5 * 1024 * 1024, // 50MB (pro) vs 5MB (free)
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
    setExpiry('15');
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

    // Client-side validation: Free users cannot use passwords
    if (userPlan !== 'pro' && password.trim()) {
      setError('Password protection is only available for Pro users. Please upgrade to use this feature.');
      return;
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
            setError('Please enter a valid custom expiry time in minutes');
            return;
          }
          // Convert minutes to hours
          expiryHours = parseFloat(customExpiry) / 60;
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
          encryption_key_or_salt: key,
          owner_id: userId || undefined
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
          encryption_key_or_salt: key,
          owner_id: userId || undefined
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

  // Success screen
  if (secretUrl) {
    return (
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
    );
  }

  // Create secret form
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Create New Secret</CardTitle>
        <CardDescription className="text-center">
          Share a secure message or file that will self-destruct after viewing
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
                  <Label htmlFor="password">
                    {userPlan === 'pro' ? 'Password (Optional)' : 'Password Protection'}
                  </Label>
                  <div className={cn(
                    "relative",
                    userPlan !== 'pro' && "after:absolute after:inset-0 after:bg-gradient-to-r after:from-purple-500/20 after:via-pink-500/20 after:to-blue-500/20 after:rounded-md after:blur-sm"
                  )}>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={userPlan === 'pro' ? password : ''}
                      onChange={userPlan === 'pro' ? (e) => setPassword(e.target.value) : undefined}
                      disabled={userPlan !== 'pro'}
                      placeholder={userPlan === 'pro' ? 'Add password protection' : 'Pro feature - Upgrade to use passwords'}
                      className={cn(
                        "relative pr-10",
                        userPlan !== 'pro' && "bg-gray-100 dark:bg-gray-800 border-2 border-transparent bg-clip-padding"
                      )}
                    />
                    {userPlan === 'pro' && (
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
                    )}
                  </div>
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
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  {file ? (
                    <div className="flex items-center justify-center space-x-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">
                        {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to select'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Maximum file size: {userPlan === 'pro' ? '50MB' : '5MB'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="file-password">
                    {userPlan === 'pro' ? 'Password (Optional)' : 'Password Protection'}
                  </Label>
                  <div className={cn(
                    "relative",
                    userPlan !== 'pro' && "after:absolute after:inset-0 after:bg-gradient-to-r after:from-purple-500/20 after:via-pink-500/20 after:to-blue-500/20 after:rounded-md after:blur-sm"
                  )}>
                    <Input
                      id="file-password"
                      type={showPassword ? "text" : "password"}
                      value={userPlan === 'pro' ? password : ''}
                      onChange={userPlan === 'pro' ? (e) => setPassword(e.target.value) : undefined}
                      disabled={userPlan !== 'pro'}
                      placeholder={userPlan === 'pro' ? 'Add password protection' : 'Pro feature - Upgrade to use passwords'}
                      className={cn(
                        "relative pr-10",
                        userPlan !== 'pro' && "bg-gray-100 dark:bg-gray-800 border-2 border-transparent bg-clip-padding"
                      )}
                    />
                    {userPlan === 'pro' && (
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
                    )}
                  </div>
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
  );
}
