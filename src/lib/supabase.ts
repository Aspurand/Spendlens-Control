import { createClient } from '@supabase/supabase-js';

/** Same Supabase project the SpendLens phone app points at. If you
 *  rotate keys, update the phone app's `index.html` in lockstep so both
 *  clients stay aligned. The anon key is safe for client-side use; RLS
 *  policies in the database enforce per-user row access. */
export const SUPABASE_URL = 'https://pqkdsznxffwrbibkiape.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxa2Rzem54ZmZ3cmJpYmtpYXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MzMyNjcsImV4cCI6MjA5MjMwOTI2N30.R7oaJIR0Xg4AhmvDp41H9emTyZGxSKt0AFenueb88L4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 2 } },
  auth: { persistSession: true },
});

/** Paginate past the db-max-rows cap (default 1000) so a full table loads
 *  without silent truncation. Cap is 50 pages = 50 k rows; tune up if a
 *  particular table outgrows that. */
export async function selectAllPaged<T>(
  table: string,
  select = '*',
  order = 'created_at',
  pageSize = 1000,
  maxPages = 50,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(order)
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < pageSize) break;
  }
  return rows;
}
