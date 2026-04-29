import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Field, Input, Select, FormError, FormActions } from '@/components/Form';
import { insertRow } from '@/lib/mutate';
import { useUserId } from '@/lib/auth';

interface Props { open: boolean; onClose: () => void; onSaved: () => void; }

const ISSUERS = [
  { value: 'amex', label: 'American Express' },
  { value: 'capital-one', label: 'Capital One' },
  { value: 'wells-fargo', label: 'Wells Fargo' },
  { value: 'discover', label: 'Discover' },
  { value: 'chase', label: 'Chase' },
  { value: 'citi', label: 'Citi' },
  { value: 'usbank', label: 'US Bank' },
  { value: 'bofa', label: 'Bank of America' },
  { value: 'other', label: 'Other' },
];

const COLORS = ['#B8532B', '#1F6B4E', '#2E5C8A', '#5E3E7A', '#B8851F', '#1C1B18'];

export function CardModal({ open, onClose, onSaved }: Props) {
  const userId = useUserId();
  const [issuer,   setIssuer]   = useState('amex');
  const [name,     setName]     = useState('');
  const [last4,    setLast4]    = useState('');
  const [type,     setType]     = useState<'credit' | 'debit' | 'bank'>('credit');
  const [limit,    setLimit]    = useState('');
  const [payDay,   setPayDay]   = useState('');
  const [color,    setColor]    = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setIssuer('amex'); setName(''); setLast4(''); setType('credit');
    setLimit(''); setPayDay(''); setColor(COLORS[0]); setErr(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setErr('Not signed in'); return; }
    if (!name.trim()) { setErr('Card name required'); return; }
    if (!/^\d{4}$/.test(last4)) { setErr('Last 4 digits must be 4 numbers'); return; }
    setBusy(true); setErr(null);
    try {
      await insertRow('cards', userId, {
        issuer,
        name: name.trim(),
        last4,
        card_type: type,
        credit_limit: type === 'credit' && limit ? parseFloat(limit) : null,
        pay_due_day: type === 'credit' && payDay ? parseInt(payDay, 10) : null,
        color,
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
    <Modal open={open} onClose={onClose} title="Add New Card">
      <form onSubmit={submit}>
        <FormError>{err}</FormError>
        <Field label="Issuer">
          <Select value={issuer} onChange={e => setIssuer(e.target.value)}>
            {ISSUERS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </Select>
        </Field>
        <Field label="Card Name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sapphire Preferred" autoFocus />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Last 4">
            <Input value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                   placeholder="1234" maxLength={4} />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={e => setType(e.target.value as any)}>
              <option value="credit">💳 Credit</option>
              <option value="debit">🏧 Debit</option>
              <option value="bank">🏦 Bank</option>
            </Select>
          </Field>
        </div>
        {type === 'credit' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Credit Limit">
              <Input type="number" step="100" value={limit} onChange={e => setLimit(e.target.value)} placeholder="10000" />
            </Field>
            <Field label="Pay Due Day" hint="Day of month (1–31)">
              <Input type="number" min={1} max={31} value={payDay}
                     onChange={e => setPayDay(e.target.value)} placeholder="25" />
            </Field>
          </div>
        )}
        <Field label="Card Color">
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: c, cursor: 'pointer',
                        border: color === c ? '3px solid var(--text)' : '3px solid transparent',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                      aria-label={`Color ${c}`} />
            ))}
          </div>
        </Field>
        <FormActions>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Add Card'}
          </button>
        </FormActions>
      </form>
    </Modal>
  );
}
