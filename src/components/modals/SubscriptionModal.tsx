import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, FormError, FormActions } from '@/components/Form';
import { insertRow } from '@/lib/mutate';
import { useUserId } from '@/lib/auth';
import { CATEGORY_META, Card } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  cards: Card[];
}

export function SubscriptionModal({ open, onClose, onSaved, cards }: Props) {
  const userId = useUserId();
  const [name,     setName]     = useState('');
  const [amount,   setAmount]   = useState('');
  const [cardId,   setCardId]   = useState('');
  const [cycle,    setCycle]    = useState<'monthly' | 'yearly'>('monthly');
  const [debitDay, setDebitDay] = useState('');
  const [category, setCategory] = useState('bills');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setErr('Not signed in'); return; }
    if (!name.trim()) { setErr('Service name required'); return; }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setErr('Amount must be positive'); return; }
    setBusy(true); setErr(null);
    try {
      await insertRow('subscriptions', userId, {
        name: name.trim(),
        amount: amt,
        card_id: cardId || null,
        cycle,
        category,
        active: true,
        debit_day: debitDay ? parseInt(debitDay, 10) : null,
      });
      setName(''); setAmount(''); setCardId(''); setDebitDay('');
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Subscription">
      <form onSubmit={submit}>
        <FormError>{err}</FormError>
        <Field label="Service Name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Netflix" autoFocus />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Amount">
            <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="15.99" />
          </Field>
          <Field label="Cycle">
            <Select value={cycle} onChange={e => setCycle(e.target.value as any)}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </Field>
        </div>
        <Field label="Charged To">
          <Select value={cardId} onChange={e => setCardId(e.target.value)}>
            <option value="">— None —</option>
            {cards.map(c => <option key={c.id} value={c.id}>{c.name} •••• {c.last4}</option>)}
          </Select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Debit Day" hint="Day of month (1–31)">
            <Input type="number" min={1} max={31} value={debitDay}
                   onChange={e => setDebitDay(e.target.value)} placeholder="15" />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={e => setCategory(e.target.value)}>
              {Object.entries(CATEGORY_META).map(([id, m]) => (
                <option key={id} value={id}>{m.icon} {m.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <FormActions>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Add Subscription'}
          </button>
        </FormActions>
      </form>
    </Modal>
  );
}
