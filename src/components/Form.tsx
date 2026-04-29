import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const fieldWrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 };
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--text-dim)',
  fontFamily: 'var(--font-mono)',
};
const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  border: '1px solid var(--border-strong)',
  borderRadius: 10,
  background: 'var(--bg-input)',
  color: 'var(--text)',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
};

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={fieldWrap}>
      <span style={labelStyle}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, minHeight: 80, resize: 'vertical', ...(props.style || {}) }} />;
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--red-soft)',
      color: 'var(--red)',
      borderRadius: 8,
      fontSize: 13,
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', gap: 8,
      marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)',
    }}>
      {children}
    </div>
  );
}
