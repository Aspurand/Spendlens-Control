import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { money, num, fmtMonth } from '@/lib/format';
import { Card, CardPayment } from '@/lib/types';
import { PaymentModal } from '@/components/modals/PaymentModal';
import { useUserId } from '@/lib/auth';

function isThisMonth(dateStr: string): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', timeZone: 'America/Los_Angeles',
  });
  return fmt.format(new Date(dateStr)) === fmt.format(new Date());
}

export default function Payments() {
  const cards    = useTable<Card>('cards', { orderBy: 'created_at' });
  const payments = useTable<CardPayment>('card_payments', { orderBy: 'payment_date', ascending: false });
  const userId = useUserId();
  const [showAdd, setShowAdd] = useState(false);

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards.data) m.set(c.id, c);
    return m;
  }, [cards.data]);

  const monthPayments = payments.data.filter(p => isThisMonth(p.payment_date));
  const monthTotal    = monthPayments.reduce((s, p) => s + num(p.amount), 0);

  // Sum of payments per card (lifetime)
  const lifetimeByCard = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments.data) {
      m.set(p.card_id, (m.get(p.card_id) ?? 0) + num(p.amount));
    }
    return m;
  }, [payments.data]);

  // Upcoming payment due — based on card.pay_due_day
  const upcoming = useMemo(() => {
    const today = new Date().getDate();
    return cards.data
      .filter(c => c.card_type === 'credit' && c.pay_due_day != null)
      .map(c => ({ c, dayDelta: ((c.pay_due_day! - today) + 31) % 31 }))
      .sort((a, b) => a.dayDelta - b.dayDelta);
  }, [cards.data]);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Planning</div>
          <h1>Card Payments</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} disabled={!userId}>+ Log Payment</button>
      </div>

      <PaymentModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={() => { payments.refetch(); }}
        cards={cards.data}
      />

      <div className="content">
        <div className="grid-3">
          <Stat label={`Paid · ${fmtMonth(new Date())}`} value={money(monthTotal)} tone="green" />
          <Stat label="Payments Logged · MTD"  value={String(monthPayments.length)} />
          <Stat label="Cards Tracked"          value={String(upcoming.length)} sub="Credit with due day set" />
        </div>

        <div className="section-title">Upcoming Due Dates</div>
        <div className="card" style={{ padding: 0 }}>
          {upcoming.length === 0 ? (
            <div className="empty-row">No credit cards with payment due day set — add in Settings.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Due Day</th>
                  <th>In</th>
                  <th className="num">Lifetime Paid</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(({ c, dayDelta }) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div className="mono" style={{ color: 'var(--text-dim)', fontSize: 11 }}>•••• {c.last4}</div>
                    </td>
                    <td className="mono">{c.pay_due_day}</td>
                    <td>
                      <span className={`pill ${dayDelta <= 3 ? 'red' : dayDelta <= 7 ? 'amber' : ''}`}>
                        {dayDelta === 0 ? 'Today' : `${dayDelta} day${dayDelta === 1 ? '' : 's'}`}
                      </span>
                    </td>
                    <td className="num">{money(lifetimeByCard.get(c.id) ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section-title">Payment History</div>
        <div className="card" style={{ padding: 0 }}>
          {payments.loading ? <Loading /> : payments.data.length === 0 ? (
            <div className="empty-row">No payments logged yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Card</th>
                  <th>Note</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.data.map(p => {
                  const card = cardById.get(p.card_id);
                  return (
                    <tr key={p.id}>
                      <td className="mono">{p.payment_date}</td>
                      <td>{card ? `${card.name} •••• ${card.last4}` : '—'}</td>
                      <td>{p.note ?? '—'}</td>
                      <td className="num">{money(p.amount)}</td>
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
