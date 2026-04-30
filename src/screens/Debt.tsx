import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { money, num } from '@/lib/format';
import { Card, CardBalance } from '@/lib/types';
import { PageTopbar } from '@/components/PageTopbar';
import { Sparkline } from '@/components/Sparkline';

type Strategy = 'snowball' | 'avalanche';

const DEFAULT_APR = 22;

interface DebtRow { card: Card; balance: number; limit: number; apr: number; minDue: number }

function projectCurve(rows: DebtRow[], monthly: number, strategy: Strategy): { curve: number[]; months: number; interest: number } {
  const sorted = [...rows].sort((a, b) =>
    strategy === 'avalanche' ? b.apr - a.apr : a.balance - b.balance,
  );
  const balances = sorted.map(r => r.balance);
  const aprs = sorted.map(r => r.apr / 100 / 12);
  const curve: number[] = [balances.reduce((s, b) => s + b, 0)];
  let months = 0;
  let interestPaid = 0;
  const cap = 240;
  while (balances.some(b => b > 0.01) && months < cap) {
    months++;
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] > 0) {
        const interest = balances[i] * aprs[i];
        balances[i] += interest;
        interestPaid += interest;
      }
    }
    let remaining = monthly;
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue;
      const min = Math.min(balances[i], Math.max(25, balances[i] * 0.02));
      const pay = Math.min(min, remaining);
      balances[i] -= pay;
      remaining -= pay;
      if (remaining <= 0) break;
    }
    for (let i = 0; i < balances.length && remaining > 0; i++) {
      if (balances[i] <= 0) continue;
      const pay = Math.min(balances[i], remaining);
      balances[i] -= pay;
      remaining -= pay;
    }
    curve.push(balances.reduce((s, b) => s + b, 0));
  }
  return { curve, months, interest: interestPaid };
}

export default function Debt() {
  const cards    = useTable<Card>('cards', { orderBy: 'created_at' });
  const balances = useTable<CardBalance>('card_balances');

  const [strategy, setStrategy] = useState<Strategy>('snowball');
  const [monthly,  setMonthly]  = useState(300);

  const balanceByCard = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of balances.data) m.set(b.card_id, num(b.balance));
    return m;
  }, [balances.data]);

  const rows: DebtRow[] = useMemo(() =>
    cards.data
      .filter(c => c.card_type === 'credit')
      .map(c => {
        const balance = balanceByCard.get(c.id) ?? 0;
        const limit = num(c.credit_limit);
        return {
          card: c, balance, limit,
          apr: DEFAULT_APR,
          minDue: Math.max(25, balance * 0.02),
        };
      })
      .filter(r => r.balance > 0),
  [cards.data, balanceByCard]);

  const ordered = useMemo(() =>
    [...rows].sort((a, b) =>
      strategy === 'avalanche' ? b.apr - a.apr : a.balance - b.balance,
    ),
  [rows, strategy]);

  const totalDebt = rows.reduce((s, r) => s + r.balance, 0);
  const projection = useMemo(() => projectCurve(rows, monthly, strategy), [rows, monthly, strategy]);

  return (
    <>
      <PageTopbar
        eyebrow="Planning"
        title="Debt Payoff Planner"
        sub="A clear path to $0."
      />

      <div className="content page-fade">
        <div className="grid-12">
          <div className="col-span-7">
            <div className="card ink" style={{ minHeight: 280 }}>
              <div className="card-title">You'll be debt-free in</div>
              <div style={{ font: '600 96px/1 var(--font-sans)', letterSpacing: '-0.03em', marginTop: 8 }}>
                {projection.months < 240 ? `${projection.months} mo` : '—'}
              </div>
              <div style={{ color: 'rgba(255,249,245,0.7)', marginTop: 8, fontSize: 14 }}>
                {projection.months < 240
                  ? <>Paying {money(monthly, { cents: false })}/mo at the {strategy} pace · {money(projection.interest, { cents: false })} interest.</>
                  : <>Payment too low to clear in 20 years. Increase monthly payment.</>}
              </div>
              {projection.curve.length > 1 && (
                <div style={{ marginTop: 24, marginLeft: -10, marginRight: -10 }}>
                  <Sparkline data={projection.curve} color="var(--accent-300)" fill="var(--accent-300)" height={90} />
                </div>
              )}
            </div>
          </div>
          <div className="col-span-5 col gap-16">
            <div className="card">
              <div className="card-title">Strategy</div>
              <div className="tabs" style={{ marginTop: 10 }}>
                <button className={'tab' + (strategy === 'snowball' ? ' active' : '')} onClick={() => setStrategy('snowball')}>Snowball</button>
                <button className={'tab' + (strategy === 'avalanche' ? ' active' : '')} onClick={() => setStrategy('avalanche')}>Avalanche</button>
              </div>
              <div className="muted small" style={{ marginTop: 10 }}>
                {strategy === 'snowball'
                  ? 'Pays smallest balance first — feels good, builds momentum.'
                  : 'Pays highest APR first — saves the most interest overall.'}
              </div>
            </div>
            <div className="card">
              <div className="card-title">Monthly payment</div>
              <div className="num" style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>{money(monthly, { cents: false })}</div>
              <input
                type="range" min={50} max={2000} step={25} value={monthly}
                onChange={e => setMonthly(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-300)', marginTop: 12 }}
              />
              <div className="row between muted tiny" style={{ marginTop: 4 }}><span>$50</span><span>$2,000</span></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Pay-off order</div>
            <div className="muted small">Rearranged by {strategy}</div>
          </div>
          {rows.length === 0 ? (
            <div className="empty">No credit-card balances. 🎉</div>
          ) : (
            <div className="col gap-12">
              {ordered.map((r, i) => (
                <div key={r.card.id} className="row between center" style={{ padding: '12px 0', borderBottom: i < ordered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div className="row gap-12 center">
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-100)', color: 'var(--accent-500)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>{i + 1}</div>
                    <div style={{ width: 38, height: 26, borderRadius: 5, background: r.card.color || 'var(--dark-900)' }} />
                    <div>
                      <div className="bold">{r.card.name}</div>
                      <div className="muted tiny">{r.apr}% APR · Min {money(r.minDue, { cents: false })}</div>
                    </div>
                  </div>
                  <div className="row gap-24 center">
                    <div className="right">
                      <div className="muted tiny">Balance</div>
                      <div className="num bold">{money(r.balance)}</div>
                    </div>
                    <div className="right">
                      <div className="muted tiny">Limit</div>
                      <div className="num bold">{r.limit > 0 ? money(r.limit, { cents: false }) : '—'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="row gap-16">
          <div className="card grow"><div className="card-title">Total debt</div><div className="num" style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>{money(totalDebt)}</div></div>
          <div className="card grow"><div className="card-title">Cards w/ balance</div><div className="num" style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>{rows.length}</div></div>
          <div className="card grow"><div className="card-title">Interest projected</div><div className="num" style={{ fontSize: 28, fontWeight: 600, marginTop: 6, color: 'var(--raspberry-300)' }}>{money(projection.interest)}</div></div>
        </div>
      </div>
    </>
  );
}
