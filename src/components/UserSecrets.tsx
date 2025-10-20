import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Trash2, Clock, FileText, Upload } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getUserSecrets, deleteSecret } from '@/lib/supabase';

export function UserSecrets() {
  const { isSignedIn, userId } = useAuth();
  const { userSecrets, secretsLoading, setUserSecrets, setSecretsLoading, removeUserSecret } = useStore();

  useEffect(() => {
    if (isSignedIn && userId) {
      loadUserSecrets();
    }
  }, [isSignedIn, userId]);

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
        removeUserSecret(secretId);
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

  if (!isSignedIn) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Your Secrets
        </CardTitle>
        <CardDescription>
          Manage your shared secrets and view their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {secretsLoading ? (
          <div className="text-center py-4">Loading your secrets...</div>
        ) : userSecrets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No secrets created yet</p>
            <p className="text-sm">Create your first secret to see it here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {userSecrets.map((secret) => (
              <div
                key={secret.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {secret.type === 'text' ? (
                    <FileText className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Upload className="w-5 h-5 text-green-500" />
                  )}
                  <div>
                    <div className="font-medium">
                      {secret.type === 'text' ? 'Text Secret' : secret.file_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Created: {formatDate(secret.created_at)}
                      {secret.file_size && (
                        <span className="ml-2">
                          • {formatFileSize(secret.file_size)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={isExpired(secret.expiry_time) ? 'destructive' : 'secondary'}>
                    <Clock className="w-3 h-3 mr-1" />
                    {isExpired(secret.expiry_time) ? 'Expired' : 'Active'}
                  </Badge>
                  
                  <Badge variant="outline">
                    {secret.view_count} view{secret.view_count !== 1 ? 's' : ''}
                  </Badge>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSecret(secret.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
