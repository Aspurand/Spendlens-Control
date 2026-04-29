import { useMemo } from 'react';
import { useTable } from '@/lib/useTable';
import { money, num } from '@/lib/format';
import { Card, Transaction, CATEGORY_META, categoryIcon, categoryLabel } from '@/lib/types';

/** Reward-rate guesses by issuer keyed by category. The phone app keeps
 *  a much richer CARD_DATABASE; this is a pragmatic subset that lets us
 *  rank cards on Control until the schema gains a `cards.rewards` JSON
 *  column — at which point both clients should read it. */
const ISSUER_REWARDS: Record<string, Record<string, number>> = {
  amex:           { groceries: 4, food: 4, travel: 3, other: 1 },
  'capital-one':  { groceries: 3, food: 3, travel: 5, other: 1.5 },
  'wells-fargo':  { food: 3, transport: 3, travel: 1, other: 1 },
  discover:       { food: 5, groceries: 5, other: 1 },
  chase:          { food: 3, groceries: 3, travel: 3, other: 1 },
  citi:           { food: 4, travel: 4, other: 1 },
  usbank:         { food: 4, transport: 4, other: 1 },
  bofa:           { food: 3, travel: 2, other: 1 },
  other:          { other: 1 },
};

function rewardRate(card: Card, category: string): number {
  const rates = ISSUER_REWARDS[card.issuer] ?? ISSUER_REWARDS.other;
  return rates[category] ?? rates.other ?? 1;
}

function bestCardFor(cards: Card[], category: string): { card: Card; rate: number } | null {
  if (cards.length === 0) return null;
  let best: { card: Card; rate: number } | null = null;
  for (const c of cards) {
    if (c.card_type !== 'credit') continue;
    const rate = rewardRate(c, category);
    if (!best || rate > best.rate) best = { card: c, rate };
  }
  return best;
}

export default function Optimizer() {
  const cards = useTable<Card>('cards', { orderBy: 'created_at' });
  const txs   = useTable<Transaction>('transactions', { orderBy: 'tx_date', ascending: false, limit: 5000 });

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards.data) m.set(c.id, c);
    return m;
  }, [cards.data]);

  // Spend per category (last 90 days)
  const recentByCategory = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const m = new Map<string, number>();
    for (const t of txs.data) {
      if (new Date(t.tx_date) < cutoff) continue;
      m.set(t.category, (m.get(t.category) ?? 0) + num(t.amount));
    }
    return m;
  }, [txs.data]);

  // For each category, recommend the best card + estimate missed cashback
  const recommendations = useMemo(() => {
    const cats = [...recentByCategory.keys()].sort(
      (a, b) => (recentByCategory.get(b) ?? 0) - (recentByCategory.get(a) ?? 0),
    );
    return cats.map(cat => {
      const spend = recentByCategory.get(cat) ?? 0;
      const best = bestCardFor(cards.data, cat);
      // What was actually used? Pick the most-used card in this category
      const usage = new Map<string, number>();
      for (const t of txs.data) {
        if (t.category !== cat || !t.card_id) continue;
        usage.set(t.card_id, (usage.get(t.card_id) ?? 0) + num(t.amount));
      }
      const usedId = [...usage.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const used = usedId ? cardById.get(usedId) : undefined;
      const usedRate = used ? rewardRate(used, cat) : 1;
      const bestRate = best?.rate ?? 1;
      const lost = best && used && best.card.id !== used.id
        ? (spend * (bestRate - usedRate)) / 100
        : 0;
      return { cat, spend, best, used, usedRate, bestRate, lost };
    });
  }, [recentByCategory, cards.data, txs.data, cardById]);

  const totalLost = recommendations.reduce((s, r) => s + r.lost, 0);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Spending</div>
          <h1>Card Optimizer</h1>
        </div>
      </div>

      <div className="content">
        <div className="grid-3">
          <Stat label="Cards Active"    value={String(cards.data.filter(c => c.card_type === 'credit').length)} />
          <Stat label="Categories Used" value={String(recentByCategory.size)} sub="Last 90 days" />
          <Stat
            label="Cashback Left on Table"
            value={money(totalLost)}
            sub="If you'd swiped the optimal card"
            tone="amber"
          />
        </div>

        <div className="section-title">Best Card per Category</div>
        <div className="card" style={{ padding: 0 }}>
          {cards.loading ? <Loading /> : recommendations.length === 0 ? (
            <div className="empty-row">Not enough recent spend to recommend.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Best Card</th>
                  <th>Currently Using</th>
                  <th className="num">90-Day Spend</th>
                  <th className="num">Δ Rate</th>
                  <th className="num">Cashback Lost</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map(r => {
                  const same = r.best && r.used && r.best.card.id === r.used.id;
                  return (
                    <tr key={r.cat}>
                      <td>{categoryIcon(r.cat)} {categoryLabel(r.cat)}</td>
                      <td>
                        {r.best ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{r.best.card.name}</div>
                            <div className="mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>•••• {r.best.card.last4} · {r.best.rate}%</div>
                          </>
                        ) : '—'}
                      </td>
                      <td>
                        {r.used ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{r.used.name}</div>
                            <div className="mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>•••• {r.used.last4} · {r.usedRate}%</div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="num">{money(r.spend, { cents: false })}</td>
                      <td className="num">
                        {same ? <span className="pill green">Match</span> : (
                          <span className="pill">+{(r.bestRate - r.usedRate).toFixed(1)}%</span>
                        )}
                      </td>
                      <td className="num">{r.lost > 0 ? money(r.lost) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="section-title">Reward Rate Matrix</div>
        <div className="card" style={{ padding: 0 }}>
          {cards.data.length === 0 ? (
            <div className="empty-row">No cards yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Card</th>
                  {Object.keys(CATEGORY_META).map(cat => (
                    <th key={cat} className="num">{categoryIcon(cat)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cards.data.filter(c => c.card_type === 'credit').map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div className="mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>•••• {c.last4}</div>
                    </td>
                    {Object.keys(CATEGORY_META).map(cat => {
                      const r = rewardRate(c, cat);
                      const tone = r >= 4 ? 'green' : r >= 2 ? 'amber' : '';
                      return (
                        <td key={cat} className="num">
                          <span className={`pill ${tone}`}>{r}%</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'amber' | 'red' | 'green' }) {
  const color = tone === 'green' ? 'var(--green)'
              : tone === 'red'   ? 'var(--red)'
              : tone === 'amber' ? 'var(--amber)'
              : undefined;
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function Loading() {
  return <div className="empty-row"><span className="spinner" />Loading…</div>;
}
