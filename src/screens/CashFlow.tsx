import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { money, num, fmtMonth } from '@/lib/format';
import { Transaction, Subscription, IncomeEntry, Card } from '@/lib/types';
import { PageTopbar } from '@/components/PageTopbar';
import { Icon } from '@/components/Icon';
import { Stat } from '@/components/Stat';

interface DayCell {
  date: Date;
  inMonth: boolean;
  spend: number;
  income: number;
  bills: { label: string; amount: number; kind: 'subscription' | 'card-bill' }[];
  isToday: boolean;
}

function ymd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(d);
}

function buildGrid(cursor: Date, todayKey: string): DayCell[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const startWeekday = first.getDay();
  const cells: DayCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(first);
    d.setDate(d.getDate() - (i + 1));
    cells.push({ date: d, inMonth: false, spend: 0, income: 0, bills: [], isToday: false });
  }
  for (let day = 1; day <= last.getDate(); day++) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    cells.push({ date: d, inMonth: true, spend: 0, income: 0, bills: [], isToday: ymd(d) === todayKey });
  }
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const lastDate = cells[cells.length - 1].date;
    const next = new Date(lastDate);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, inMonth: false, spend: 0, income: 0, bills: [], isToday: false });
    if (cells.length >= 42) break;
  }
  return cells;
}

export default function CashFlow() {
  const txs   = useTable<Transaction>('transactions', { orderBy: 'tx_date', ascending: false, limit: 5000 });
  const subs  = useTable<Subscription>('subscriptions');
  const inc   = useTable<IncomeEntry>('income_entries');
  const cards = useTable<Card>('cards');

  const [cursor, setCursor] = useState(() => new Date());
  const todayKey = ymd(new Date());

  const grid = useMemo(() => {
    const g = buildGrid(cursor, todayKey);
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
    for (const s of subs.data) {
      if (!s.active || s.debit_day == null) continue;
      const cell = g.find(c => c.inMonth && c.date.getDate() === s.debit_day);
      if (cell) cell.bills.push({ label: s.name, amount: num(s.amount), kind: 'subscription' });
    }
    // Card bills on the credit card's pay_due_day
    for (const c of cards.data) {
      if (c.card_type !== 'credit' || c.pay_due_day == null) continue;
      const cell = g.find(cc => cc.inMonth && cc.date.getDate() === c.pay_due_day);
      if (cell) cell.bills.push({ label: c.name, amount: 0, kind: 'card-bill' });
    }
    return g;
  }, [cursor, txs.data, inc.data, subs.data, cards.data, todayKey]);

  const inMonth = grid.filter(c => c.inMonth);
  const moneyIn = inMonth.reduce((s, c) => s + c.income, 0);
  const moneyOut = inMonth.reduce((s, c) => s + c.spend, 0);
  const billsTotal = inMonth.reduce((s, c) => s + c.bills.reduce((ss, b) => ss + b.amount, 0), 0);

  function shift(delta: number) {
    setCursor(d => {
      const n = new Date(d);
      n.setMonth(n.getMonth() + delta);
      return n;
    });
  }

  return (
    <>
      <PageTopbar
        eyebrow="Planning"
        title="Cash Flow Calendar"
        sub="See every dollar coming in and going out."
      />

      <div className="content page-fade">
        <div className="row gap-16">
          <div className="card grow"><Stat label="Money in this month" value={moneyIn} size="lg" /></div>
          <div className="card grow"><Stat label="Money out this month" value={-moneyOut} size="lg" /></div>
          <div className="card grow"><Stat label="Net" value={moneyIn - moneyOut} size="lg" /></div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">{fmtMonth(cursor)}</div>
              <div className="muted small" style={{ marginTop: 4 }}>Hover any day to see what's planned.</div>
            </div>
            <div className="row gap-8 center">
              <button className="btn sm" onClick={() => shift(-1)} aria-label="Previous month"><Icon name="chevronLeft" size={14} /></button>
              <button className="btn sm" onClick={() => setCursor(new Date())}>Today</button>
              <button className="btn sm" onClick={() => shift(1)} aria-label="Next month"><Icon name="chevronRight" size={14} /></button>
            </div>
          </div>
          <div className="cal">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="cal-head">{d}</div>)}
            {grid.map((c, i) => (
              <div key={i} className={'cal-day' + (c.inMonth ? '' : ' dim') + (c.isToday ? ' today' : '')}>
                <div className="cal-num">{c.date.getDate()}</div>
                {c.income > 0 && (
                  <div className="cal-event income">+{money(c.income, { cents: false })}</div>
                )}
                {c.spend > 0 && (
                  <div className="cal-event">−{money(c.spend, { cents: false })}</div>
                )}
                {c.bills.slice(0, 2).map((b, j) => (
                  <div key={j} className={'cal-event' + (b.kind === 'card-bill' ? ' bill' : '')}>
                    {b.label.split(/\s+/)[0]}{b.amount > 0 ? ` ${money(b.amount, { cents: false })}` : ''}
                  </div>
                ))}
                {c.bills.length > 2 && <div className="muted tiny">+{c.bills.length - 2} more</div>}
              </div>
            ))}
          </div>
          <div className="row gap-16 center" style={{ marginTop: 14 }}>
            <span className="row center gap-8 small"><span className="cat-dot" style={{ background: 'var(--green-300)' }} />Income</span>
            <span className="row center gap-8 small"><span className="cat-dot" style={{ background: 'var(--raspberry-300)' }} />Card bill</span>
            <span className="row center gap-8 small"><span className="cat-dot" style={{ background: 'var(--accent-300)' }} />Subscription</span>
            <span className="muted small" style={{ marginLeft: 'auto' }}>{billsTotal > 0 && <>Bills this month: <b>{money(billsTotal)}</b></>}</span>
          </div>
        </div>
      </div>
    </>
  );
}
