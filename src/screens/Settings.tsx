import { useState } from 'react';
import { useTable } from '@/lib/useTable';
import { useUserId, useAuth } from '@/lib/auth';
import { APP_VERSION } from '@/lib/version';
import { SUPABASE_URL } from '@/lib/supabase';
import { Card, SyncHistoryRow } from '@/lib/types';
import { PageTopbar } from '@/components/PageTopbar';
import { Icon, type IconName } from '@/components/Icon';
import { CardModal } from '@/components/modals/CardModal';

export default function Settings() {
  const cards = useTable<Card>('cards', { orderBy: 'created_at', ascending: true });
  const sync  = useTable<SyncHistoryRow>('sync_history', { orderBy: 'synced_at', ascending: false, limit: 25 });
  const userId = useUserId();
  const { session } = useAuth();
  const [showAdd, setShowAdd] = useState(false);

  const meta = (session?.user.user_metadata as Record<string, unknown> | undefined) ?? {};
  const name = (meta.full_name as string) || (meta.name as string) || session?.user.email || 'Not signed in';
  const email = session?.user.email || '—';

  return (
    <>
      <PageTopbar eyebrow="System" title="Settings" />

      <div className="content page-fade">
        <div className="grid-12">
          <div className="col-span-4">
            <div className="card">
              <div className="card-title">Profile</div>
              <div className="row gap-12 center" style={{ marginTop: 14 }}>
                <div className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>
                  {((meta.avatar_url as string | undefined) || (meta.picture as string | undefined))
                    ? <img src={(meta.avatar_url as string) || (meta.picture as string)} alt="" />
                    : (name.split(/\s+/).slice(0, 2).map((s: string) => s[0]?.toUpperCase()).join('') || 'U')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div className="muted small">{email}</div>
                </div>
              </div>
              <div className="muted small" style={{ marginTop: 12 }}>
                {session ? <>Signed in via Google.</> : <>Sign in from the sidebar to write changes.</>}
              </div>
            </div>
          </div>

          <div className="col-span-8 col gap-16">
            {(session ? [
              { title: 'Connected accounts', sub: `${cards.data.length} card${cards.data.length === 1 ? '' : 's'} · last synced just now`, icon: 'refresh' as IconName, cta: 'Refresh', onClick: () => { cards.refetch(); sync.refetch(); } },
              { title: 'Sync history',     sub: `${sync.data.length} entries`, icon: 'trend' as IconName, cta: 'View',  onClick: undefined },
              { title: 'Export data',      sub: 'Download CSV (coming soon)', icon: 'download' as IconName, cta: 'Export', onClick: undefined, disabled: true },
              { title: 'Keyboard shortcuts', sub: '⌘K search · ⌘N add expense', icon: 'keyboard' as IconName, cta: 'View', onClick: undefined, disabled: true },
            ] : [
              { title: 'Sign in', sub: 'Use the sidebar — Google OAuth via Supabase', icon: 'shield' as IconName, cta: 'Open', onClick: undefined, disabled: true },
            ]).map(r => (
              <div key={r.title} className="card row between center">
                <div className="row gap-12 center">
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-alt)', display: 'grid', placeItems: 'center' }}>
                    <Icon name={r.icon} size={16} />
                  </div>
                  <div>
                    <div className="bold">{r.title}</div>
                    <div className="muted small">{r.sub}</div>
                  </div>
                </div>
                <button className="btn sm" onClick={r.onClick} disabled={(r as any).disabled}>
                  {r.cta} <Icon name="chevronRight" size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Cards</div>
            <button className="btn sm primary" onClick={() => setShowAdd(true)} disabled={!userId}>
              <Icon name="plus" size={12} /> Add card
            </button>
          </div>
          <CardModal open={showAdd} onClose={() => setShowAdd(false)}
                     onSaved={() => { cards.refetch(); }} />
          {cards.loading ? <Loading /> : cards.data.length === 0 ? (
            <div className="empty">No cards yet.</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Name</th><th>Issuer</th><th>Type</th><th>Last 4</th><th className="right">Limit</th><th>Pay Day</th></tr></thead>
              <tbody>
                {cards.data.map(c => (
                  <tr key={c.id}>
                    <td className="bold">
                      <span className="row center gap-8">
                        <span style={{ width: 28, height: 18, borderRadius: 4, background: c.color || 'var(--dark-900)' }} />
                        {c.name}
                      </span>
                    </td>
                    <td><span className="chip">{c.issuer.replace(/-/g, ' ')}</span></td>
                    <td className="muted">{c.card_type}</td>
                    <td className="mono">•••• {c.last4}</td>
                    <td className="right num">{c.credit_limit ? '$' + Number(c.credit_limit).toLocaleString('en-US') : '—'}</td>
                    <td className="mono">{c.pay_due_day ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Sync history</div>
          </div>
          {sync.loading ? <Loading /> : sync.data.length === 0 ? (
            <div className="empty">No syncs yet.</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Synced</th><th>Source</th><th>Status</th><th className="right">Imported</th></tr></thead>
              <tbody>
                {sync.data.map((row, i) => (
                  <tr key={row.id ?? i}>
                    <td className="muted">{new Date(row.synced_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}</td>
                    <td>{row.source ?? '—'}</td>
                    <td>
                      <span className={'chip ' + (row.status === 'ok' ? 'good' : row.status === 'error' ? 'warn' : '')}>
                        {row.status ?? '—'}
                      </span>
                    </td>
                    <td className="right num">{row.imported_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card cream">
          <div className="card-title">About</div>
          <div className="row between center" style={{ marginTop: 8 }}>
            <div>
              <div className="bold" style={{ fontSize: 16 }}>SpendLens Control</div>
              <div className="muted small" style={{ marginTop: 4 }}>
                Version {APP_VERSION} · Desktop companion to the SpendLens phone PWA.
              </div>
            </div>
            <div className="muted mono tiny">{SUPABASE_URL}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function Loading() {
  return <div className="empty"><span className="spinner" />Loading…</div>;
}
