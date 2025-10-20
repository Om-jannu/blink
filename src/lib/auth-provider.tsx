import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useStore } from './store';
import { getBlinkUserByClerkId, upsertBlinkUser, upsertUserSubscription, getUserSubscription } from './supabase';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk publishable key');
}

function AuthStateManager() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { setAuthenticated, setBlinkUserId, setUserPlan, setSubscriptionStatus } = useStore();

  useEffect(() => {
    const syncUser = async () => {
      setAuthenticated(!!isSignedIn, user);
      if (isSignedIn && user?.id) {
        // Ensure blink_users row exists and capture UUID
        const up = await upsertBlinkUser(user.id);
        if (up.user?.id) {
          setBlinkUserId(up.user.id);
          // Fetch existing subscription details first
          const subscription = await getUserSubscription(up.user.id);
          if (subscription.subscription) {
            setUserPlan(subscription.subscription.plan);
            setSubscriptionStatus(subscription.subscription.status);
          } else {
            // Only create a free subscription if none exists
            await upsertUserSubscription({
              user_id: up.user.id,
              plan: 'free',
              status: 'active',
              current_period_end: undefined,
            });
            setUserPlan('free');
            setSubscriptionStatus('active');
          }
        } else {
          const ex = await getBlinkUserByClerkId(user.id);
          setBlinkUserId(ex.user?.id || null);
          if (ex.user?.id) {
            // Fetch existing subscription details first
            const subscription = await getUserSubscription(ex.user.id);
            if (subscription.subscription) {
              setUserPlan(subscription.subscription.plan);
              setSubscriptionStatus(subscription.subscription.status);
            } else {
              // Only create a free subscription if none exists
              await upsertUserSubscription({
                user_id: ex.user.id,
                plan: 'free',
                status: 'active',
                current_period_end: undefined,
              });
              setUserPlan('free');
              setSubscriptionStatus('active');
            }
          }
        }
      } else {
        setBlinkUserId(null);
        setUserPlan(null);
        setSubscriptionStatus(null);
      }
    };
    syncUser();
  }, [isSignedIn, user, setAuthenticated, setBlinkUserId]);

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
