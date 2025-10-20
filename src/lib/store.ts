import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Secret } from './supabase';

interface UIState {
  // Authentication state
  isAuthenticated: boolean;
  user: any | null;
  blinkUserId: string | null; // UUID from blink_users
  
  // Subscription state
  userPlan: 'free' | 'pro' | null;
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  
  // UI state
  activeTab: 'text' | 'file';
  showUserSecrets: boolean;
  
  // User secrets
  userSecrets: Secret[];
  secretsLoading: boolean;
  
  // Actions
  setAuthenticated: (isAuthenticated: boolean, user?: any) => void;
  setBlinkUserId: (id: string | null) => void;
  setUserPlan: (plan: 'free' | 'pro' | null) => void;
  setSubscriptionStatus: (status: 'active' | 'canceled' | 'past_due' | 'trialing' | null) => void;
  setActiveTab: (tab: 'text' | 'file') => void;
  setShowUserSecrets: (show: boolean) => void;
  setUserSecrets: (secrets: Secret[]) => void;
  setSecretsLoading: (loading: boolean) => void;
  addUserSecret: (secret: Secret) => void;
  removeUserSecret: (secretId: string) => void;
  updateUserSecret: (secretId: string, updates: Partial<Secret>) => void;
}

export const useStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      isAuthenticated: false,
      user: null,
      blinkUserId: null,
      userPlan: null,
      subscriptionStatus: null,
      activeTab: 'text',
      showUserSecrets: false,
      userSecrets: [],
      secretsLoading: false,
      
      // Actions
      setAuthenticated: (isAuthenticated, user) => 
        set({ isAuthenticated, user }),

      setBlinkUserId: (blinkUserId) => set({ blinkUserId }),
      
      setUserPlan: (userPlan) => set({ userPlan }),
      
      setSubscriptionStatus: (subscriptionStatus) => set({ subscriptionStatus }),
      
      setActiveTab: (activeTab) => 
        set({ activeTab }),
      
      setShowUserSecrets: (showUserSecrets) => 
        set({ showUserSecrets }),
      
      setUserSecrets: (userSecrets) => 
        set({ userSecrets }),
      
      setSecretsLoading: (secretsLoading) => 
        set({ secretsLoading }),
      
      addUserSecret: (secret) => 
        set((state) => ({ 
          userSecrets: [...state.userSecrets, secret] 
        })),
      
      removeUserSecret: (secretId) => 
        set((state) => ({ 
          userSecrets: state.userSecrets.filter(s => s.id !== secretId) 
        })),
      
      updateUserSecret: (secretId, updates) => 
        set((state) => ({ 
          userSecrets: state.userSecrets.map(s => 
            s.id === secretId ? { ...s, ...updates } : s
          ) 
        })),
    }),
    {
      name: 'blink-store',
      partialize: (state) => ({ 
        activeTab: state.activeTab,
        showUserSecrets: state.showUserSecrets,
        blinkUserId: state.blinkUserId,
        userPlan: state.userPlan,
        subscriptionStatus: state.subscriptionStatus
      }),
    }
  )
);
