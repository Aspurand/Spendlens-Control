import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { useUserId } from '@/lib/auth';
import { money, num } from '@/lib/format';
import { Card, CardPayment, CardBalance } from '@/lib/types';
import { PageTopbar } from '@/components/PageTopbar';
import { Icon } from '@/components/Icon';
import { Bar } from '@/components/Bar';
import { CardMini } from '@/components/CardMini';
import { PaymentModal } from '@/components/modals/PaymentModal';

export default function Payments() {
  const cards    = useTable<Card>('cards', { orderBy: 'created_at' });
  const payments = useTable<CardPayment>('card_payments', { orderBy: 'payment_date', ascending: false });
  const balances = useTable<CardBalance>('card_balances');

  const userId = useUserId();
  const [showAdd, setShowAdd] = useState(false);

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards.data) m.set(c.id, c);
    return m;
  }, [cards.data]);

  const balanceByCard = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of balances.data) m.set(b.card_id, num(b.balance));
    return m;
  }, [balances.data]);

  const creditCards = cards.data.filter(c => c.card_type === 'credit');

  return (
    <>
      <PageTopbar
        eyebrow="Planning"
        title="Card Payments"
        sub="Pay every card on time. Never think about it again."
        right={
          <>
            <button className="btn gold" disabled><Icon name="bolt" size={14} /> Auto-pay all</button>
            <button className="btn primary" onClick={() => setShowAdd(true)} disabled={!userId || creditCards.length === 0}>
              <Icon name="plus" size={14} /> Log payment
            </button>
          </>
        }
      />

      <PaymentModal open={showAdd} onClose={() => setShowAdd(false)}
                    onSaved={() => { payments.refetch(); }} cards={cards.data} />

      <div className="content page-fade">
        {creditCards.length === 0 ? (
          <div className="empty">No credit cards yet — add one from Settings.</div>
        ) : (
          <div className="grid-12">
            {creditCards.map(c => {
              const bal = balanceByCard.get(c.id) ?? 0;
              const lim = num(c.credit_limit);
              const usage = lim > 0 ? (bal / lim) * 100 : 0;
              return (
                <div key={c.id} className="col-span-4">
                  <div className="card">
                    <CardMini card={c} />
                    <div className="row between" style={{ marginTop: 16, alignItems: 'flex-end' }}>
                      <div>
                        <div className="muted tiny" style={{ letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Balance</div>
                        <div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{money(bal)}</div>
                      </div>
                      <div className="right">
                        <div className="muted tiny">Due</div>
                        <div className="bold">{c.pay_due_day ? `Day ${c.pay_due_day}` : '—'}</div>
                      </div>
                    </div>
                    {lim > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div className="row between small"><span className="muted">Used</span><span className="num">{usage.toFixed(0)}%</span></div>
                        <div style={{ marginTop: 6 }}><Bar pct={usage} tone={usage > 50 ? 'warn' : 'gold'} /></div>
                      </div>
                    )}
                    <div className="row gap-8" style={{ marginTop: 16 }}>
                      <button
                        className="btn primary"
                        style={{ flex: 1 }}
                        onClick={() => setShowAdd(true)}
                        disabled={!userId}
                      >
                        Pay {money(bal, { cents: false })}
                      </button>
                      <button className="btn" onClick={() => setShowAdd(true)} disabled={!userId}>Min</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="card">
          <div className="card-head">
            <div className="card-title">Payment history</div>
          </div>
          {payments.loading ? <Loading /> : payments.data.length === 0 ? (
            <div className="empty">No payments logged yet.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Date</th><th>Card</th><th>Note</th><th className="right">Amount</th><th className="right">Status</th></tr>
              </thead>
              <tbody>
                {payments.data.map(p => {
                  const c = cardById.get(p.card_id);
                  return (
                    <tr key={p.id}>
                      <td className="muted">{new Date(p.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })}</td>
                      <td className="bold">{c ? c.name : '—'}</td>
                      <td className="muted">{p.note ?? '—'}</td>
                      <td className="right num">{money(-num(p.amount))}</td>
                      <td className="right"><span className="chip good"><Icon name="check" size={10} /> Logged</span></td>
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
