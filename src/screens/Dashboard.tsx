import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { useUserId, useAuth } from '@/lib/auth';
import { money, num, splitMoney, fmtMonth } from '@/lib/format';
import { Card, Transaction, CardBalance, Budget, IncomeEntry, Subscription, categoryLabel } from '@/lib/types';
import { PageTopbar } from '@/components/PageTopbar';
import { Icon } from '@/components/Icon';
import { Stat } from '@/components/Stat';
import { Bar } from '@/components/Bar';
import { Donut } from '@/components/Donut';
import { Sparkline } from '@/components/Sparkline';
import { CardMini } from '@/components/CardMini';
import { catColor, catIconName } from '@/components/cats';
import { TransactionModal } from '@/components/modals/TransactionModal';
import { PaymentModal } from '@/components/modals/PaymentModal';

type Variant = 'calm' | 'numbers' | 'cards';

function monthKey(d: Date): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', timeZone: 'America/Los_Angeles',
  }).formatToParts(d);
  return `${f.find(p => p.type === 'year')!.value}-${f.find(p => p.type === 'month')!.value}`;
}

export default function Dashboard() {
  const cards    = useTable<Card>('cards', { orderBy: 'created_at', ascending: true });
  const txs      = useTable<Transaction>('transactions', { orderBy: 'tx_date', ascending: false, limit: 5000 });
  const balances = useTable<CardBalance>('card_balances');
  const budgets  = useTable<Budget>('budgets');
  const income   = useTable<IncomeEntry>('income_entries', { orderBy: 'income_date', ascending: false });
  const subs     = useTable<Subscription>('subscriptions');

  const userId = useUserId();
  const { session } = useAuth();
  const firstName = ((session?.user.user_metadata as Record<string, unknown> | undefined)?.full_name as string | undefined)?.split(' ')[0]
                || ((session?.user.user_metadata as Record<string, unknown> | undefined)?.name as string | undefined)?.split(' ')[0]
                || session?.user.email?.split('@')[0]
                || 'there';

  const [variant, setVariant] = useState<Variant>('calm');
  const [showAdd, setShowAdd] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [tipOpen, setTipOpen] = useState(true);

  const now = useMemo(() => new Date(), []);
  const thisKey = monthKey(now);
  const thisMonthLabel = fmtMonth(now);

  // Aggregations
  const monthTxs = useMemo(
    () => txs.data.filter(t => monthKey(new Date(t.tx_date)) === thisKey),
    [txs.data, thisKey],
  );
  const spentThisMonth = monthTxs.reduce((s, t) => s + num(t.amount), 0);
  const incomeThisMonth = useMemo(
    () => income.data.filter(i => monthKey(new Date(i.income_date)) === thisKey)
                     .reduce((s, i) => s + num(i.amount), 0),
    [income.data, thisKey],
  );

  const overall = budgets.data.find(b => b.key === 'overall');
  const spentBudget = overall ? num(overall.amount) : 0;
  const spentPct = spentBudget > 0 ? Math.round((spentThisMonth / spentBudget) * 100) : 0;

  // Net worth: assets (debit/bank balances) − liabilities (credit balances)
  const balanceByCard = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of balances.data) m.set(b.card_id, num(b.balance));
    return m;
  }, [balances.data]);

  const { assets, debt } = useMemo(() => {
    let a = 0, d = 0;
    for (const c of cards.data) {
      const bal = balanceByCard.get(c.id) ?? 0;
      if (c.card_type === 'credit') d += bal;
      else a += bal;
    }
    return { assets: a, debt: d };
  }, [cards.data, balanceByCard]);
  const netWorth = assets - debt;
  const savedThisMonth = incomeThisMonth - spentThisMonth;

  // Spending by category for the donut + list
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of monthTxs) m.set(t.category, (m.get(t.category) ?? 0) + num(t.amount));
    return [...m.entries()]
      .map(([id, amount]) => ({ id, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTxs]);

  // 12-period sparkline of monthly totals
  const trend = useMemo(() => {
    const out: number[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = monthKey(d);
      const total = txs.data.filter(t => monthKey(new Date(t.tx_date)) === key)
                            .reduce((s, t) => s + num(t.amount), 0);
      out.push(total);
    }
    return out;
  }, [txs.data, now]);

  // "Coming up" in next 14 days — credit-card due dates + active subscription debit days
  const upcoming = useMemo(() => {
    const list: { date: string; label: string; amount: number; kind: 'card-bill' | 'subscription' | 'income' }[] = [];
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const horizon = 14;

    for (let i = 0; i < horizon; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const dom = d.getDate();
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      for (const c of cards.data) {
        if (c.card_type === 'credit' && c.pay_due_day === dom) {
          list.push({ date: label, label: c.name, amount: -(balanceByCard.get(c.id) ?? 0), kind: 'card-bill' });
        }
      }
      for (const s of subs.data) {
        if (s.active && s.debit_day === dom) {
          list.push({ date: label, label: s.name, amount: -num(s.amount), kind: 'subscription' });
        }
      }
    }
    return list.slice(0, 5);
  }, [cards.data, subs.data, balanceByCard, now]);

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards.data) m.set(c.id, c);
    return m;
  }, [cards.data]);

  return (
    <>
      <PageTopbar
        eyebrow="Overview"
        title={`Good afternoon, ${firstName}.`}
        sub="Live from Supabase"
        right={
          <div className="row gap-12 center">
            <div className="variant-row">
              <button className={'variant-btn' + (variant === 'calm' ? ' active' : '')} onClick={() => setVariant('calm')}>Calm</button>
              <button className={'variant-btn' + (variant === 'numbers' ? ' active' : '')} onClick={() => setVariant('numbers')}>Big numbers</button>
              <button className={'variant-btn' + (variant === 'cards' ? ' active' : '')} onClick={() => setVariant('cards')}>Cards</button>
            </div>
            <button className="btn primary" onClick={() => setShowAdd(true)} disabled={!userId}>
              <Icon name="plus" size={14} /> Add expense
            </button>
          </div>
        }
      />

      <TransactionModal open={showAdd} onClose={() => setShowAdd(false)}
                        onSaved={() => { txs.refetch(); }} cards={cards.data} />
      <PaymentModal open={showPay} onClose={() => setShowPay(false)}
                    onSaved={() => { /* no payments table on dashboard */ }} cards={cards.data} />

      <div className="content">
        {variant === 'calm' && (
          <div className="col gap-24 page-fade">
            {tipOpen && session && (
              <div className="tip">
                <Icon name="info" size={16} style={{ marginTop: 1 }} />
                <div>
                  <b>Welcome back, {firstName}.</b>{' '}
                  {savedThisMonth > 0
                    ? <>You're on track this month — saved <b>{money(savedThisMonth, { cents: false })}</b> so far.</>
                    : spentThisMonth > 0
                      ? <>Spent <b>{money(spentThisMonth, { cents: false })}</b> this month across {monthTxs.length} transactions.</>
                      : <>Nothing logged yet for {thisMonthLabel}. Add an expense to get started.</>}
                </div>
                <Icon name="x" size={14} className="tip-x" onClick={() => setTipOpen(false)} />
              </div>
            )}

            <div className="grid-12">
              <div className="col-span-6">
                <div className="card" style={{ minHeight: 200 }}>
                  <div className="row between center">
                    <div className="card-title">Net worth</div>
                    {netWorth > 0 && (
                      <span className="chip good"><Icon name="trend" size={12} /> Updated</span>
                    )}
                  </div>
                  <div className="row between" style={{ alignItems: 'flex-end', marginTop: 6 }}>
                    <Stat label="" value={netWorth} size="xl" />
                    <div style={{ width: 240, marginBottom: 6 }}>
                      <Sparkline data={trend} color="var(--accent-300)" fill="var(--accent-300)" height={70} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-3">
                <div className="card" style={{ minHeight: 200 }}>
                  <Stat label="Cash on hand" value={assets} size="lg" />
                  <div className="muted small" style={{ marginTop: 14 }}>
                    Across {cards.data.filter(c => c.card_type !== 'credit').length} accounts
                  </div>
                </div>
              </div>
              <div className="col-span-3">
                <div className="card ink" style={{ minHeight: 200 }}>
                  <Stat label="Money you owe" value={debt} size="lg" />
                  <div className="small" style={{ color: 'rgba(255,249,245,0.55)', marginTop: 14 }}>
                    Across {cards.data.filter(c => c.card_type === 'credit').length} cards
                  </div>
                </div>
              </div>
            </div>

            <div className="section-head">
              <div>
                <h2>Quick actions</h2>
                <div className="sub">One click to log, plan, or pay.</div>
              </div>
            </div>
            <div className="qa-row">
              <button className="qa" onClick={() => setShowAdd(true)} disabled={!userId}>
                <div className="qa-icon"><Icon name="plus" size={18} /></div>
                <div><div className="qa-label">Log expense</div><div className="qa-sub">Add a transaction</div></div>
              </button>
              <button className="qa" onClick={() => setShowPay(true)} disabled={!userId || cards.data.filter(c => c.card_type === 'credit').length === 0}>
                <div className="qa-icon"><Icon name="card" size={18} /></div>
                <div><div className="qa-label">Pay a card</div><div className="qa-sub">{cards.data.filter(c => c.card_type === 'credit').length} credit cards</div></div>
              </button>
              <button className="qa" onClick={() => { window.location.hash = '#/goals'; }}>
                <div className="qa-icon"><Icon name="target" size={18} /></div>
                <div><div className="qa-label">Move to savings</div><div className="qa-sub">{savedThisMonth > 0 ? money(savedThisMonth, { cents: false }) + ' unspent' : 'Plan ahead'}</div></div>
              </button>
              <button className="qa" onClick={() => window.location.reload()}>
                <div className="qa-icon"><Icon name="refresh" size={18} /></div>
                <div><div className="qa-label">Refresh data</div><div className="qa-sub">Pull latest from cloud</div></div>
              </button>
            </div>

            <div className="grid-12">
              <div className="col-span-7">
                <div className="card">
                  <div className="card-head">
                    <div className="card-title">{thisMonthLabel} spending</div>
                    <div className="chip">{monthTxs.length} txns</div>
                  </div>
                  <div className="row gap-24" style={{ alignItems: 'center' }}>
                    <div className="donut-wrap">
                      <Donut size={180} stroke={22} segments={byCategory.map(b => ({
                        value: b.amount, color: catColor(b.id),
                      }))} />
                      <div className="donut-center">
                        <div className="muted tiny" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Spent</div>
                        <div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{money(spentThisMonth, { cents: false })}</div>
                        {spentBudget > 0 && (
                          <div className="muted tiny">of {money(spentBudget, { cents: false })}</div>
                        )}
                      </div>
                    </div>
                    <div className="grow col gap-8">
                      {byCategory.length === 0 && <div className="empty" style={{ padding: 18 }}>Nothing logged yet for {thisMonthLabel}.</div>}
                      {byCategory.slice(0, 6).map(b => (
                        <div key={b.id} className="row between center">
                          <span className="row center gap-8" style={{ minWidth: 0 }}>
                            <span className="cat-dot" style={{ background: catColor(b.id) }} />
                            <span className="small">{categoryLabel(b.id)}</span>
                          </span>
                          <span className="num small">{money(b.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-5">
                <div className="card">
                  <div className="card-head">
                    <div className="card-title">Coming up · 14 days</div>
                  </div>
                  <div className="col gap-12">
                    {upcoming.length === 0 && <div className="empty" style={{ padding: 18 }}>Nothing scheduled.</div>}
                    {upcoming.map((u, i) => (
                      <div key={i} className="row between center">
                        <div className="row gap-12 center">
                          <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: u.kind === 'income' ? 'var(--green-100)' : u.kind === 'card-bill' ? 'var(--raspberry-100)' : 'var(--accent-100)',
                            color:      u.kind === 'income' ? 'var(--green-300)' : u.kind === 'card-bill' ? 'var(--raspberry-400)' : 'var(--accent-500)',
                            display: 'grid', placeItems: 'center',
                          }}>
                            <Icon name={u.kind === 'income' ? 'arrowDown' : u.kind === 'card-bill' ? 'card' : 'bill'} size={16} />
                          </div>
                          <div>
                            <div className="bold small">{u.label}</div>
                            <div className="muted tiny">{u.date} · {u.kind === 'income' ? 'Income' : u.kind === 'card-bill' ? 'Card bill' : 'Subscription'}</div>
                          </div>
                        </div>
                        <div className="num small" style={{ color: u.amount > 0 ? 'var(--green-300)' : 'var(--fg-primary)' }}>
                          {u.amount > 0 ? '+' : ''}{money(u.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-12">
                <div className="card">
                  <div className="card-head">
                    <div className="card-title">Recent activity</div>
                  </div>
                  {txs.loading ? <Loading /> : txs.data.length === 0 ? (
                    <div className="empty">No transactions yet.</div>
                  ) : (
                    <table className="tbl">
                      <thead>
                        <tr><th>Date</th><th>Merchant</th><th>Category</th><th>Card</th><th className="right">Amount</th></tr>
                      </thead>
                      <tbody>
                        {txs.data.slice(0, 8).map(t => {
                          const c = t.card_id ? cardById.get(t.card_id) : undefined;
                          return (
                            <tr key={t.id}>
                              <td className="muted">{new Date(t.tx_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })}</td>
                              <td className="bold">{t.merchant}</td>
                              <td>
                                <span className="row center gap-8">
                                  <span className="cat-dot" style={{ background: catColor(t.category) }} />
                                  {categoryLabel(t.category)}
                                </span>
                              </td>
                              <td className="muted">{c ? `${c.name}` : '—'}</td>
                              <td className="right num">{money(t.amount)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {variant === 'numbers' && (
          <div className="col gap-24 page-fade">
            <div className="card" style={{
              background: 'linear-gradient(135deg, var(--off-200) 0%, var(--accent-100) 100%)',
              border: 'none', padding: 48, minHeight: 280,
            }}>
              <div className="row between center" style={{ marginBottom: 24 }}>
                <div className="card-title">Where you stand · {thisMonthLabel}</div>
                {netWorth !== 0 && <span className="chip gold"><Icon name="trend" size={12} /> Live</span>}
              </div>
              <div style={{
                font: '600 120px/0.95 var(--font-sans)',
                letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums',
                color: 'var(--dark-900)',
              }}>
                {(() => { const m = splitMoney(netWorth); return <>{m.sign}{m.dollars}<span style={{ fontSize: 56, color: 'var(--fg-muted)', fontWeight: 500 }}>{m.cents}</span></>; })()}
              </div>
              <div className="muted" style={{ fontSize: 16, marginTop: 8, maxWidth: 540 }}>
                That's everything you own ({money(assets, { cents: false })}) minus what you owe ({money(debt, { cents: false })}).
              </div>
            </div>

            <div className="row gap-16">
              <div className="card grow"><Stat label="In your accounts" value={assets} size="lg" /></div>
              <div className="card grow"><Stat label="On your cards" value={-debt} size="lg" /></div>
              <div className="card grow"><Stat label="Saved this month" value={savedThisMonth} size="lg" /></div>
              <div className="card grow"><Stat label="Spent this month" value={-spentThisMonth} size="lg" /></div>
            </div>

            <div className="grid-12">
              <div className="col-span-8">
                <div className="card">
                  <div className="card-title">Spending vs. budget</div>
                  <div className="row between center" style={{ marginTop: 6 }}>
                    <div className="num" style={{ fontSize: 36, fontWeight: 600 }}>
                      {money(spentThisMonth)}
                      {spentBudget > 0 && <span className="muted small" style={{ fontWeight: 500 }}> of {money(spentBudget, { cents: false })}</span>}
                    </div>
                    {spentBudget > 0 && <div className="chip">{spentPct}% used</div>}
                  </div>
                  {spentBudget > 0 ? (
                    <div style={{ marginTop: 12 }}><Bar pct={spentPct} tone="gold" /></div>
                  ) : (
                    <div className="muted small" style={{ marginTop: 10 }}>No overall budget set — head to Budget to add one.</div>
                  )}
                </div>
              </div>
              <div className="col-span-4">
                <div className="card ink">
                  <div className="card-title">Trend · 12 months</div>
                  <div style={{ marginTop: 10, marginLeft: -8, marginRight: -8 }}>
                    <Sparkline data={trend} color="var(--accent-300)" fill="var(--accent-300)" height={80} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {variant === 'cards' && (
          <div className="col gap-24 page-fade">
            {cards.loading ? <Loading /> : cards.data.length === 0 ? (
              <div className="empty">No cards yet — add one from Settings.</div>
            ) : (
              <div className="grid-12">
                {cards.data.map(c => {
                  const bal = balanceByCard.get(c.id) ?? 0;
                  const lim = num(c.credit_limit);
                  const usage = lim > 0 ? (bal / lim) * 100 : 0;
                  return (
                    <div key={c.id} className="col-span-4">
                      <div className="card">
                        <div className="row between center">
                          <CardMini card={c} width={130} />
                          <div className="right">
                            <div className="muted tiny" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Balance</div>
                            <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{money(bal)}</div>
                            {c.pay_due_day && <div className="muted tiny">Due day {c.pay_due_day}</div>}
                          </div>
                        </div>
                        {lim > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <div className="row between small" style={{ marginBottom: 6 }}>
                              <span className="muted">Used</span>
                              <span className="num">{usage.toFixed(0)}% of {money(lim, { cents: false })}</span>
                            </div>
                            <Bar pct={usage} tone={usage > 50 ? 'warn' : 'gold'} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Loading() {
  return <div className="empty"><span className="spinner" />Loading…</div>;
}
