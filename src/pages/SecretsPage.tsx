import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Eye, 
  Trash2, 
  Clock, 
  FileText, 
  Upload, 
  Search,
  Copy,
  ExternalLink
} from 'lucide-react';
import { getUserSecrets, deleteSecret } from '@/lib/supabase';
import { useStore } from '@/lib/store';

export function SecretsPage() {
  const { userId } = useAuth();
  const { userSecrets, setUserSecrets, setSecretsLoading, blinkUserId } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text' | 'file'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (userId) {
      loadUserSecrets();
    }
  }, [userId]);

  const loadUserSecrets = async () => {
    if (!userId || !blinkUserId) return;
    
    setSecretsLoading(true);
    try {
      const { secrets, error } = await getUserSecrets(blinkUserId);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isExpired = (expiryTime: string) => {
    return new Date(expiryTime) < new Date();
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

  const copySecretUrl = async (secretId: string) => {
    const url = `${window.location.origin}/view/${secretId}`;
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openSecretUrl = (secretId: string) => {
    const url = `${window.location.origin}/view/${secretId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Secrets</h1>
        <p className="text-muted-foreground">
          Manage and monitor your shared secrets
        </p>
      </div>

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
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">All Types</option>
                <option value="text">Text</option>
                <option value="file">Files</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="views-desc">Most Views</option>
                <option value="views-asc">Least Views</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secrets List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Secrets ({filteredSecrets.length})</CardTitle>
          <CardDescription>
            Click on actions to manage your secrets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userSecrets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No secrets found</h3>
              <p className="mb-4">You haven't created any secrets yet.</p>
              <Button onClick={() => window.location.href = '/'}>
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
            <div className="space-y-4">
              {filteredSecrets.map((secret) => (
                <div
                  key={secret.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {secret.type === 'text' ? (
                      <FileText className="w-8 h-8 text-blue-500" />
                    ) : (
                      <Upload className="w-8 h-8 text-green-500" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">
                        {secret.type === 'text' ? 'Text Secret' : secret.file_name}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Created: {formatDate(secret.created_at)}</div>
                        <div>Expires: {formatDate(secret.expiry_time)}</div>
                        {secret.file_size && (
                          <div>Size: {formatFileSize(secret.file_size)}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={isExpired(secret.expiry_time) ? 'destructive' : 'secondary'}>
                        <Clock className="w-3 h-3 mr-1" />
                        {isExpired(secret.expiry_time) ? 'Expired' : 'Active'}
                      </Badge>
                      <Badge variant="outline">
                        {secret.view_count} view{secret.view_count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copySecretUrl(secret.id)}
                        title="Copy link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openSecretUrl(secret.id)}
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSecret(secret.id)}
                        className="text-destructive hover:text-destructive"
                        title="Delete secret"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
