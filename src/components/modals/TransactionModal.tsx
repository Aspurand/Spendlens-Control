import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, FormError, FormActions } from '@/components/Form';
import { insertRow, todayISO } from '@/lib/mutate';
import { useUserId } from '@/lib/auth';
import { CATEGORY_META, Card } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  cards: Card[];
}

export function TransactionModal({ open, onClose, onSaved, cards }: Props) {
  const userId = useUserId();
  const [amount,   setAmount]   = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('other');
  const [cardId,   setCardId]   = useState<string>('');
  const [date,     setDate]     = useState(() => todayISO());
  const [time,     setTime]     = useState('12:00');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setAmount(''); setMerchant(''); setCategory('other');
    setCardId(''); setDate(todayISO()); setTime('12:00');
    setErr(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setErr('Not signed in'); return; }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setErr('Amount must be positive'); return; }
    if (!merchant.trim()) { setErr('Merchant required'); return; }
    setBusy(true); setErr(null);
    try {
      await insertRow('transactions', userId, {
        amount: amt,
        merchant: merchant.trim(),
        category,
        card_id: cardId || null,
        tx_date: date,
        tx_time: time,
      });
      reset();
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Transaction">
      <form onSubmit={submit}>
        <FormError>{err}</FormError>
        <Field label="Amount">
          <Input type="number" step="0.01" inputMode="decimal" value={amount}
                 onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />
        </Field>
        <Field label="Merchant">
          <Input value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="Whole Foods" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Date">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Card">
          <Select value={cardId} onChange={e => setCardId(e.target.value)}>
            <option value="">— None —</option>
            {cards.map(c => (
              <option key={c.id} value={c.id}>{c.name} •••• {c.last4}</option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Select value={category} onChange={e => setCategory(e.target.value)}>
            {Object.entries(CATEGORY_META).map(([id, m]) => (
              <option key={id} value={id}>{m.icon} {m.label}</option>
            ))}
          </Select>
        </Field>
        <FormActions>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Add Transaction'}
          </button>
        </FormActions>
      </form>
    </Modal>
  );
}
