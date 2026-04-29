import { supabase } from './supabase';

/** Stamp the current user_id and insert a row. Returns the inserted row.
 *  Throws on RLS / network errors so callers can show a form error and
 *  keep the modal open. */
export async function insertRow<T extends Record<string, unknown>>(
  table: string,
  userId: string,
  values: T,
): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .insert({ user_id: userId, ...values })
    .select()
    .single();
  if (error) throw error;
  return data as T;
}

/** Upsert a row by composite key — needed for `budgets` (user_id+key) and
 *  `card_balances` (user_id+card_id) where the phone app uses the same
 *  conflict targets. */
export async function upsertRow<T extends Record<string, unknown>>(
  table: string,
  userId: string,
  values: T,
  onConflict: string,
): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .upsert({ user_id: userId, ...values }, { onConflict })
    .select()
    .single();
  if (error) throw error;
  return data as T;
}

export async function updateRow<T>(
  table: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as T;
}

export async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

/** A reasonable UUID v4 generator that doesn't depend on `crypto.randomUUID`
 *  being available (older Edge versions, older WebKit). */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Today's date in YYYY-MM-DD using Pacific time, matching the phone app. */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(new Date());
}
