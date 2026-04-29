import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { money, num, fmtMonth, pct } from '@/lib/format';
import { Card, Transaction, CardBalance, Budget, categoryIcon, categoryLabel } from '@/lib/types';
import { TransactionModal } from '@/components/modals/TransactionModal';
import { useUserId } from '@/lib/auth';

/** Build a month key (YYYY-MM) in Pacific time so it lines up with how
 *  the phone app groups transactions. */
function monthKey(d: Date): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', timeZone: 'America/Los_Angeles',
  }).formatToParts(d);
  const y = f.find(p => p.type === 'year')!.value;
  const m = f.find(p => p.type === 'month')!.value;
  return `${y}-${m}`;
}

function txMonthKey(tx: Transaction): string {
  return monthKey(new Date(tx.tx_date));
}

export default function Dashboard() {
  const cards     = useTable<Card>('cards', { orderBy: 'created_at', ascending: true });
  const txs       = useTable<Transaction>('transactions', { orderBy: 'tx_date', ascending: false, limit: 5000 });
  const balances  = useTable<CardBalance>('card_balances');
  const budgets   = useTable<Budget>('budgets');

  const userId = useUserId();
  const [showAdd, setShowAdd] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());
  const cursorKey = monthKey(cursor);
  const cursorLabel = fmtMonth(cursor);

  const monthTxs = useMemo(
    () => txs.data.filter(t => txMonthKey(t) === cursorKey),
    [txs.data, cursorKey],
  );

  const total = monthTxs.reduce((s, t) => s + num(t.amount), 0);
  const overall = budgets.data.find(b => b.key === 'overall');
  const overallBudget = overall ? num(overall.amount) : 0;
  const ringPct = overallBudget > 0 ? pct(total, overallBudget) : 0;

  // Top categories this month
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of monthTxs) m.set(t.category, (m.get(t.category) ?? 0) + num(t.amount));
    return [...m.entries()]
      .map(([id, amount]) => ({ id, amount, share: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTxs, total]);

  // 6-month trend
  const trend = useMemo(() => {
    const out: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(cursor);
      d.setMonth(d.getMonth() - i);
      const key = monthKey(d);
      const sum = txs.data
        .filter(t => txMonthKey(t) === key)
        .reduce((s, t) => s + num(t.amount), 0);
      out.push({
        key,
        label: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'America/Los_Angeles' }).format(d),
        total: sum,
      });
    }
    return out;
  }, [cursor, txs.data]);
  const trendMax = Math.max(1, ...trend.map(t => t.total));

  // Card balances keyed by card id
  const balanceByCard = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of balances.data) m.set(b.card_id, num(b.balance));
    return m;
  }, [balances.data]);

  // Latest 8 transactions
  const latest = txs.data.slice(0, 8);

  function shiftMonth(delta: number) {
    setCursor(d => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  }

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards.data) m.set(c.id, c);
    return m;
  }, [cards.data]);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Overview</div>
          <h1>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
          <span className="pill">{cursorLabel}</span>
          <button className="btn btn-ghost" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
          <button className="btn" onClick={() => setCursor(new Date())}>Today</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} disabled={!userId}>+ Transaction</button>
        </div>
      </div>

      <TransactionModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => { txs.refetch(); }}
        cards={cards.data}
      />

      <div className="content">
        {/* HERO */}
        <div className="card card-hero" style={{ marginBottom: 20 }}>
          <Ring percent={ringPct} />
          <div style={{ flex: 1 }}>
            <div className="hero-label">{cursorLabel} · Spent</div>
            <div className="hero-amount">{money(total)}</div>
            <div className="hero-sub">
              {monthTxs.length} transactions
              {overallBudget > 0 && (
                <> · budget {money(overallBudget, { cents: false })} ({ringPct.toFixed(0)}%)</>
              )}
            </div>
            {byCategory.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {byCategory.slice(0, 3).map(c => (
                  <span key={c.id} className="pill" style={{ background: 'rgba(255,249,245,0.08)', borderColor: 'transparent', color: 'rgba(255,249,245,0.85)' }}>
                    {categoryIcon(c.id)} {categoryLabel(c.id)} · {money(c.amount, { cents: false })}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TREND */}
        <div className="section-title">6-Month Trend</div>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, alignItems: 'end', height: 160 }}>
            {trend.map(t => (
              <div key={t.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${(t.total / trendMax) * 100}%`,
                      background: t.key === cursorKey ? 'var(--accent)' : 'var(--accent-soft)',
                      borderRadius: '6px 6px 0 0',
                      minHeight: 2,
                    }}
                    title={money(t.total)}
                  />
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
                  {t.label.toUpperCase()}
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--text)' }}>{money(t.total, { cents: false })}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CARDS */}
        <div className="section-title">Cards</div>
        {cards.loading ? <Loading /> : cards.data.length === 0 ? (
          <div className="empty-row">No cards yet — add one in Settings.</div>
        ) : (
          <div className="h-scroll">
            {cards.data.map(c => (
              <div key={c.id} className="card-chip" style={c.color ? { background: c.color } : undefined}>
                <div className="chip-issuer">{c.issuer.replace(/-/g, ' ')}</div>
                <div className="chip-name">{c.name}</div>
                <div className="chip-last4">•••• {c.last4}</div>
                <div className="chip-balance">{money(balanceByCard.get(c.id) ?? 0, { cents: false })}</div>
              </div>
            ))}
          </div>
        )}

        {/* TOP CATEGORIES */}
        <div className="section-title">Top Categories</div>
        {byCategory.length === 0 ? (
          <div className="empty-row">No spend recorded for {cursorLabel}.</div>
        ) : (
          <div className="grid-3">
            {byCategory.slice(0, 6).map(c => (
              <div key={c.id} className="card card-tight">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="stat-label">{categoryIcon(c.id)} {categoryLabel(c.id)}</div>
                  <span className="pill">{c.share.toFixed(0)}%</span>
                </div>
                <div className="stat-value">{money(c.amount)}</div>
                <div className="progress" style={{ marginTop: 10 }}>
                  <div className="progress-fill" style={{ width: `${c.share}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LATEST */}
        <div className="section-title">Latest Transactions</div>
        <div className="card" style={{ padding: 0 }}>
          {txs.loading ? <Loading /> : latest.length === 0 ? (
            <div className="empty-row">No transactions yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Card</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {latest.map(t => {
                  const c = t.card_id ? cardById.get(t.card_id) : undefined;
                  return (
                    <tr key={t.id}>
                      <td className="mono">{t.tx_date}</td>
                      <td>{t.merchant}</td>
                      <td>{categoryIcon(t.category)} {categoryLabel(t.category)}</td>
                      <td>{c ? `${c.name} •••• ${c.last4}` : '—'}</td>
                      <td className="num">{money(t.amount)}</td>
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

function Ring({ percent }: { percent: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = c - (Math.min(100, percent) / 100) * c;
  return (
    <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
      <svg viewBox="0 0 132 132" width="132" height="132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,249,245,0.12)" strokeWidth="11" />
        <circle
          cx="66" cy="66" r={r} fill="none"
          stroke="var(--accent)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={dash}
          transform="rotate(-90 66 66)"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,249,245,0.55)', fontFamily: 'var(--font-mono)' }}>
          SPENT
        </div>
        <div style={{ font: '600 22px/1 var(--font-serif)', color: '#fff', marginTop: 4 }}>
          {percent.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="empty-row"><span className="spinner" />Loading…</div>
  );
}
