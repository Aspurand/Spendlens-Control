import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { APP_VERSION } from '@/lib/version';
import { useAuth } from '@/lib/auth';
import { Icon, type IconName } from './Icon';

const NAV: { group: string; items: { to: string; label: string; icon: IconName }[] }[] = [
  { group: 'Main', items: [
    { to: '/dashboard', label: 'Dashboard',          icon: 'home' },
    { to: '/finance',   label: 'Finance Hub',        icon: 'wallet' },
  ]},
  { group: 'Planning', items: [
    { to: '/cashflow',  label: 'Cash Flow Calendar', icon: 'calendar' },
    { to: '/goals',     label: 'Savings Goals',      icon: 'target' },
    { to: '/debt',      label: 'Debt Payoff',        icon: 'debt' },
    { to: '/payments',  label: 'Card Payments',      icon: 'card' },
  ]},
  { group: 'Spending', items: [
    { to: '/budget',    label: 'Budget & Subs',      icon: 'pie' },
    { to: '/optimizer', label: 'Card Optimizer',     icon: 'sparkles' },
  ]},
  { group: 'System', items: [
    { to: '/settings',  label: 'Settings',           icon: 'settings' },
  ]},
];

export function Sidebar() {
  const { session, signIn, signInWithEmail, signOut, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSendLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const r = await signInWithEmail(email);
    setSending(false);
    if (r.sent) setSent(true);
  }
  const user = session?.user;
  const meta = (user?.user_metadata as Record<string, unknown> | undefined) ?? {};
  const fullName = (meta.full_name as string) || (meta.name as string) || user?.email || '';
  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || null;
  const initials = (fullName || 'U').split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="sidebar-mark">SL</div>
        <div>
          <div className="sidebar-title">SpendLens</div>
          <div className="sidebar-sub">Control</div>
        </div>
      </div>

      <div className="sidebar-search" role="button" aria-label="Search (coming soon)">
        <Icon name="search" size={14} />
        <span>Search…</span>
        <span className="kbd">⌘K</span>
      </div>

      {NAV.map(g => (
        <div key={g.group}>
          <div className="sidebar-group-label">{g.group}</div>
          {g.items.map(it => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
            >
              <Icon name={it.icon} size={17} className="nav-icon" />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </div>
      ))}

      {!loading && (
        session ? (
          <div className="sidebar-foot">
            <div className="avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="sidebar-foot-name">{fullName || 'Signed in'}</div>
              <div className="sidebar-foot-sub">Personal · v{APP_VERSION}</div>
            </div>
            <button
              onClick={signOut}
              className="sidebar-signout"
              title="Sign out"
              aria-label="Sign out"
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        ) : (
          <div style={{ margin: '0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sent ? (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(75, 194, 168, 0.15)',
                color: '#9DC78A',
                borderRadius: 10,
                fontSize: 12,
                lineHeight: 1.4,
              }}>
                Check <b>{email}</b> for a one-click sign-in link.
                <button
                  onClick={() => { setSent(false); setEmail(''); }}
                  style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'inherit', textDecoration: 'underline', opacity: 0.8 }}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={onSendLink} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 249, 245, 0.15)',
                    background: 'rgba(255, 249, 245, 0.06)',
                    color: 'var(--off-100)',
                    fontSize: 12.5,
                  }}
                />
                <button type="submit" className="sidebar-signin" disabled={sending} style={{ margin: 0, width: '100%' }}>
                  {sending ? 'Sending…' : 'Send sign-in link'}
                </button>
              </form>
            )}
            <button
              onClick={signIn}
              style={{
                marginTop: 4,
                padding: '6px 10px',
                fontSize: 11.5,
                fontWeight: 500,
                color: 'rgba(255, 249, 245, 0.55)',
                borderRadius: 8,
              }}
            >
              or sign in with Google
            </button>
            {error && (
              <div style={{
                marginTop: 4,
                padding: '8px 10px',
                background: 'rgba(193, 58, 87, 0.18)',
                color: '#F2A2B0',
                borderRadius: 8,
                fontSize: 11,
                lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}
          </div>
        )
      )}

      {!session && !loading && (
        <div className="sidebar-foot" style={{ paddingTop: 4 }}>
          <div style={{ fontSize: 10, color: 'rgba(255, 249, 245, 0.4)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            v{APP_VERSION}
          </div>
        </div>
      )}
    </aside>
  );
}
