import { useMemo } from 'react';
import { useTable } from '@/lib/useTable';
import { money, num, pct, fmtMonth } from '@/lib/format';
import {
  Transaction, Subscription, Budget as BudgetRow, Card,
  CATEGORY_META, categoryIcon, categoryLabel,
} from '@/lib/types';

function isThisMonth(dateStr: string): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', timeZone: 'America/Los_Angeles',
  });
  return fmt.format(new Date(dateStr)) === fmt.format(new Date());
}

export default function BudgetScreen() {
  const txs     = useTable<Transaction>('transactions', { orderBy: 'tx_date', ascending: false, limit: 5000 });
  const subs    = useTable<Subscription>('subscriptions');
  const budgets = useTable<BudgetRow>('budgets');
  const cards   = useTable<Card>('cards');

  const monthLabel = fmtMonth(new Date());

  const monthTxs = useMemo(() => txs.data.filter(t => isThisMonth(t.tx_date)), [txs.data]);
  const totalSpent = monthTxs.reduce((s, t) => s + num(t.amount), 0);

  const overall = budgets.data.find(b => b.key === 'overall');
  const overallLimit = overall ? num(overall.amount) : 0;
  const overallPct = overallLimit > 0 ? pct(totalSpent, overallLimit) : 0;

  // Category budgets — keyed as `cat:<id>`
  const catBudgets = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of budgets.data) {
      if (b.key.startsWith('cat:')) map.set(b.key.slice(4), num(b.amount));
    }
    return map;
  }, [budgets.data]);

  const spentByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of monthTxs) m.set(t.category, (m.get(t.category) ?? 0) + num(t.amount));
    return m;
  }, [monthTxs]);

  // Build a category row for every category with either a budget or spend
  const catRows = useMemo(() => {
    const ids = new Set<string>([...catBudgets.keys(), ...spentByCategory.keys()]);
    return [...ids].map(id => {
      const limit = catBudgets.get(id) ?? 0;
      const spent = spentByCategory.get(id) ?? 0;
      const p = limit > 0 ? pct(spent, limit) : 0;
      return { id, limit, spent, pct: p };
    }).sort((a, b) => b.spent - a.spent);
  }, [catBudgets, spentByCategory]);

  // Subscriptions — monthly cost (yearly / 12)
  const monthlySubCost = useMemo(() =>
    subs.data
      .filter(s => s.active)
      .reduce((s, sub) => s + (sub.cycle === 'yearly' ? num(sub.amount) / 12 : num(sub.amount)), 0),
  [subs.data]);

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards.data) m.set(c.id, c);
    return m;
  }, [cards.data]);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Spending</div>
          <h1>Budget &amp; Subscriptions</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn">+ Set Budget</button>
          <button className="btn btn-primary">+ Subscription</button>
        </div>
      </div>

      <div className="content">
        {/* OVERALL */}
        <div className="card card-hero" style={{ marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div className="hero-label">Overall · {monthLabel}</div>
            <div className="hero-amount">{money(totalSpent)}</div>
            <div className="hero-sub">
              {overallLimit > 0 ? (
                <>of {money(overallLimit, { cents: false })} budgeted · <strong>{money(Math.max(0, overallLimit - totalSpent), { cents: false })}</strong> remaining</>
              ) : (
                <>No overall budget set</>
              )}
            </div>
            {overallLimit > 0 && (
              <div style={{ marginTop: 14, height: 8, background: 'rgba(255,249,245,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${overallPct}%`,
                    background: overallPct > 100 ? 'var(--red)' : 'var(--accent)',
                    borderRadius: 4,
                    transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* CATEGORY BUDGETS */}
        <div className="section-title">Category Budgets</div>
        {catRows.length === 0 ? (
          <div className="empty-row">No category spend or budgets yet for {monthLabel}.</div>
        ) : (
          <div className="grid-2">
            {catRows.map(r => (
              <div key={r.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stat-label">
                    {categoryIcon(r.id)} {categoryLabel(r.id)}
                  </div>
                  {r.limit > 0 && (
                    <span className={`pill ${r.pct > 100 ? 'red' : r.pct > 80 ? 'amber' : 'green'}`}>
                      {r.pct.toFixed(0)}%
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '10px 0 8px' }}>
                  <span className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{money(r.spent)}</span>
                  <span className="mono" style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                    {r.limit > 0 ? `of ${money(r.limit, { cents: false })}` : 'no budget'}
                  </span>
                </div>
                {r.limit > 0 && (
                  <div className="progress">
                    <div
                      className={`progress-fill ${r.pct > 100 ? 'red' : r.pct > 80 ? 'amber' : 'green'}`}
                      style={{ width: `${Math.min(100, r.pct)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* SUBSCRIPTIONS */}
        <div className="section-title">Subscriptions</div>
        <div className="grid-3" style={{ marginBottom: 16 }}>
          <Stat label="Monthly Cost"     value={money(monthlySubCost)}      tone="amber" />
          <Stat label="Active"           value={String(subs.data.filter(s => s.active).length)} />
          <Stat label="Yearly Total"     value={money(monthlySubCost * 12)} sub="Projected" />
        </div>
        <div className="card" style={{ padding: 0 }}>
          {subs.loading ? <Loading /> : subs.data.length === 0 ? (
            <div className="empty-row">No subscriptions tracked.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Card</th>
                  <th>Cycle</th>
                  <th>Category</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {subs.data.map(s => {
                  const card = s.card_id ? cardById.get(s.card_id) : undefined;
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        {!s.active && <span className="pill" style={{ marginTop: 4 }}>Paused</span>}
                      </td>
                      <td>{card ? `${card.name} •••• ${card.last4}` : '—'}</td>
                      <td><span className="pill">{s.cycle}</span></td>
                      <td>
                        {s.category && CATEGORY_META[s.category] ? (
                          <>{categoryIcon(s.category)} {categoryLabel(s.category)}</>
                        ) : '—'}
                      </td>
                      <td className="num">{money(s.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'green' | 'red' | 'amber' }) {
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
