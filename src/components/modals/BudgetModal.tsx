import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, FormError, FormActions } from '@/components/Form';
import { upsertRow } from '@/lib/mutate';
import { useUserId } from '@/lib/auth';
import { CATEGORY_META } from '@/lib/types';

interface Props { open: boolean; onClose: () => void; onSaved: () => void; }

export function BudgetModal({ open, onClose, onSaved }: Props) {
  const userId = useUserId();
  const [target, setTarget] = useState('overall');
  const [amount, setAmount] = useState('');
  const [busy, setBusy]     = useState(false);
  const [err,  setErr]      = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setErr('Not signed in'); return; }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setErr('Amount must be positive'); return; }
    setBusy(true); setErr(null);
    try {
      const key = target === 'overall' ? 'overall' : `cat:${target}`;
      await upsertRow('budgets', userId, { key, amount: amt }, 'user_id,key');
      setAmount('');
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Set Budget">
      <form onSubmit={submit}>
        <FormError>{err}</FormError>
        <Field label="Budget For">
          <Select value={target} onChange={e => setTarget(e.target.value)}>
            <option value="overall">📊 Overall Monthly</option>
            {Object.entries(CATEGORY_META).map(([id, m]) => (
              <option key={id} value={id}>{m.icon} {m.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Monthly Limit">
          <Input type="number" step="50" inputMode="decimal" value={amount}
                 onChange={e => setAmount(e.target.value)} placeholder="2000" autoFocus />
        </Field>
        <FormActions>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save Budget'}
          </button>
        </FormActions>
      </form>
    </Modal>
  );
}
