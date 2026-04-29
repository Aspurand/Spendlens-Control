import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { money, num, pct } from '@/lib/format';
import { Card, CardBalance } from '@/lib/types';

type Strategy = 'avalanche' | 'snowball';

interface DebtRow {
  card: Card;
  balance: number;
  limit: number;
  utilization: number;
  apr: number;
}

/** Default APR — Supabase schema doesn't carry per-card APR yet, so we
 *  use a single editable rate as a placeholder. When the phone app adds
 *  card.apr, fold that in here in lockstep. */
const DEFAULT_APR = 22;

/** Project the months/cost to clear all debt with a fixed monthly
 *  payment, using the chosen ordering strategy. Simple amortization;
 *  ignores new spend on the cards (intentional — this is the "paydown
 *  scenario"). */
function project(rows: DebtRow[], monthly: number, strategy: Strategy) {
  const sorted = [...rows].sort((a, b) =>
    strategy === 'avalanche' ? b.apr - a.apr : a.balance - b.balance,
  );
  const balances = sorted.map(r => r.balance);
  const aprs = sorted.map(r => r.apr / 100 / 12);
  let months = 0;
  let interestPaid = 0;
  const cap = 600;
  while (balances.some(b => b > 0.01) && months < cap) {
    months++;
    // Accrue interest
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] > 0) {
        const interest = balances[i] * aprs[i];
        balances[i] += interest;
        interestPaid += interest;
      }
    }
    let remaining = monthly;
    // Minimums first (assume 2% per balance, min $25)
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] <= 0) continue;
      const min = Math.min(balances[i], Math.max(25, balances[i] * 0.02));
      const pay = Math.min(min, remaining);
      balances[i] -= pay;
      remaining -= pay;
      if (remaining <= 0) break;
    }
    // Avalanche/snowball remainder onto the priority card
    for (let i = 0; i < balances.length && remaining > 0; i++) {
      if (balances[i] <= 0) continue;
      const pay = Math.min(balances[i], remaining);
      balances[i] -= pay;
      remaining -= pay;
    }
  }
  return { months, interestPaid, completed: months < cap };
}

export default function Debt() {
  const cards    = useTable<Card>('cards', { orderBy: 'created_at' });
  const balances = useTable<CardBalance>('card_balances');

  const [strategy, setStrategy] = useState<Strategy>('avalanche');
  const [monthly, setMonthly]   = useState(500);

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
          card: c,
          balance,
          limit,
          utilization: limit > 0 ? (balance / limit) * 100 : 0,
          apr: DEFAULT_APR,
        };
      })
      .filter(r => r.balance > 0)
      .sort((a, b) =>
        strategy === 'avalanche' ? b.apr - a.apr : a.balance - b.balance,
      ),
  [cards.data, balanceByCard, strategy]);

  const totalDebt = rows.reduce((s, r) => s + r.balance, 0);
  const projection = useMemo(() => project(rows, monthly, strategy), [rows, monthly, strategy]);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Planning</div>
          <h1>Debt Payoff Planner</h1>
        </div>
      </div>

      <div className="content">
        <div className="grid-3">
          <Stat label="Total Debt"   value={money(totalDebt)}   tone="red" />
          <Stat label="Cards w/ Balance" value={String(rows.length)} />
          <Stat
            label={projection.completed ? 'Time to Debt-Free' : 'Need More Per Month'}
            value={projection.completed ? `${projection.months} mo` : '—'}
            sub={projection.completed ? `${money(projection.interestPaid, { cents: false })} interest` : 'Increase monthly payment'}
            tone={projection.completed ? 'green' : 'red'}
          />
        </div>

        <div className="section-title">Credit Cards</div>
        <div className="card" style={{ padding: 0 }}>
          {cards.loading ? <Loading /> : rows.length === 0 ? (
            <div className="empty-row">No credit-card balances. 🎉</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Card</th>
                  <th className="num">Balance</th>
                  <th className="num">Limit</th>
                  <th className="num">Utilization</th>
                  <th className="num">APR</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.card.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.card.name}</div>
                      <div className="mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>•••• {r.card.last4}</div>
                    </td>
                    <td className="num">{money(r.balance)}</td>
                    <td className="num">{r.limit > 0 ? money(r.limit, { cents: false }) : '—'}</td>
                    <td className="num">
                      {r.limit > 0 ? (
                        <span className={`pill ${r.utilization > 70 ? 'red' : r.utilization > 30 ? 'amber' : 'green'}`}>
                          {r.utilization.toFixed(0)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="num">{r.apr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section-title">Strategy &amp; Projection</div>
        <div className="card">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <div className="stat-label">Strategy</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  className={`btn ${strategy === 'avalanche' ? 'btn-primary' : ''}`}
                  onClick={() => setStrategy('avalanche')}
                >
                  Avalanche · Highest APR first
                </button>
                <button
                  className={`btn ${strategy === 'snowball' ? 'btn-primary' : ''}`}
                  onClick={() => setStrategy('snowball')}
                >
                  Snowball · Smallest balance first
                </button>
              </div>
            </div>
            <div>
              <div className="stat-label">Monthly payment</div>
              <input
                type="number"
                value={monthly}
                onChange={e => setMonthly(Math.max(0, Number(e.target.value)))}
                style={{
                  marginTop: 8, width: 160, padding: '8px 12px',
                  border: '1px solid var(--border-strong)', borderRadius: 8,
                  background: 'var(--bg-input)', color: 'var(--text)',
                  fontFamily: 'var(--font-mono)', fontSize: 14,
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div className="progress">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, pct(monthly, totalDebt / 12))}%` }}
              />
            </div>
            <div className="stat-sub" style={{ marginTop: 8 }}>
              {projection.completed ? (
                <>Pay off in <strong>{projection.months} months</strong> · {money(projection.interestPaid)} total interest</>
              ) : (
                <>Payment too low — debt persists past {600 / 12} years.</>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'green' | 'red' }) {
  const color = tone === 'green' ? 'var(--green)' : tone === 'red' ? 'var(--red)' : undefined;
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
