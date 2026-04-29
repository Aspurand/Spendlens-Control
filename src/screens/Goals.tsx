import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { money, num, pct } from '@/lib/format';
import { SavingsGoal, IncomeEntry } from '@/lib/types';
import { GoalModal } from '@/components/modals/GoalModal';
import { useUserId } from '@/lib/auth';

function daysUntil(target: string | null): number | null {
  if (!target) return null;
  const t = new Date(target).getTime();
  const now = Date.now();
  const days = Math.ceil((t - now) / (1000 * 60 * 60 * 24));
  return days;
}

export default function Goals() {
  const goals = useTable<SavingsGoal>('savings_goals', { orderBy: 'created_at', ascending: true });
  const inc   = useTable<IncomeEntry>('income_entries');
  const userId = useUserId();
  const [showAdd, setShowAdd] = useState(false);

  const totalTarget = goals.data.reduce((s, g) => s + num(g.target_amount), 0);
  const totalSaved  = goals.data.reduce((s, g) => s + num(g.saved_amount),  0);
  const overall     = pct(totalSaved, totalTarget);

  // "Pay yourself first" — recommend 20% of monthly income
  const monthlyIncome = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', timeZone: 'America/Los_Angeles',
    });
    const thisMonth = fmt.format(new Date());
    return inc.data
      .filter(i => fmt.format(new Date(i.income_date)) === thisMonth)
      .reduce((s, i) => s + num(i.amount), 0);
  }, [inc.data]);
  const recommended = monthlyIncome * 0.2;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Planning</div>
          <h1>Savings Goals</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} disabled={!userId}>+ New Goal</button>
      </div>

      <GoalModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => { goals.refetch(); }}
      />

      <div className="content">
        <div className="grid-3">
          <Stat label="Total Saved"   value={money(totalSaved)}   tone="green" />
          <Stat label="Total Target"  value={money(totalTarget)} />
          <Stat label="Overall Progress" value={`${overall.toFixed(0)}%`} sub={money(totalTarget - totalSaved) + ' to go'} />
        </div>

        <div className="section-title">Goals</div>
        {goals.loading ? <Loading /> : goals.data.length === 0 ? (
          <div className="empty-row">No goals yet — click + New Goal.</div>
        ) : (
          <div className="grid-2">
            {goals.data.map(g => {
              const saved = num(g.saved_amount);
              const target = num(g.target_amount);
              const p = pct(saved, target);
              const dleft = daysUntil(g.target_date);
              const tone = p >= 100 ? 'green' : p >= 50 ? 'amber' : undefined;
              return (
                <div key={g.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600 }}>{g.name}</div>
                      {dleft != null && (
                        <div className="stat-sub">
                          {dleft > 0 ? `${dleft} days left` : dleft === 0 ? 'Due today' : `${Math.abs(dleft)} days overdue`}
                        </div>
                      )}
                    </div>
                    <span className={`pill ${tone === 'green' ? 'green' : tone === 'amber' ? 'amber' : ''}`}>
                      {p.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 0 6px', fontVariantNumeric: 'tabular-nums' }}>
                    <span className="mono" style={{ fontSize: 13 }}>{money(saved)}</span>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--text-dim)' }}>of {money(target)}</span>
                  </div>
                  <div className="progress">
                    <div
                      className={`progress-fill ${p >= 100 ? 'green' : ''}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="section-title">Pay Yourself First</div>
        <div className="card">
          <div className="stat-label">Recommended monthly transfer (20% of income)</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{money(recommended)}</div>
          <div className="stat-sub">
            Based on {money(monthlyIncome)} of income logged this month. Auto-transfer this on each pay date and treat
            it as untouchable savings.
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
