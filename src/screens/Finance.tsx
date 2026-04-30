import { useMemo, useState } from 'react';
import { useTable } from '@/lib/useTable';
import { useUserId } from '@/lib/auth';
import { money, num, fmtMonth } from '@/lib/format';
import { Card, Transaction, CardBalance, IncomeEntry, categoryLabel } from '@/lib/types';
import { PageTopbar } from '@/components/PageTopbar';
import { Icon } from '@/components/Icon';
import { catColor } from '@/components/cats';
import { IncomeModal } from '@/components/modals/IncomeModal';
import { BalanceModal } from '@/components/modals/BalanceModal';

export default function Finance() {
  const cards    = useTable<Card>('cards', { orderBy: 'created_at', ascending: true });
  const txs      = useTable<Transaction>('transactions', { orderBy: 'tx_date', ascending: false, limit: 5000 });
  const balances = useTable<CardBalance>('card_balances');
  const income   = useTable<IncomeEntry>('income_entries', { orderBy: 'income_date', ascending: false });

  const userId = useUserId();
  const [showIncome,  setShowIncome]  = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  const balanceByCard = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of balances.data) m.set(b.card_id, num(b.balance));
    return m;
  }, [balances.data]);

  const accounts = cards.data.filter(c => c.card_type !== 'credit');
  const creditCards = cards.data.filter(c => c.card_type === 'credit');
  const totalAccounts = accounts.reduce((s, c) => s + (balanceByCard.get(c.id) ?? 0), 0);
  const totalDebt = creditCards.reduce((s, c) => s + (balanceByCard.get(c.id) ?? 0), 0);

  const cardById = useMemo(() => {
    const m = new Map<string, Card>();
    for (const c of cards.data) m.set(c.id, c);
    return m;
  }, [cards.data]);

  return (
    <>
      <PageTopbar
        eyebrow="Main"
        title="Finance Hub"
        sub="Everything money — in one place."
        right={
          <>
            <button className="btn" onClick={() => setShowBalance(true)} disabled={!userId || cards.data.length === 0}>
              <Icon name="refresh" size={14} /> Update balance
            </button>
            <button className="btn primary" onClick={() => setShowIncome(true)} disabled={!userId}>
              <Icon name="plus" size={14} /> Add income
            </button>
          </>
        }
      />

      <IncomeModal open={showIncome} onClose={() => setShowIncome(false)}
                   onSaved={() => { income.refetch(); }} />
      <BalanceModal open={showBalance} onClose={() => setShowBalance(false)}
                    onSaved={() => { balances.refetch(); }} cards={cards.data} />

      <div className="content page-fade">
        <div className="grid-12">
          <div className="col-span-6">
            <div className="card">
              <div className="card-head">
                <div className="card-title">Accounts · {money(totalAccounts)}</div>
              </div>
              {accounts.length === 0 ? (
                <div className="empty" style={{ padding: 18 }}>No debit / bank accounts yet.</div>
              ) : (
                <div className="col gap-12">
                  {accounts.map(a => (
                    <div key={a.id} className="row between center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="row gap-12 center">
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-alt)', display: 'grid', placeItems: 'center' }}>
                          <Icon name={a.card_type === 'bank' ? 'shield' : 'wallet'} size={16} />
                        </div>
                        <div>
                          <div className="bold">{a.name}</div>
                          <div className="muted tiny">{a.card_type} · •••• {a.last4}</div>
                        </div>
                      </div>
                      <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>
                        {money(balanceByCard.get(a.id) ?? 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="col-span-6">
            <div className="card">
              <div className="card-head">
                <div className="card-title">Cards · {money(totalDebt)}</div>
              </div>
              {creditCards.length === 0 ? (
                <div className="empty" style={{ padding: 18 }}>No credit cards yet.</div>
              ) : (
                <div className="col gap-12">
                  {creditCards.map(c => (
                    <div key={c.id} className="row between center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="row gap-12 center">
                        <div style={{ width: 38, height: 26, borderRadius: 5, background: c.color || 'var(--dark-900)' }} />
                        <div>
                          <div className="bold">{c.name}</div>
                          <div className="muted tiny">•••• {c.last4}{c.pay_due_day ? ` · Due day ${c.pay_due_day}` : ''}</div>
                        </div>
                      </div>
                      <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>
                        {money(balanceByCard.get(c.id) ?? 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">All transactions</div>
            <div className="row gap-8">
              <button className="btn sm" disabled><Icon name="filter" size={12} /> Filter</button>
              <button className="btn sm" disabled><Icon name="search" size={12} /> Search</button>
              <button className="btn sm" disabled><Icon name="download" size={12} /> Export</button>
            </div>
          </div>
          {txs.loading ? <Loading /> : txs.data.length === 0 ? (
            <div className="empty">No transactions yet.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Date</th><th>Merchant</th><th>Category</th><th>Card</th><th className="right">Amount</th></tr>
              </thead>
              <tbody>
                {txs.data.slice(0, 50).map(t => {
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
                      <td className="muted">{c ? c.name : '—'}</td>
                      <td className="right num">{money(t.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Income · {fmtMonth(new Date())}</div>
          </div>
          {income.loading ? <Loading /> : income.data.length === 0 ? (
            <div className="empty">No income logged yet.</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Date</th><th>Source</th><th>Frequency</th><th>Note</th><th className="right">Amount</th></tr>
              </thead>
              <tbody>
                {income.data.slice(0, 12).map(i => (
                  <tr key={i.id}>
                    <td className="muted">{new Date(i.income_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })}</td>
                    <td className="bold">{i.source}</td>
                    <td><span className="chip">{i.frequency}</span></td>
                    <td className="muted">{i.note ?? '—'}</td>
                    <td className="right num" style={{ color: 'var(--green-300)' }}>+{money(i.amount)}</td>
                  </tr>
                ))}
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
