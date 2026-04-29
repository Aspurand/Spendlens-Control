import { useMemo } from 'react';
import { useTable } from '@/lib/useTable';
import { money, num, fmtMonth } from '@/lib/format';
import { Card, Transaction, CardBalance, IncomeEntry } from '@/lib/types';

function isThisMonth(dateStr: string, ref = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', timeZone: 'America/Los_Angeles',
  });
  return fmt.format(new Date(dateStr)) === fmt.format(ref);
}

export default function Finance() {
  const cards    = useTable<Card>('cards', { orderBy: 'created_at', ascending: true });
  const txs      = useTable<Transaction>('transactions', { orderBy: 'tx_date', ascending: false, limit: 5000 });
  const balances = useTable<CardBalance>('card_balances');
  const income   = useTable<IncomeEntry>('income_entries', { orderBy: 'income_date', ascending: false });

  const now = new Date();
  const thisMonthLabel = fmtMonth(now);

  const monthIncome = useMemo(
    () => income.data.filter(i => isThisMonth(i.income_date, now)),
    [income.data, now],
  );
  const incomeTotal = monthIncome.reduce((s, i) => s + num(i.amount), 0);

  const monthSpend = useMemo(
    () => txs.data.filter(t => isThisMonth(t.tx_date, now)).reduce((s, t) => s + num(t.amount), 0),
    [txs.data, now],
  );

  const cashLeft = incomeTotal - monthSpend;
  const savingsRate = incomeTotal > 0 ? (cashLeft / incomeTotal) * 100 : 0;

  // Spending velocity: avg daily spend so far this month vs implied trajectory
  const dayOfMonth = parseInt(
    new Intl.DateTimeFormat('en-CA', { day: 'numeric', timeZone: 'America/Los_Angeles' }).format(now),
    10,
  );
  const avgPerDay = dayOfMonth > 0 ? monthSpend / dayOfMonth : 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = avgPerDay * daysInMonth;

  // Card balances this month — payments + spend per card
  const balanceByCard = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of balances.data) m.set(b.card_id, num(b.balance));
    return m;
  }, [balances.data]);

  const monthSpendByCard = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txs.data) {
      if (!t.card_id) continue;
      if (!isThisMonth(t.tx_date, now)) continue;
      m.set(t.card_id, (m.get(t.card_id) ?? 0) + num(t.amount));
    }
    return m;
  }, [txs.data, now]);

  // Net worth snapshot — sum of debit/bank balances minus credit-card balances
  const netWorth = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    for (const c of cards.data) {
      const bal = balanceByCard.get(c.id) ?? 0;
      if (c.card_type === 'credit') liabilities += bal;
      else assets += bal;
    }
    return { assets, liabilities, net: assets - liabilities };
  }, [cards.data, balanceByCard]);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Main</div>
          <h1>Finance Hub</h1>
        </div>
        <button className="btn btn-primary">+ Income</button>
      </div>

      <div className="content">
        {/* HERO row: 4 stats */}
        <div className="grid-4">
          <Stat label="Income · This Month" value={money(incomeTotal)} sub={`${monthIncome.length} entries`} />
          <Stat label="Spent · This Month"  value={money(monthSpend)}  sub={`${dayOfMonth} of ${daysInMonth} days`} />
          <Stat
            label="Cash Left"
            value={money(cashLeft)}
            sub={incomeTotal > 0 ? `${savingsRate.toFixed(0)}% savings rate` : 'No income logged'}
            tone={cashLeft >= 0 ? 'green' : 'red'}
          />
          <Stat label="Projected Spend" value={money(projected)} sub={`${money(avgPerDay)}/day pace`} />
        </div>

        {/* VELOCITY */}
        <div className="section-title">Spending Velocity</div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div className="stat-label">Daily average</div>
              <div className="stat-value">{money(avgPerDay)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="stat-label">Projected EoM</div>
              <div className="stat-value">{money(projected)}</div>
            </div>
          </div>
          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, (dayOfMonth / daysInMonth) * 100)}%` }}
            />
          </div>
          <div className="stat-sub" style={{ marginTop: 8 }}>
            {dayOfMonth} of {daysInMonth} days through {thisMonthLabel}
          </div>
        </div>

        {/* CARD BALANCES */}
        <div className="section-title">Card Balances · This Month</div>
        <div className="card" style={{ padding: 0 }}>
          {cards.loading ? <Loading /> : cards.data.length === 0 ? (
            <div className="empty-row">No cards yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Type</th>
                  <th className="num">Balance</th>
                  <th className="num">Spent · {thisMonthLabel}</th>
                  <th className="num">Limit</th>
                  <th className="num">Utilization</th>
                </tr>
              </thead>
              <tbody>
                {cards.data.map(c => {
                  const bal = balanceByCard.get(c.id) ?? 0;
                  const spent = monthSpendByCard.get(c.id) ?? 0;
                  const lim = num(c.credit_limit);
                  const util = lim > 0 ? (bal / lim) * 100 : 0;
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div className="mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>•••• {c.last4}</div>
                      </td>
                      <td><span className="pill">{c.card_type}</span></td>
                      <td className="num">{money(bal)}</td>
                      <td className="num">{money(spent)}</td>
                      <td className="num">{lim > 0 ? money(lim, { cents: false }) : '—'}</td>
                      <td className="num">
                        {lim > 0 ? (
                          <span className={`pill ${util > 70 ? 'red' : util > 30 ? 'amber' : 'green'}`}>
                            {util.toFixed(0)}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* INCOME LIST */}
        <div className="section-title">Income · {thisMonthLabel}</div>
        <div className="card" style={{ padding: 0 }}>
          {income.loading ? <Loading /> : monthIncome.length === 0 ? (
            <div className="empty-row">No income logged for {thisMonthLabel}.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Frequency</th>
                  <th>Note</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {monthIncome.map(i => (
                  <tr key={i.id}>
                    <td className="mono">{i.income_date}</td>
                    <td>{i.source}</td>
                    <td><span className="pill">{i.frequency}</span></td>
                    <td>{i.note ?? '—'}</td>
                    <td className="num">{money(i.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* NET WORTH */}
        <div className="section-title">Net Worth Snapshot</div>
        <div className="grid-3">
          <Stat label="Assets"      value={money(netWorth.assets)}      sub="Debit + bank balances" tone="green" />
          <Stat label="Liabilities" value={money(netWorth.liabilities)} sub="Credit-card balances"   tone="red" />
          <Stat label="Net Worth"   value={money(netWorth.net)}         sub="Assets minus liabilities"
                tone={netWorth.net >= 0 ? 'green' : 'red'} />
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
