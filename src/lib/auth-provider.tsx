import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useStore } from './store';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk publishable key');
}

function AuthStateManager() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { setAuthenticated } = useStore();

  useEffect(() => {
    setAuthenticated(!!isSignedIn, user);
  }, [isSignedIn, user, setAuthenticated]);

  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AuthStateManager />
      {children}
    </ClerkProvider>
  );
}
