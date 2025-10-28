import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SecretViewer from '../components/SecretViewer';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';

export function SecretViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [encryptionKey, setEncryptionKey] = useState<string>('');

  useEffect(() => {
    // Extract encryption key from URL hash
    const hash = window.location.hash.substring(1); // Remove the # symbol
    if (hash) {
      setEncryptionKey(decodeURIComponent(hash));
    }
  }, []);

  if (!id) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Secret Not Found</h1>
            <p className="text-muted-foreground mb-4">The secret you're looking for doesn't exist.</p>
            <button 
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Go Home
            </button>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <SecretViewer secretId={id} encryptionKey={encryptionKey} />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
