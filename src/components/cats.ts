import type { IconName } from './Icon';

/** Per-category color + icon. Keys mirror `CATEGORY_META` in lib/types
 *  but the values are visual-only — the source-of-truth labels still
 *  live there. Anything missing here falls back to the `Other` row. */
export const CAT_COLOR: Record<string, string> = {
  groceries:     '#5C8F4A',
  food:          '#C13A57',
  transport:     '#3F7D73',
  shopping:      '#8B5CF6',
  bills:         '#0D0A08',
  entertainment: '#9F7F38',
  travel:        '#E2855B',
  health:        '#C9A24C',
  other:         '#A9A197',
};

export const CAT_ICON: Record<string, IconName> = {
  groceries:     'cart',
  food:          'food',
  transport:     'car',
  shopping:      'cart',
  bills:         'bill',
  entertainment: 'music',
  travel:        'sparkles',
  health:        'health',
  other:         'receipt',
};

export function catColor(id: string | null | undefined): string {
  if (!id) return CAT_COLOR.other;
  return CAT_COLOR[id] ?? CAT_COLOR.other;
}

export function catIconName(id: string | null | undefined): IconName {
  if (!id) return 'receipt';
  return CAT_ICON[id] ?? 'receipt';
}
