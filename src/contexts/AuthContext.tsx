import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth...');
    console.log('[AuthContext] Current URL:', window.location.href);
    console.log('[AuthContext] Has hash params:', window.location.hash.length > 0);

    // Check if this is an OAuth callback that failed (no tokens in URL)
    const isOAuthCallback = window.location.href.includes('my-inventory') &&
                           document.referrer.includes('google.com');

    if (isOAuthCallback && !window.location.hash.includes('access_token')) {
      console.log('[AuthContext] ⚠️ OAuth callback without tokens - login failed!');
      console.log('[AuthContext] Clearing any stale sessions...');
      // Clear any stale sessions
      supabase.auth.signOut().then(() => {
        setUser(null);
        setSession(null);
        setLoading(false);
      });
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[AuthContext] Initial session check completed:', {
        hasSession: !!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider
        } : null,
        error: error ? error.message : null
      });

      if (session) {
        console.log('[AuthContext] ✓ Session found! Setting user state...');
      } else {
        console.log('[AuthContext] ✗ No session found. User will see login form.');
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      console.error('[AuthContext] Error getting session:', err);
      setUser(null);
      setSession(null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] ════════════════════════════════');
      console.log('[AuthContext] Auth state change event fired!');
      console.log('[AuthContext] Event type:', event);
      console.log('[AuthContext] Has session:', !!session);
      console.log('[AuthContext] User:', session?.user ? {
        id: session.user.id,
        email: session.user.email,
        provider: session.user.app_metadata?.provider
      } : null);
      console.log('[AuthContext] ════════════════════════════════');

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('[AuthContext] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    // Use the EXACT current URL to handle Vercel preview deployments
    const currentUrl = window.location.origin;
    console.log('[AuthContext] Starting Google OAuth with redirectTo:', currentUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: currentUrl,
        // Skip confirmation for faster flow
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      console.error('[AuthContext] Google OAuth initiation error:', error);
    }

    return { error };
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out...');
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
    // Force a page reload to clear all state
    window.location.reload();
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
