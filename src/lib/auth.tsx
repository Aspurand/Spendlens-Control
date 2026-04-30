import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

/** Wraps the app so any screen can read the current Supabase session.
 *  Mirrors the phone app's auth flow (signInWithOAuth, provider: google)
 *  so the same RLS-aligned user_id lands in `session.user.id`.
 *
 *  We add an explicit `?code=` exchange on mount as a belt-and-braces
 *  fallback for the OAuth callback. Supabase's `detectSessionInUrl`
 *  default *should* handle this, but if it races the React boot or
 *  fails silently the session never lands and the user appears stuck
 *  signed-out after a successful Google flow. The explicit exchange
 *  makes the failure mode loud (sets `error`) instead of silent. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function consumeOAuthCallback() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const errCode = url.searchParams.get('error') || url.searchParams.get('error_code');
      const errDesc = url.searchParams.get('error_description');
      if (errCode) {
        setError(`${errCode}${errDesc ? ': ' + errDesc : ''}`);
      }
      if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) setError('Sign-in failed: ' + error.message);
        } catch (e) {
          // detectSessionInUrl may have already consumed the code — ignore
          if (e instanceof Error && /code/i.test(e.message)) { /* expected race */ }
          else setError('Sign-in failed: ' + (e instanceof Error ? e.message : String(e)));
        } finally {
          // Strip OAuth params from the URL so a refresh doesn't re-attempt.
          url.searchParams.delete('code');
          url.searchParams.delete('error');
          url.searchParams.delete('error_code');
          url.searchParams.delete('error_description');
          url.hash = '';
          window.history.replaceState(null, '', url.toString());
        }
      }
    }

    (async () => {
      await consumeOAuthCallback();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
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

  async function signOut() {
    setError(null);
    await supabase.auth.signOut();
  }

  return <Ctx.Provider value={{ session, loading, error, signIn, signOut }}>{children}</Ctx.Provider>;
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
