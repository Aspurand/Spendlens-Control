import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { money, num, fmtMonth } from '@/lib/format';
import { Transaction, Subscription, IncomeEntry, Card } from '@/lib/types';

interface DayCell {
  date: Date;
  inMonth: boolean;
  spend: number;
  income: number;
  upcoming: number;
}

function ymd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(d);
}

function buildGrid(monthCursor: Date): DayCell[] {
  const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const last = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
  const startWeekday = first.getDay();
  const cells: DayCell[] = [];

  // Leading days from previous month
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(first);
    d.setDate(d.getDate() - (i + 1));
    cells.push({ date: d, inMonth: false, spend: 0, income: 0, upcoming: 0 });
  }
  // This month
  for (let day = 1; day <= last.getDate(); day++) {
    cells.push({
      date: new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day),
      inMonth: true, spend: 0, income: 0, upcoming: 0,
    });
  }
  // Trailing — pad to 6 rows × 7
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, inMonth: false, spend: 0, income: 0, upcoming: 0 });
    if (cells.length >= 42) break;
  }
  return cells;
}

export default function CashFlow() {
  const txs   = useTable<Transaction>('transactions', { orderBy: 'tx_date', ascending: false, limit: 5000 });
  const subs  = useTable<Subscription>('subscriptions');
  const inc   = useTable<IncomeEntry>('income_entries', { orderBy: 'income_date', ascending: false });
  const cards = useTable<Card>('cards');

  const [cursor, setCursor] = useState(() => new Date());
  const cursorLabel = fmtMonth(cursor);
  const todayKey = ymd(new Date());

  const grid = useMemo(() => {
    const g = buildGrid(cursor);
    const idx = new Map<string, DayCell>();
    g.forEach(c => idx.set(ymd(c.date), c));

    for (const t of txs.data) {
      const cell = idx.get(t.tx_date);
      if (cell) cell.spend += num(t.amount);
    }
    for (const i of inc.data) {
      const cell = idx.get(i.income_date);
      if (cell) cell.income += num(i.amount);
    }
    // Subscriptions are recurring — slot the monthly debit on `debit_day`
    for (const s of subs.data) {
      if (!s.active || !s.debit_day) continue;
      const cell = g.find(c => c.inMonth && c.date.getDate() === s.debit_day);
      if (cell) cell.upcoming += num(s.amount);
    }
    return g;
  }, [cursor, txs.data, inc.data, subs.data]);

  const monthSpend  = grid.filter(c => c.inMonth).reduce((s, c) => s + c.spend, 0);
  const monthIncome = grid.filter(c => c.inMonth).reduce((s, c) => s + c.income, 0);
  const monthUpcoming = grid.filter(c => c.inMonth).reduce((s, c) => s + c.upcoming, 0);

  // Upcoming list — subs sorted by day
  const upcoming = useMemo(() => {
    const today = new Date().getDate();
    return subs.data
      .filter(s => s.active && s.debit_day != null)
      .map(s => ({ s, dayDelta: ((s.debit_day! - today) + 31) % 31 }))
      .sort((a, b) => a.dayDelta - b.dayDelta)
      .slice(0, 8);
  }, [subs.data]);

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards.data) m.set(c.id, c);
    return m;
  }, [cards.data]);

  function shiftMonth(delta: number) {
    setCursor(d => {
      const n = new Date(d);
      n.setMonth(n.getMonth() + delta);
      return n;
    });
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Planning</div>
          <h1>Cash Flow Calendar</h1>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => shiftMonth(-1)}>‹</button>
          <span className="pill">{cursorLabel}</span>
          <button className="btn btn-ghost" onClick={() => shiftMonth(1)}>›</button>
          <button className="btn" onClick={() => setCursor(new Date())}>Today</button>
        </div>
      </div>

      <div className="content">
        <div className="grid-3">
          <Stat label="Income · MTD"   value={money(monthIncome)}   tone="green" />
          <Stat label="Spend · MTD"    value={money(monthSpend)}    tone="red" />
          <Stat label="Upcoming Subs"  value={money(monthUpcoming)} tone="amber" />
        </div>

        <div className="section-title">Calendar</div>
        <div className="card">
          <div className="calendar">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="calendar-head">{d}</div>
            ))}
            {grid.map((c, i) => {
              const isToday = ymd(c.date) === todayKey;
              return (
                <div key={i} className={`calendar-cell ${c.inMonth ? '' : 'muted'} ${isToday ? 'today' : ''}`}>
                  <div className="calendar-day-num">{c.date.getDate()}</div>
                  {c.inMonth && c.income > 0 && (
                    <span className="pill green">+{money(c.income, { cents: false })}</span>
                  )}
                  {c.inMonth && c.spend > 0 && (
                    <span className="pill red">−{money(c.spend, { cents: false })}</span>
                  )}
                  {c.inMonth && c.upcoming > 0 && (
                    <span className="pill amber">{money(c.upcoming, { cents: false })}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="section-title">Upcoming Subscriptions</div>
        <div className="card" style={{ padding: 0 }}>
          {upcoming.length === 0 ? (
            <div className="empty-row">No active subscriptions.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Card</th>
                  <th>Debit Day</th>
                  <th>In</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(({ s, dayDelta }) => {
                  const card = s.card_id ? cardById.get(s.card_id) : undefined;
                  return (
                    <tr key={s.id}>
                      <td><div style={{ fontWeight: 600 }}>{s.name}</div></td>
                      <td>{card ? `${card.name} •••• ${card.last4}` : '—'}</td>
                      <td className="mono">{s.debit_day}</td>
                      <td>
                        <span className="pill">
                          {dayDelta === 0 ? 'Today' : `${dayDelta} day${dayDelta === 1 ? '' : 's'}`}
                        </span>
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' | 'amber' }) {
  const color = tone === 'green' ? 'var(--green)'
              : tone === 'red'   ? 'var(--red)'
              : tone === 'amber' ? 'var(--amber)'
              : undefined;
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}
