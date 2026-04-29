import { useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, FormError, FormActions } from '@/components/Form';
import { insertRow, todayISO } from '@/lib/mutate';
import { useUserId } from '@/lib/auth';

interface Props { open: boolean; onClose: () => void; onSaved: () => void; }

const SOURCES = [
  { value: 'salary',     label: '💼 Salary / Paycheck' },
  { value: 'freelance',  label: '💻 Freelance' },
  { value: 'bonus',      label: '🎁 Bonus' },
  { value: 'investment', label: '📈 Investment' },
  { value: 'rental',     label: '🏠 Rental' },
  { value: 'other',      label: '📦 Other' },
];

export function IncomeModal({ open, onClose, onSaved }: Props) {
  const userId = useUserId();
  const [amount,    setAmount]    = useState('');
  const [source,    setSource]    = useState('salary');
  const [frequency, setFrequency] = useState('monthly');
  const [date,      setDate]      = useState(() => todayISO());
  const [note,      setNote]      = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Re-init date to today whenever the modal opens.
  useEffect(() => {
    if (open) setDate(todayISO());
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setErr('Not signed in'); return; }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setErr('Amount must be positive'); return; }
    if (!date) { setErr('Pay date required'); return; }
    setBusy(true); setErr(null);
    try {
      await insertRow('income_entries', userId, {
        amount: amt,
        source,
        frequency,
        income_date: date,
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
    <Modal open={open} onClose={onClose} title="Log Income">
      <form onSubmit={submit}>
        <FormError>{err}</FormError>
        <Field label="Amount">
          <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="3500" autoFocus />
        </Field>
        <Field label="Source">
          <Select value={source} onChange={e => setSource(e.target.value)}>
            {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Frequency">
            <Select value={frequency} onChange={e => setFrequency(e.target.value)}>
              <option value="once">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
            </Select>
          </Field>
          <Field label="Pay Date">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Note" hint="Optional">
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="March paycheck" />
        </Field>
        <FormActions>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save Income'}
          </button>
        </FormActions>
      </form>
    </Modal>
  );
}
