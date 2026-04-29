/* Row shapes for the Supabase tables both apps share. Names mirror the
 * phone app's writes (see Spendlens/index.html `upsertChunked` calls).
 * Anything left as `string | null` is treated as opaque on the desktop
 * side until a screen needs to interpret it. */

export interface Card {
  id: string;
  user_id?: string;
  issuer: string;
  name: string;
  last4: string;
  color: string | null;
  card_type: 'credit' | 'debit' | 'bank' | string;
  credit_limit: number | null;
  pay_due_day: number | null;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id?: string;
  amount: number | string;
  merchant: string;
  category: string;
  card_id: string | null;
  tx_date: string;
  tx_time: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface Subscription {
  id: string;
  user_id?: string;
  name: string;
  amount: number | string;
  card_id: string | null;
  cycle: 'monthly' | 'yearly' | string;
  category: string | null;
  active: boolean;
  debit_day: number | null;
}

export interface CardPayment {
  id: string;
  user_id?: string;
  card_id: string;
  payment_date: string;
  amount: number | string;
  note: string | null;
}

export interface CardBalance {
  user_id?: string;
  card_id: string;
  balance: number | string;
  statement_balance: number | string | null;
  updated_at?: string;
}

export interface Budget {
  user_id?: string;
  key: string;
  amount: number | string;
}

export interface IncomeEntry {
  id: string;
  user_id?: string;
  amount: number | string;
  source: string;
  income_date: string;
  frequency: 'once' | 'monthly' | 'biweekly' | 'weekly' | string;
  note: string | null;
}

export interface SavingsGoal {
  id: string;
  user_id?: string;
  name: string;
  target_amount: number | string;
  saved_amount: number | string;
  target_date: string | null;
  created_at?: string;
}

export interface MerchantRule {
  user_id?: string;
  merchant_key: string;
  category: string;
}

export interface SyncHistoryRow {
  id?: string;
  user_id?: string;
  synced_at: string;
  source: string | null;
  imported_count: number | null;
  status: string | null;
}

export interface UserPreferences {
  user_id: string;
  theme?: string | null;
  nightly_sync?: boolean | null;
  [k: string]: unknown;
}

export const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  groceries:     { label: 'Groceries',      icon: '🛒' },
  food:          { label: 'Food & Dining',  icon: '🍽️' },
  transport:     { label: 'Transport',      icon: '🚗' },
  shopping:      { label: 'Shopping',       icon: '🛍️' },
  bills:         { label: 'Bills',          icon: '📄' },
  entertainment: { label: 'Entertainment',  icon: '🎬' },
  travel:        { label: 'Travel',         icon: '✈️' },
  health:        { label: 'Health',         icon: '🏥' },
  other:         { label: 'Other',          icon: '📦' },
};

export function categoryLabel(id: string | null | undefined): string {
  if (!id) return 'Uncategorized';
  return CATEGORY_META[id]?.label ?? id;
}

export function categoryIcon(id: string | null | undefined): string {
  if (!id) return '·';
  return CATEGORY_META[id]?.icon ?? '·';
}
