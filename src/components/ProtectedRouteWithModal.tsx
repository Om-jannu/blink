import React from 'react';
import { useAuth, SignInButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, User } from 'lucide-react';

interface ProtectedRouteWithModalProps {
  children: React.ReactNode;
}

export function ProtectedRouteWithModal({ children }: ProtectedRouteWithModalProps) {
  const { isSignedIn, isLoaded } = useAuth();

  // Show loading state while auth is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is signed in, show the protected content
  if (isSignedIn) {
    return <>{children}</>;
  }

  // If user is not signed in, show login prompt with modal trigger
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Authentication Required</CardTitle>
          <CardDescription>
            You need to sign in to access this page. Please authenticate to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <SignInButton mode="modal">
              <Button size="lg" className="w-full">
                <User className="w-5 h-5 mr-2" />
                Sign In to Continue
              </Button>
            </SignInButton>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p>Don't have an account? Sign in to create one.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
