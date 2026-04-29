import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

/** Wraps the app so any screen can read the current Supabase session.
 *  Mirrors the phone app's auth flow exactly (see Spendlens/index.html
 *  `signInWithGoogle`) so the OAuth handshake redirects through the
 *  same provider and lands the same user_id in `session.user.id`. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    // Always redirect to the app's base URL — never the current pathname.
    // Otherwise signing in from `/dashboard` (or any deep route) sends the
    // OAuth callback to a URL the user would also need to allowlist in
    // Supabase. BASE_URL is `/` in dev and `/Spendlens-Control/` in prod.
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'email profile',
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return <Ctx.Provider value={{ session, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}

/** Convenience: the current user_id, or null if signed out. */
export function useUserId(): string | null {
  return useAuth().session?.user.id ?? null;
}
