import { useMemo } from 'react';
import { useTable } from '@/lib/useTable';
import { money, num } from '@/lib/format';
import { Card, Transaction, categoryLabel } from '@/lib/types';
import { PageTopbar } from '@/components/PageTopbar';
import { Icon } from '@/components/Icon';
import { CardMini } from '@/components/CardMini';
import { catIconName } from '@/components/cats';

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

export default function Optimizer() {
  const cards = useTable<Card>('cards', { orderBy: 'created_at' });
  const txs   = useTable<Transaction>('transactions', { orderBy: 'tx_date', ascending: false, limit: 5000 });

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards.data) m.set(c.id, c);
    return m;
  }, [cards.data]);

  // 90-day spend per category
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

  const recommendations = useMemo(() => {
    const cats = [...recentByCategory.keys()].sort(
      (a, b) => (recentByCategory.get(b) ?? 0) - (recentByCategory.get(a) ?? 0),
    );
    return cats.map(cat => {
      const spend = recentByCategory.get(cat) ?? 0;
      let best: { card: Card; rate: number } | null = null;
      for (const c of cards.data) {
        if (c.card_type !== 'credit') continue;
        const rate = rewardRate(c, cat);
        if (!best || rate > best.rate) best = { card: c, rate };
      }
      // Card actually used most for this category
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
      <PageTopbar
        eyebrow="Spending"
        title="Card Optimizer"
        sub="Use the right card. Earn more without thinking."
      />

      <div className="content page-fade">
        <div className="grid-12">
          <div className="col-span-5">
            <div className="card gold" style={{ minHeight: 240 }}>
              <div className="card-title">You could've earned</div>
              <div style={{ font: '600 64px/1 var(--font-sans)', letterSpacing: '-0.03em', marginTop: 12 }}>
                {money(totalLost)}
              </div>
              <div style={{ marginTop: 8 }}>
                more in the last 90 days by using the right card every time.
              </div>
              <button className="btn primary" style={{ marginTop: 24 }} disabled>
                Set rules <Icon name="arrowRight" size={14} />
              </button>
            </div>
          </div>
          <div className="col-span-7">
            <div className="card">
              <div className="card-title">Recommended cards by category</div>
              {recommendations.length === 0 ? (
                <div className="empty" style={{ padding: 18, marginTop: 14 }}>Not enough recent spend to recommend.</div>
              ) : (
                <div className="col gap-12" style={{ marginTop: 14 }}>
                  {recommendations.map(r => (
                    <div key={r.cat} className="row between center" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="row gap-12 center">
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-alt)', display: 'grid', placeItems: 'center' }}>
                          <Icon name={catIconName(r.cat)} size={16} />
                        </div>
                        <div>
                          <div className="bold">{categoryLabel(r.cat)}</div>
                          <div className="muted tiny">
                            {r.best
                              ? <>Use <b style={{ color: 'var(--fg-primary)' }}>{r.best.card.name}</b> · {r.best.rate}%</>
                              : 'No credit cards configured'}
                          </div>
                        </div>
                      </div>
                      {r.lost > 0
                        ? <span className="chip warn">Missed {money(r.lost)}</span>
                        : <span className="chip good"><Icon name="check" size={10} /> Optimized</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Your cards</div>
          </div>
          {cards.data.filter(c => c.card_type === 'credit').length === 0 ? (
            <div className="empty">No credit cards yet.</div>
          ) : (
            <div className="grid-12" style={{ marginTop: 8 }}>
              {cards.data.filter(c => c.card_type === 'credit').map(c => (
                <div key={c.id} className="col-span-4">
                  <div className="card flat cream">
                    <CardMini card={c} />
                    <div className="col gap-8" style={{ marginTop: 14 }}>
                      <RewardRow card={c} cat="food" label="Dining" />
                      <RewardRow card={c} cat="groceries" label="Groceries" />
                      <RewardRow card={c} cat="transport" label="Transport" />
                      <RewardRow card={c} cat="travel" label="Travel" />
                      <RewardRow card={c} cat="other" label="Everything else" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RewardRow({ card, cat, label }: { card: Card; cat: string; label: string }) {
  const r = rewardRate(card, cat);
  return (
    <div className="row between small">
      <span className="muted">{label}</span>
      <span className="bold">{r}×</span>
    </div>
  );
}
