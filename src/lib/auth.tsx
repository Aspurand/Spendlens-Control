import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
  /** Google OAuth (kept as a fallback). */
  signIn: () => Promise<void>;
  /** Magic-link email sign-in. Returns `{ sent: true }` on success so
   *  the UI can show a "check your email" state. */
  signInWithEmail: (email: string) => Promise<{ sent: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

/** Wraps the app so any screen can read the current Supabase session.
 *  Mirrors the phone app's auth flow (signInWithOAuth, provider: google)
 *  so the same RLS-aligned user_id lands in `session.user.id`.
 *
 *  We disable Supabase's `detectSessionInUrl` and do the exchange
 *  ourselves: the auto-detect runs at `createClient` time (module load),
 *  which races React's boot. Any failure in that race is silently
 *  swallowed. Owning the flow here makes errors loud (set on `error`
 *  and rendered by the Sidebar) instead of leaving the user stuck on
 *  a "stuck signed-out" screen with no feedback. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const url = new URL(window.location.href);
      const code      = url.searchParams.get('code');
      const errCode   = url.searchParams.get('error') ?? url.searchParams.get('error_code');
      const errDesc   = url.searchParams.get('error_description');

      if (errCode) {
        setError(`OAuth error: ${errCode}${errDesc ? ' — ' + decodeURIComponent(errDesc) : ''}`);
      } else if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) setError('Sign-in failed: ' + error.message);
        } catch (e) {
          setError('Sign-in failed: ' + (e instanceof Error ? e.message : String(e)));
        }
      }

      // Strip OAuth params from the URL so a refresh doesn't replay.
      if (code || errCode) {
        url.searchParams.delete('code');
        url.searchParams.delete('error');
        url.searchParams.delete('error_code');
        url.searchParams.delete('error_description');
        url.searchParams.delete('state');
        url.hash = '';
        window.history.replaceState(null, '', url.toString());
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (cancelled) return;
      setSession(s);
      setLoading(false);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  async function signIn() {
    setError(null);
    // Always redirect to the app's base URL — never the current pathname.
    // BASE_URL is `/` in dev and `/Spendlens-Control/` in prod.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'email profile',
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) setError('Sign-in failed: ' + error.message);
  }

  async function signInWithEmail(email: string): Promise<{ sent: boolean; error?: string }> {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !/.+@.+\..+/.test(trimmed)) {
      const msg = 'Enter a valid email';
      setError(msg);
      return { sent: false, error: msg };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
        shouldCreateUser: true,
      },
    });
    if (error) {
      setError('Email sign-in failed: ' + error.message);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  }

  async function signOut() {
    setError(null);
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider value={{ session, loading, error, signIn, signInWithEmail, signOut }}>
      {children}
    </Ctx.Provider>
  );
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
