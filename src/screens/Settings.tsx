import { useState } from 'react';
import { useTable } from '@/lib/useTable';
import { APP_VERSION } from '@/lib/version';
import { SUPABASE_URL } from '@/lib/supabase';
import { Card, SyncHistoryRow } from '@/lib/types';
import { CardModal } from '@/components/modals/CardModal';
import { useUserId } from '@/lib/auth';

export default function Settings() {
  const cards = useTable<Card>('cards', { orderBy: 'created_at', ascending: true });
  const sync  = useTable<SyncHistoryRow>('sync_history', { orderBy: 'synced_at', ascending: false, limit: 25 });
  const userId = useUserId();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">System</div>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="content">
        <div className="section-title">Cards</div>
        <div className="card" style={{ padding: 0 }}>
          {cards.loading ? <Loading /> : cards.data.length === 0 ? (
            <div className="empty-row">No cards yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Issuer</th>
                  <th>Type</th>
                  <th>Last 4</th>
                  <th className="num">Limit</th>
                  <th>Pay Day</th>
                </tr>
              </thead>
              <tbody>
                {cards.data.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                    </td>
                    <td><span className="pill">{c.issuer.replace(/-/g, ' ')}</span></td>
                    <td>{c.card_type}</td>
                    <td className="mono">•••• {c.last4}</td>
                    <td className="num">{c.credit_limit ? `$${c.credit_limit}` : '—'}</td>
                    <td className="mono">{c.pay_due_day ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} disabled={!userId}>+ Add New Card</button>
        </div>

        <CardModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSaved={() => { cards.refetch(); }}
        />

        <div className="section-title">Sync History</div>
        <div className="card" style={{ padding: 0 }}>
          {sync.loading ? <Loading /> : sync.data.length === 0 ? (
            <div className="empty-row">No syncs yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Synced</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th className="num">Imported</th>
                </tr>
              </thead>
              <tbody>
                {sync.data.map((row, i) => (
                  <tr key={row.id ?? i}>
                    <td className="mono">{new Date(row.synced_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}</td>
                    <td>{row.source ?? '—'}</td>
                    <td>
                      <span className={`pill ${row.status === 'ok' ? 'green' : row.status === 'error' ? 'red' : ''}`}>
                        {row.status ?? '—'}
                      </span>
                    </td>
                    <td className="num">{row.imported_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section-title">General</div>
        <div className="grid-2">
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Export to CSV</div>
            <div className="stat-sub">Download all transactions for offline analysis.</div>
            <button className="btn" style={{ marginTop: 12 }}>Export</button>
          </div>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Force Cloud Sync</div>
            <div className="stat-sub">Manually re-pull from Supabase.</div>
            <button className="btn" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>Refresh</button>
          </div>
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--red)' }}>Clear All Data</div>
            <div className="stat-sub">Removes every transaction. Cards stay.</div>
            <button className="btn" style={{ marginTop: 12, color: 'var(--red)', borderColor: 'var(--red)' }}>Clear…</button>
          </div>
        </div>

        <div className="section-title">About</div>
        <div className="card">
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600 }}>SpendLens Control</div>
          <div className="stat-sub" style={{ marginTop: 6 }}>
            Version {APP_VERSION} · Desktop companion to the SpendLens phone PWA.
          </div>
          <div className="mono" style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
            Backend: {SUPABASE_URL}
          </div>
        </div>
      </div>
    </>
  );
}

function Loading() {
  return <div className="empty-row"><span className="spinner" />Loading…</div>;
}
