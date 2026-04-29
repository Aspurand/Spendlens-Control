import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

interface State<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Fetch a Supabase table once on mount. Loose typing on purpose — each
 *  caller asserts the row shape it expects. Pagination caps at 5000 rows
 *  so the heavy `transactions` table doesn't accidentally pull the full
 *  history into memory; bump per call when a screen needs more.
 *
 *  Auto-refetches when the auth session changes (sign-in / sign-out)
 *  because RLS on the linked Supabase project filters per-user — without
 *  this, post-OAuth the screens would stay stuck on the empty result set
 *  fetched before the session existed. Call the returned `refetch()`
 *  after a write to re-pull the table on demand. */
export function useTable<T>(
  table: string,
  opts: {
    select?: string;
    orderBy?: string;
    ascending?: boolean;
    limit?: number;
  } = {},
): State<T> {
  const { select = '*', orderBy, ascending = false, limit = 5000 } = opts;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  // Bump tick whenever the auth state changes so RLS-filtered rows re-pull.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setTick(t => t + 1);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = supabase.from(table).select(select).limit(limit);
      if (orderBy) q = q.order(orderBy, { ascending });
      const { data, error } = await q;
      if (cancelled) return;
      if (error) { setData([]); setError(error.message); }
      else      { setData((data ?? []) as T[]); setError(null); }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [table, select, orderBy, ascending, limit, tick]);

  return { data, loading, error, refetch };
}
