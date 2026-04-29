import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Field, Input, FormError, FormActions } from '@/components/Form';
import { insertRow } from '@/lib/mutate';
import { useUserId } from '@/lib/auth';

interface Props { open: boolean; onClose: () => void; onSaved: () => void; }

export function GoalModal({ open, onClose, onSaved }: Props) {
  const userId = useUserId();
  const [name,         setName]         = useState('');
  const [target,       setTarget]       = useState('');
  const [saved,        setSaved]        = useState('0');
  const [targetDate,   setTargetDate]   = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setErr('Not signed in'); return; }
    if (!name.trim()) { setErr('Goal name required'); return; }
    const t = parseFloat(target);
    if (!Number.isFinite(t) || t <= 0) { setErr('Target must be positive'); return; }
    const s = parseFloat(saved) || 0;
    setBusy(true); setErr(null);
    try {
      await insertRow('savings_goals', userId, {
        name: name.trim(),
        target_amount: t,
        saved_amount: s,
        target_date: targetDate || null,
      });
      setName(''); setTarget(''); setSaved('0'); setTargetDate('');
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Savings Goal">
      <form onSubmit={submit}>
        <FormError>{err}</FormError>
        <Field label="Goal Name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Emergency fund" autoFocus />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Target Amount">
            <Input type="number" step="100" value={target} onChange={e => setTarget(e.target.value)} placeholder="10000" />
          </Field>
          <Field label="Already Saved">
            <Input type="number" step="100" value={saved} onChange={e => setSaved(e.target.value)} placeholder="0" />
          </Field>
        </div>
        <Field label="Target Date" hint="Optional">
          <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
        </Field>
        <FormActions>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Create Goal'}
          </button>
        </FormActions>
      </form>
    </Modal>
  );
}
