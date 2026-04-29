import { useEffect, useState } from 'react';
import { supabase } from './supabase';

interface State<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

/** Fetch a Supabase table once on mount. Loose typing on purpose — each
 *  caller asserts the row shape it expects. Pagination caps at 5000 rows
 *  so the heavy `transactions` table doesn't accidentally pull the full
 *  history into memory; bump per call when a screen needs more. */
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
  const [state, setState] = useState<State<T>>({ data: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let q = supabase.from(table).select(select).limit(limit);
      if (orderBy) q = q.order(orderBy, { ascending });
      const { data, error } = await q;
      if (cancelled) return;
      if (error) setState({ data: [], loading: false, error: error.message });
      else setState({ data: (data ?? []) as T[], loading: false, error: null });
    })();
    return () => { cancelled = true; };
  }, [table, select, orderBy, ascending, limit]);

  return state;
}
