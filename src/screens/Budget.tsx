import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { useUserId } from '@/lib/auth';
import { money, num, fmtMonth } from '@/lib/format';
import {
  Transaction, Subscription, Budget as BudgetRow, Card,
  CATEGORY_META, categoryLabel,
} from '@/lib/types';
import { PageTopbar } from '@/components/PageTopbar';
import { Icon } from '@/components/Icon';
import { Bar } from '@/components/Bar';
import { catColor, catIconName } from '@/components/cats';
import { BudgetModal } from '@/components/modals/BudgetModal';
import { SubscriptionModal } from '@/components/modals/SubscriptionModal';

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
  const userId = useUserId();
  const [showBudget, setShowBudget] = useState(false);
  const [showSub,    setShowSub]    = useState(false);

  const monthLabel = fmtMonth(new Date());
  const monthTxs = useMemo(() => txs.data.filter(t => isThisMonth(t.tx_date)), [txs.data]);
  const totalSpent = monthTxs.reduce((s, t) => s + num(t.amount), 0);

  const overall = budgets.data.find(b => b.key === 'overall');
  const overallLimit = overall ? num(overall.amount) : 0;
  const overallPct = overallLimit > 0 ? (totalSpent / overallLimit) * 100 : 0;

  const catBudgets = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of budgets.data) {
      if (b.key.startsWith('cat:')) m.set(b.key.slice(4), num(b.amount));
    }
    return m;
  }, [budgets.data]);

  const spentByCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of monthTxs) m.set(t.category, (m.get(t.category) ?? 0) + num(t.amount));
    return m;
  }, [monthTxs]);

  const catRows = useMemo(() => {
    const ids = new Set<string>([...catBudgets.keys(), ...spentByCategory.keys()]);
    return [...ids].map(id => {
      const limit = catBudgets.get(id) ?? 0;
      const spent = spentByCategory.get(id) ?? 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      return { id, limit, spent, pct, over: pct > 100 };
    }).sort((a, b) => b.spent - a.spent);
  }, [catBudgets, spentByCategory]);

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

  const totalCatBudget = [...catBudgets.values()].reduce((s, v) => s + v, 0);

  return (
    <>
      <PageTopbar
        eyebrow="Spending"
        title="Budget & Subscriptions"
        sub="Where your money lives."
        right={
          <>
            <button className="btn" onClick={() => setShowSub(true)} disabled={!userId}>
              <Icon name="plus" size={14} /> Subscription
            </button>
            <button className="btn primary" onClick={() => setShowBudget(true)} disabled={!userId}>
              <Icon name="plus" size={14} /> New budget
            </button>
          </>
        }
      />

      <BudgetModal open={showBudget} onClose={() => setShowBudget(false)}
                   onSaved={() => { budgets.refetch(); }} />
      <SubscriptionModal open={showSub} onClose={() => setShowSub(false)}
                         onSaved={() => { subs.refetch(); }} cards={cards.data} />

      <div className="content page-fade">
        <div className="row gap-16">
          <div className="card grow">
            <div className="card-title">Total budget</div>
            <div className="row between" style={{ marginTop: 6, alignItems: 'flex-end' }}>
              <div className="num" style={{ fontSize: 32, fontWeight: 600 }}>
                {money(totalSpent)}
                {(overallLimit || totalCatBudget) > 0 && (
                  <span className="muted" style={{ fontSize: 16, fontWeight: 500 }}>
                    {' '}of {money(overallLimit || totalCatBudget, { cents: false })}
                  </span>
                )}
              </div>
              {(overallLimit || totalCatBudget) > 0 && (
                <div className="chip">{Math.round(overallPct || (totalSpent / totalCatBudget) * 100)}% used</div>
              )}
            </div>
            {(overallLimit || totalCatBudget) > 0 && (
              <div style={{ marginTop: 12 }}>
                <Bar pct={overallPct || (totalSpent / totalCatBudget) * 100} tone="gold" />
              </div>
            )}
          </div>
          <div className="card grow">
            <div className="card-title">Subscriptions</div>
            <div className="num" style={{ fontSize: 32, fontWeight: 600, marginTop: 6 }}>
              {money(monthlySubCost)}
              <span className="muted" style={{ fontSize: 16, fontWeight: 500 }}>/mo</span>
            </div>
            <div className="muted small" style={{ marginTop: 8 }}>
              {subs.data.filter(s => s.active).length} active · {money(monthlySubCost * 12)} per year
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">By category · {monthLabel}</div>
          </div>
          {catRows.length === 0 ? (
            <div className="empty" style={{ padding: 18 }}>No spend or budgets yet for {monthLabel}.</div>
          ) : (
            <div className="col gap-16" style={{ marginTop: 8 }}>
              {catRows.map(r => (
                <div key={r.id}>
                  <div className="row between center" style={{ marginBottom: 8 }}>
                    <div className="row center gap-12">
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: catColor(r.id) + '22', color: catColor(r.id), display: 'grid', placeItems: 'center' }}>
                        <Icon name={catIconName(r.id)} size={16} />
                      </div>
                      <div>
                        <div className="bold">{categoryLabel(r.id)}</div>
                        <div className="muted tiny">
                          {money(r.spent)}{r.limit > 0 && <> of {money(r.limit, { cents: false })}{r.over && <> · {money(r.spent - r.limit)} over</>}</>}
                        </div>
                      </div>
                    </div>
                    <div className="num bold" style={{ color: r.over ? 'var(--raspberry-300)' : 'inherit' }}>
                      {r.limit > 0 ? `${Math.round(r.pct)}%` : '—'}
                    </div>
                  </div>
                  {r.limit > 0 && <Bar pct={r.pct} tone={r.over ? 'warn' : 'gold'} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Subscriptions</div>
            <button className="btn sm" onClick={() => setShowSub(true)} disabled={!userId}>
              <Icon name="plus" size={12} /> Add
            </button>
          </div>
          {subs.loading ? <Loading /> : subs.data.length === 0 ? (
            <div className="empty">No subscriptions tracked.</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Service</th><th>Card</th><th>Cycle</th><th>Debit Day</th><th>Category</th><th className="right">Amount</th></tr></thead>
              <tbody>
                {subs.data.map(s => {
                  const c = s.card_id ? cardById.get(s.card_id) : undefined;
                  return (
                    <tr key={s.id}>
                      <td className="bold">{s.name}{!s.active && <span className="chip" style={{ marginLeft: 6, fontSize: 10 }}>Paused</span>}</td>
                      <td className="muted">{c ? c.name : '—'}</td>
                      <td><span className="chip">{s.cycle}</span></td>
                      <td className="mono">{s.debit_day ?? '—'}</td>
                      <td>{s.category && CATEGORY_META[s.category]
                        ? <span className="row center gap-8"><span className="cat-dot" style={{ background: catColor(s.category) }} />{categoryLabel(s.category)}</span>
                        : '—'}</td>
                      <td className="right num">{money(s.amount)}</td>
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

function Loading() {
  return <div className="empty"><span className="spinner" />Loading…</div>;
}
