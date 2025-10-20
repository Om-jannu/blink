import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Shield,
  FileText,
  Upload,
  Lock,
  Copy,
  Check,
  Eye,
  AlertCircle,
  ExternalLink,
  Trash2,
  Search,
  Clock,
  RotateCw
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { encryptText, encryptFile, decryptText, decryptFile } from '@/lib/encryption';
import { createSecret, getUserSecrets, deleteSecret, cleanupExpiredSecrets, expireSecretNow, getUserSubscription } from '@/lib/supabase';
import { validateFileName } from '@/lib/validation';
import { useDropzone } from 'react-dropzone';

export function MySecretsPage() {
  const { userId } = useAuth();
  const { activeTab, setActiveTab } = useStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create secret state
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('0.25');
  const [customExpiry, setCustomExpiry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [secretUrl, setSecretUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ type: 'text' | 'file'; title: string; body?: string; fileUrl?: string } | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Manage secrets state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'file'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { userSecrets, setUserSecrets, setSecretsLoading } = useStore();
  const [objectUrls, setObjectUrls] = useState<string[]>([]);
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const maxFileSizeBytes = plan === 'pro' ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB vs 5MB

  useEffect(() => {
    return () => {
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [objectUrls]);

  const expiryOptions = [
    { value: '0.25', label: '15 minutes' },
    { value: '1', label: '1 hour' },
    { value: '6', label: '6 hours' },
    { value: '24', label: '1 day' },
    { value: '168', label: '1 week' },
    { value: 'custom', label: 'Custom' },
  ];

  useEffect(() => {
    if (userId) {
      loadUserSecrets();
    }
  }, [userId]);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!userId) return;
      const { subscription } = await getUserSubscription(userId);
      setPlan(subscription?.plan || 'free');
    };
    fetchPlan();
  }, [userId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const loadUserSecrets = async () => {
    if (!userId) return;

    setSecretsLoading(true);
    try {
      const { secrets, error } = await getUserSecrets(userId);
      if (error) {
        console.error('Failed to load user secrets:', error);
        return;
      }
      setUserSecrets(secrets || []);
    } catch (error) {
      console.error('Failed to load user secrets:', error);
    } finally {
      setSecretsLoading(false);
    }
  };

  const handleDeleteSecret = async (secretId: string) => {
    try {
      const { success, error } = await deleteSecret(secretId);
      if (success) {
        setUserSecrets(userSecrets.filter(s => s.id !== secretId));
      } else {
        console.error('Failed to delete secret:', error);
      }
    } catch (error) {
      console.error('Failed to delete secret:', error);
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

        // Enforce plan-based file size limit
        if (file.size > maxFileSizeBytes) {
          setError(plan === 'pro' ? 'File too large. Max 50MB for Pro.' : 'File too large. Max 5MB for Free users.');
          return;
        }

        setFile(file);
        setError(''); // Clear any previous errors
      }
    },
    maxFiles: 1,
    maxSize: maxFileSizeBytes,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiryTime: string) => {
    return new Date(expiryTime) < new Date();
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
          setError('Please enter a valid custom expiry time in minutes');
          return;
        }
        // Convert minutes to hours
        expiryHours = parseFloat(customExpiry) / 60;
      } else {
        expiryHours = parseFloat(expiry);
      }

      // Plan-based default expiry override for authenticated users
      if (userId) {
        if (plan === 'free') {
          // 1 month from now
          const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
          expiryHours = oneMonthMs / (60 * 60 * 1000);
        } else {
          // Pro: effectively long-lived (e.g., 5 years)
          const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;
          expiryHours = fiveYearsMs / (60 * 60 * 1000);
        }
      }

      let encrypted: string;
      let key: string;
      let secretData: any;

      if (activeTab === 'text') {
        const result = encryptText(text, password || undefined);
        encrypted = result.encrypted;
        key = result.key;
        // Enforce free/pro text count limits
        const textCount = userSecrets.filter((s) => s.type === 'text').length;
        if (plan === 'free' && textCount >= 20) {
          setError('Free plan limit reached: 20 text secrets');
          return;
        }
        secretData = {
          type: 'text',
          encrypted_content: encrypted,
          expiry_time: new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString(),
          password_hash: password ? btoa(password) : undefined,
          encryption_salt: key,
          owner_id: userId || undefined
        };
      } else {
        const result = await encryptFile(file!, password || undefined);
        encrypted = result.encrypted;
        key = result.key;
        // Enforce free/pro file count limits
        const fileCount = userSecrets.filter((s) => s.type === 'file').length;
        if (plan === 'free' && fileCount >= 5) {
          setError('Free plan limit reached: 5 file secrets');
          return;
        }
        secretData = {
          type: 'file',
          encrypted_content: encrypted,
          file_name: file!.name,
          file_size: file!.size,
          expiry_time: new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString(),
          password_hash: password ? btoa(password) : undefined,
          encryption_salt: key,
          owner_id: userId || undefined
        };
      }

      // Enforce total limits for free plan
      const totalCount = userSecrets.length;
      if (plan === 'free' && totalCount >= 25) {
        setError('Free plan limit reached: 25 total secrets');
        return;
      }

      const { id, error: dbError } = await createSecret(secretData);

      if (dbError) throw new Error(dbError);

      const secretUrl = `${window.location.origin}/view/${id}#${encodeURIComponent(key)}`;
      setSecretUrl(secretUrl);
      resetForm();

      // Reload user secrets to show the new one
      await loadUserSecrets();
      // Close the modal automatically after successful creation
      setIsCreateOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create secret');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSecrets = userSecrets
    .filter(secret => {
      const matchesSearch = secret.type === 'text'
        ? 'Text Secret'.toLowerCase().includes(searchTerm.toLowerCase())
        : secret.file_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === 'all' || secret.type === filterType;
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && !isExpired(secret.expiry_time)) ||
        (filterStatus === 'expired' && isExpired(secret.expiry_time));

      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'views':
          comparison = a.view_count - b.view_count;
          break;
        case 'name':
          const nameA = a.type === 'text' ? 'Text Secret' : a.file_name || '';
          const nameB = b.type === 'text' ? 'Text Secret' : b.file_name || '';
          comparison = nameA.localeCompare(nameB);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSecrets.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paginatedSecrets = filteredSecrets.slice(start, end);

  const copySecretUrl = async (secretId: string, key?: string) => {
    const url = key
      ? `${window.location.origin}/view/${secretId}#${encodeURIComponent(key)}`
      : `${window.location.origin}/view/${secretId}`;
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // openSecretUrl removed as per requirement

  const getMimeFromName = (name?: string): string => {
    if (!name) return 'application/octet-stream';
    const lower = name.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.txt')) return 'text/plain';
    return 'application/octet-stream';
  };

  const handlePreview = async (secret: any) => {
    try {
      if (secret.type === 'text') {
        const result = decryptText(secret.encrypted_content, secret.encryption_salt);
        setPreviewContent({ type: 'text', title: 'Text Secret', body: result.success ? result.decrypted : '[Decryption failed]' });
        setPreviewOpen(true);
      } else {
        const file = await decryptFile(secret.encrypted_content, secret.encryption_salt, secret.file_name || 'file');
        if (file) {
          const mime = getMimeFromName(file.name);
          const blob = new Blob([await file.arrayBuffer()], { type: mime });
          const url = URL.createObjectURL(blob);
          setObjectUrls((prev) => [...prev, url]);
          setPreviewContent({ type: 'file', title: file.name, fileUrl: url });
        } else {
          setPreviewContent({ type: 'file', title: secret.file_name || 'File Secret', fileUrl: undefined });
        }
        setPreviewOpen(true);
      }
    } catch (e) {
      console.error('Preview failed', e);
      setPreviewContent({ type: secret.type, title: isFile(secret) ? (secret.file_name || 'File Secret') : 'Text Secret', body: '[Decryption failed]' });
      setPreviewOpen(true);
    }
  };

  const isFile = (s: any) => s.type === 'file';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Secrets</h1>
        <p className="text-muted-foreground">
          Create new secrets and manage your existing ones
        </p>
      </div>

      {/* Create Secret Section - Modal Trigger */}
      <div className="flex items-center justify-between">
        <div />
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Shield className="w-4 h-4 mr-2" /> New Secret
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Secret</DialogTitle>
              <DialogDescription>
                Share a secure message or file that will self-destruct after viewing
              </DialogDescription>
            </DialogHeader>
            {/* Success Screen */}
            {secretUrl ? (
              <Card className="border-0 shadow-none">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl">Secret Created Successfully!</CardTitle>
                  <CardDescription>
                    Your encrypted {activeTab === 'text' ? 'message' : 'file'} is ready to share.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Share this link:</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-muted p-2 rounded border truncate" title={secretUrl}>
                        {secretUrl}
                      </code>
                      <Button onClick={copyToClipboard} variant="outline" size="sm">
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button onClick={() => { resetForm(); setIsCreateOpen(false); }} variant="outline">
                      Close
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
                      <Textarea id="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter your secret message here..." className="min-h-[120px]" required />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="password">Password (Optional)</Label>
                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Add password protection" />
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
                        <Input id="custom-expiry" type="number" min="1" max="10080" step="1" value={customExpiry} onChange={(e) => setCustomExpiry(e.target.value)} placeholder="Enter minutes (e.g., 15, 60, 120)" />
                      </div>
                    )}
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isLoading || !text.trim()}>
                        {isLoading ? (<><Lock className="w-4 h-4 mr-2 animate-spin" />Creating...</>) : (<><Shield className="w-4 h-4 mr-2" />Create Secret</>)}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
                <TabsContent value="file" className="space-y-4 mt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Upload File</Label>
                      <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}>
                        <input {...getInputProps()} />
                        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        {file ? (
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium">{isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to select'}</p>
                            <p className="text-sm text-muted-foreground">Maximum file size: 10MB</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="file-password">Password (Optional)</Label>
                        <Input id="file-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Add password protection" />
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
                        <Input id="file-custom-expiry" type="number" min="1" max="10080" step="1" value={customExpiry} onChange={(e) => setCustomExpiry(e.target.value)} placeholder="Enter minutes (e.g., 15, 60, 120)" />
                      </div>
                    )}
                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={isLoading || !file}>
                        {isLoading ? (<><Lock className="w-4 h-4 mr-2 animate-spin" />Creating...</>) : (<><Shield className="w-4 h-4 mr-2" />Create Secret</>)}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {/* Command Palette */}
      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => { setIsCommandOpen(false); setIsCreateOpen(true); }}>
              <Shield className="w-4 h-4 mr-2" /> New Secret
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Search">
            <CommandItem onSelect={() => { setIsCommandOpen(false); const el = document.querySelector<HTMLInputElement>('#my-secrets-search'); el?.focus(); }}>
              <Search className="w-4 h-4 mr-2" /> Focus search
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Manage Secrets Section */}
      <div className="space-y-6">
    {/* Filters and Search */}
    <Card>
      <CardHeader>
        <CardTitle>Filters & Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search secrets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                id="my-secrets-search"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="file">Files</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => { const [f, o] = v.split('-'); setSortBy(f as any); setSortOrder(o as any); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="views-desc">Most Views</SelectItem>
                <SelectItem value="views-asc">Least Views</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterStatus('all'); setSortBy('date'); setSortOrder('desc'); }}>Clear</Button>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Secrets List */}
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Secrets ({filteredSecrets.length})</CardTitle>
            <CardDescription>Click on actions to manage your secrets</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadUserSecrets}>
              <RotateCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {userSecrets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No secrets found</h3>
            <p className="mb-4">You haven't created any secrets yet.</p>
            <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Create Your First Secret
            </Button>
          </div>
        ) : filteredSecrets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No secrets match your filters</h3>
            <p>Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div>
          <div className="space-y-3">
            {paginatedSecrets.map((secret) => {
              const isFile = secret.type === 'file';
              const isLocked = Boolean(secret.password_hash);
              return (
                <div
                  key={secret.id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${isFile ? 'bg-green-100 dark:bg-green-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
                      {isFile ? (
                        <Upload className="w-5 h-5 text-green-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-medium truncate">
                          {isFile ? (secret.file_name || 'File Secret') : 'Text Secret'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span>Created: {formatDate(secret.created_at)}</span>
                        <span>Expires: {formatDate(secret.expiry_time)}</span>
                        {isFile && secret.file_size ? (
                          <span>Size: {formatFileSize(secret.file_size)}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                    {isLocked && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" /> Protected
                        </Badge>
                      )}
                      <Badge variant={isExpired(secret.expiry_time) ? 'destructive' : 'secondary'} className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {isExpired(secret.expiry_time) ? 'Expired' : 'Active'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {secret.view_count} view{secret.view_count !== 1 ? 's' : ''}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Actions</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copySecretUrl(secret.id, secret.encryption_salt)}>
                          <Copy className="w-4 h-4 mr-2" /> Copy link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePreview(secret)}>
                          <Eye className="w-4 h-4 mr-2" /> Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          const { success, error } = await expireSecretNow(secret.id);
                          if (success) {
                            await loadUserSecrets();
                          } else {
                            console.error('Expire failed', error);
                          }
                        }}>
                          <Clock className="w-4 h-4 mr-2" /> Expire Now
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteSecret(secret.id)} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
          </div>
        )}
      </CardContent>
    </Card>
      </div>
    {/* Preview Dialog */}
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{previewContent?.title || 'Preview'}</DialogTitle>
          <DialogDescription>
            Owner-only preview. Note: full decryption requires the original key embedded in the share URL.
          </DialogDescription>
        </DialogHeader>
        {previewContent?.type === 'text' && (
          <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded border">
            {previewContent.body ?? ''}
          </div>
        )}
        {previewContent?.type === 'file' && (
          previewContent.fileUrl ? (
            <div className="space-y-3">
              {previewContent.title.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewContent.fileUrl} className="w-full h-[60vh] border rounded" />
              ) : previewContent.title.match(/\.(png|jpe?g|gif|webp)$/i) ? (
                <img src={previewContent.fileUrl} alt={previewContent.title} className="max-h-[60vh] rounded border" />
              ) : (
                <div className="text-sm text-muted-foreground">Preview not supported. You can download the file below.</div>
              )}
              <div className="flex justify-end gap-2">
                <a href={previewContent.fileUrl} download={previewContent.title}>
                  <Button>Download</Button>
                </a>
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Unable to preview this file.</div>
          )
        )}
        
      </DialogContent>
    </Dialog>
    </div>
  );
}
