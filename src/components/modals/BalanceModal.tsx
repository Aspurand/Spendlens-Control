import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, FormError, FormActions } from '@/components/Form';
import { upsertRow } from '@/lib/mutate';
import { useUserId } from '@/lib/auth';
import { Card } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  cards: Card[];
}

export function BalanceModal({ open, onClose, onSaved, cards }: Props) {
  const userId = useUserId();
  const [cardId,    setCardId]    = useState('');
  const [balance,   setBalance]   = useState('');
  const [statement, setStatement] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Pre-select the first card when the modal opens (or when cards arrive
  // after first mount). Avoids a stale empty default from the original
  // useState initializer running before the parent's useTable resolved.
  useEffect(() => {
    if (open && !cardId && cards[0]) setCardId(cards[0].id);
  }, [open, cardId, cards]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setErr('Not signed in'); return; }
    if (!cardId) { setErr('Pick a card'); return; }
    const bal = parseFloat(balance);
    if (!Number.isFinite(bal)) { setErr('Balance required'); return; }
    setBusy(true); setErr(null);
    try {
      await upsertRow(
        'card_balances', userId,
        {
          card_id: cardId,
          balance: bal,
          statement_balance: statement ? parseFloat(statement) : null,
        },
        'user_id,card_id',
      );
      setBalance(''); setStatement('');
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Update Card Balance">
      <form onSubmit={submit}>
        <FormError>{err}</FormError>
        <Field label="Card">
          <Select value={cardId} onChange={e => setCardId(e.target.value)}>
            <option value="">— Select —</option>
            {cards.map(c => (
              <option key={c.id} value={c.id}>{c.name} •••• {c.last4}</option>
            ))}
          </Select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Current Balance">
            <Input type="number" step="0.01" value={balance}
                   onChange={e => setBalance(e.target.value)} placeholder="0.00" autoFocus />
          </Field>
          <Field label="Statement Balance" hint="Optional">
            <Input type="number" step="0.01" value={statement}
                   onChange={e => setStatement(e.target.value)} placeholder="0.00" />
          </Field>
        </div>
        <FormActions>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save Balance'}
          </button>
        </FormActions>
      </form>
    </Modal>
  );
}
