import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, FormError, FormActions } from '@/components/Form';
import { insertRow, todayISO } from '@/lib/mutate';
import { useUserId } from '@/lib/auth';
import { Card } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  cards: Card[];
}

export function PaymentModal({ open, onClose, onSaved, cards }: Props) {
  const userId = useUserId();
  const creditCards = cards.filter(c => c.card_type === 'credit');
  const [cardId, setCardId] = useState(creditCards[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date,   setDate]   = useState(() => todayISO());
  const [note,   setNote]   = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setErr('Not signed in'); return; }
    if (!cardId) { setErr('Pick a card'); return; }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setErr('Amount must be positive'); return; }
    setBusy(true); setErr(null);
    try {
      await insertRow('card_payments', userId, {
        card_id: cardId,
        amount: amt,
        payment_date: date,
        note: note.trim() || null,
      });
      setAmount(''); setNote('');
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Card Payment">
      <form onSubmit={submit}>
        <FormError>{err}</FormError>
        <Field label="Card">
          <Select value={cardId} onChange={e => setCardId(e.target.value)}>
            <option value="">— Select —</option>
            {creditCards.map(c => (
              <option key={c.id} value={c.id}>{c.name} •••• {c.last4}</option>
            ))}
          </Select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Amount">
            <Input type="number" step="0.01" value={amount}
                   onChange={e => setAmount(e.target.value)} placeholder="0.00" autoFocus />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Note" hint="Optional">
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Minimum payment" />
        </Field>
        <FormActions>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save Payment'}
          </button>
        </FormActions>
      </form>
    </Modal>
  );
}
