import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff, 
  Shield,
  Code,
  ExternalLink
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { 
  createApiKey, 
  getUserApiKeys, 
  deleteApiKey, 
  toggleApiKeyStatus,
  type ApiKey,
  type CreateApiKeyData 
} from '@/lib/api-keys';
import { toast } from 'sonner';

export default function ApiPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState({
    read: true,
    write: true,
    delete: false,
  });
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [createdKey, setCreatedKey] = useState<any>(null);
  const [showCreatedKey, setShowCreatedKey] = useState(false);
  const { blinkUserId } = useStore();

  useEffect(() => {
    if (blinkUserId) {
      loadApiKeys();
    }
  }, [blinkUserId]);

  const loadApiKeys = async () => {
    if (!blinkUserId) return;
    
    setLoading(true);
    const { success, data, error } = await getUserApiKeys(blinkUserId);
    
    if (success && data) {
      setApiKeys(data);
    } else {
      toast.error(error || 'Failed to load API keys');
    }
    setLoading(false);
  };

  const handleCreateKey = async () => {
    if (!blinkUserId || !newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setIsCreating(true);
    const createData: CreateApiKeyData = {
      name: newKeyName.trim(),
      permissions: newKeyPermissions,
      expires_at: newKeyExpiry || undefined,
    };

    const { success, data, error } = await createApiKey(blinkUserId, createData);
    
    if (success && data) {
      setCreatedKey(data);
      setShowCreatedKey(true);
      setNewKeyName('');
      setNewKeyPermissions({ read: true, write: true, delete: false });
      setNewKeyExpiry('');
      await loadApiKeys();
      toast.success('API key created successfully');
    } else {
      toast.error(error || 'Failed to create API key');
    }
    setIsCreating(false);
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!blinkUserId) return;
    
    const { success, error } = await deleteApiKey(keyId, blinkUserId);
    
    if (success) {
      await loadApiKeys();
      toast.success('API key deleted successfully');
    } else {
      toast.error(error || 'Failed to delete API key');
    }
  };

  const handleToggleStatus = async (keyId: string) => {
    if (!blinkUserId) return;
    
    const { success, error } = await toggleApiKeyStatus(keyId, blinkUserId);
    
    if (success) {
      await loadApiKeys();
      toast.success('API key status updated');
    } else {
      toast.error(error || 'Failed to update API key status');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExpiryStatus = (expiresAt: string | null) => {
    if (!expiresAt) return { status: 'never', color: 'bg-muted' };
    
    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', color: 'bg-destructive/10 text-destructive' };
    if (daysUntilExpiry <= 7) return { status: 'expiring', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' };
    return { status: 'active', color: 'bg-green-500/10 text-green-600 dark:text-green-400' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Keys</h1>
            <p className="text-muted-foreground">Manage your API access keys</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">Manage your API access keys for programmatic access</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for programmatic access to your secrets.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="My API Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Permissions</Label>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">Read secrets</span>
                    </div>
                    <Switch
                      checked={newKeyPermissions.read}
                      onCheckedChange={(checked) => 
                        setNewKeyPermissions(prev => ({ ...prev, read: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4" />
                      <span className="text-sm">Create secrets</span>
                    </div>
                    <Switch
                      checked={newKeyPermissions.write}
                      onCheckedChange={(checked) => 
                        setNewKeyPermissions(prev => ({ ...prev, write: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Delete secrets</span>
                    </div>
                    <Switch
                      checked={newKeyPermissions.delete}
                      onCheckedChange={(checked) => 
                        setNewKeyPermissions(prev => ({ ...prev, delete: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="key-expiry">Expiry Date (Optional)</Label>
                <Input
                  id="key-expiry"
                  type="datetime-local"
                  value={newKeyExpiry}
                  onChange={(e) => setNewKeyExpiry(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleCreateKey} 
                disabled={isCreating || !newKeyName.trim()}
                className="w-full"
              >
                {isCreating ? 'Creating...' : 'Create API Key'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* API Documentation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Code className="w-5 h-5" />
            <span>API Documentation</span>
          </CardTitle>
          <CardDescription>
            Learn how to use your API keys to interact with Blink programmatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">GET</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">/api/secrets</code>
              <span className="text-sm text-muted-foreground">List all secrets</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">POST</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">/api/secrets</code>
              <span className="text-sm text-muted-foreground">Create a new secret</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">GET</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">/api/secrets/:id</code>
              <span className="text-sm text-muted-foreground">Get a specific secret</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">DELETE</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">/api/secrets/:id</code>
              <span className="text-sm text-muted-foreground">Delete a secret</span>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Full Documentation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
              <p className="text-muted-foreground mb-4">
                Create your first API key to start using the Blink API
              </p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => {
            const expiryStatus = getExpiryStatus(key.expires_at);
            return (
              <Card key={key.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{key.name}</h3>
                        <Badge 
                          variant={key.is_active ? "default" : "secondary"}
                          className={key.is_active ? "bg-green-500/10 text-green-600 dark:text-green-400" : ""}
                        >
                          {key.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className={expiryStatus.color}>
                          {expiryStatus.status === 'never' ? 'Never expires' : 
                           expiryStatus.status === 'expired' ? 'Expired' :
                           expiryStatus.status === 'expiring' ? 'Expires soon' : 'Active'}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Created {formatDate(key.created_at)}
                        {key.last_used_at && (
                          <span> • Last used {formatDate(key.last_used_at)}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Shield className="w-3 h-3" />
                          <span className={key.permissions.read ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                            Read
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Key className="w-3 h-3" />
                          <span className={key.permissions.write ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                            Write
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Trash2 className="w-3 h-3" />
                          <span className={key.permissions.delete ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                            Delete
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(key.id)}
                      >
                        {key.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {key.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteKey(key.id)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Created Key Modal */}
      <Dialog open={showCreatedKey} onOpenChange={setShowCreatedKey}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Your API key has been created. Copy it now as it won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>API Key</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  value={createdKey?.token || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdKey?.token || '')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                <strong>Important:</strong> This is the only time you'll see this API key. 
                Make sure to copy and store it securely.
              </p>
            </div>
            <Button onClick={() => setShowCreatedKey(false)} className="w-full">
              I've copied the key
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
