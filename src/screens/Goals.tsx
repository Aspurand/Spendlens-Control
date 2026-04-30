import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { useUserId } from '@/lib/auth';
import { money, num, pct } from '@/lib/format';
import { SavingsGoal, IncomeEntry } from '@/lib/types';
import { PageTopbar } from '@/components/PageTopbar';
import { Icon } from '@/components/Icon';
import { Bar } from '@/components/Bar';
import { GoalModal } from '@/components/modals/GoalModal';

export default function Goals() {
  const goals = useTable<SavingsGoal>('savings_goals', { orderBy: 'created_at', ascending: true });
  const inc   = useTable<IncomeEntry>('income_entries');
  const userId = useUserId();
  const [showAdd, setShowAdd] = useState(false);

  const monthlyIncome = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', timeZone: 'America/Los_Angeles',
    });
    const k = fmt.format(new Date());
    return inc.data.filter(i => fmt.format(new Date(i.income_date)) === k)
                   .reduce((s, i) => s + num(i.amount), 0);
  }, [inc.data]);
  const recommended = monthlyIncome * 0.2;

  return (
    <>
      <PageTopbar
        eyebrow="Planning"
        title="Savings Goals"
        sub="What are you saving for?"
        right={
          <button className="btn primary" onClick={() => setShowAdd(true)} disabled={!userId}>
            <Icon name="plus" size={14} /> New goal
          </button>
        }
      />

      <GoalModal open={showAdd} onClose={() => setShowAdd(false)}
                 onSaved={() => { goals.refetch(); }} />

      <div className="content page-fade">
        {goals.loading ? <Loading /> : goals.data.length === 0 ? (
          <div className="empty">No goals yet — click + New goal to start.</div>
        ) : (
          <div className="grid-12">
            {goals.data.map(g => {
              const saved = num(g.saved_amount);
              const target = num(g.target_amount);
              const p = pct(saved, target);
              const eta = g.target_date
                ? new Date(g.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'America/Los_Angeles' })
                : '—';
              return (
                <div key={g.id} className="col-span-6">
                  <div className="card">
                    <div className="row between center">
                      <div>
                        <div className="bold" style={{ fontSize: 18 }}>{g.name}</div>
                        <div className="muted small">Target {eta}</div>
                      </div>
                      <div className={'chip ' + (p >= 100 ? 'good' : 'gold')}>{Math.round(p)}%</div>
                    </div>
                    <div className="row between" style={{ alignItems: 'flex-end', marginTop: 16 }}>
                      <div>
                        <div className="muted tiny" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Saved</div>
                        <div className="num" style={{ fontSize: 28, fontWeight: 600 }}>{money(saved)}</div>
                      </div>
                      <div className="right">
                        <div className="muted tiny" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Target</div>
                        <div className="num" style={{ fontSize: 18, color: 'var(--fg-muted)' }}>{money(target)}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 14 }}><Bar pct={p} tone={p >= 100 ? 'green' : 'gold'} /></div>
                    <div className="row between center" style={{ marginTop: 14 }}>
                      <div className="muted small">{money(target - saved)} to go</div>
                      <button className="btn sm" disabled>Add money</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="card cream">
          <div className="card-head">
            <div className="card-title">Pay yourself first</div>
          </div>
          <div className="row between center">
            <div>
              <div style={{ font: '600 32px/1 var(--font-sans)', color: 'var(--accent-500)', fontVariantNumeric: 'tabular-nums' }}>
                {money(recommended)}
              </div>
              <div className="muted small" style={{ marginTop: 6 }}>
                Recommended monthly transfer (20% of {money(monthlyIncome)} income this month).
              </div>
            </div>
            <button className="btn gold" disabled><Icon name="bolt" size={14} /> Auto-transfer</button>
          </div>
        </div>
      </div>
    </>
  );
}

function Loading() {
  return <div className="empty"><span className="spinner" />Loading…</div>;
}
