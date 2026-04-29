import { NavLink } from 'react-router-dom';
import { APP_VERSION } from '@/lib/version';
import { useAuth } from '@/lib/auth';

const NAV_MAIN = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/finance',   label: 'Finance Hub' },
];
const NAV_PLANNING = [
  { to: '/cashflow', label: 'Cash Flow Calendar' },
  { to: '/goals',    label: 'Savings Goals' },
  { to: '/debt',     label: 'Debt Payoff Planner' },
  { to: '/payments', label: 'Card Payments' },
];
const NAV_SPENDING = [
  { to: '/budget',    label: 'Budget & Subscriptions' },
  { to: '/optimizer', label: 'Card Optimizer' },
];
const NAV_SETTINGS = [
  { to: '/settings', label: 'Settings' },
];

function NavGroup({ label, items }: { label: string; items: { to: string; label: string }[] }) {
  return (
    <>
      <div className="sidebar-group-label">{label}</div>
      {items.map(n => (
        <NavLink
          key={n.to}
          to={n.to}
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
        >
          {n.label}
        </NavLink>
      ))}
    </>
  );
}

export function Sidebar() {
  const { session, signIn, signOut, loading } = useAuth();
  const user = session?.user;
  const name = (user?.user_metadata as any)?.full_name
            || (user?.user_metadata as any)?.name
            || user?.email
            || 'Signed in';

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="sidebar-mark">SL</div>
        <div>
          <div className="sidebar-title">SpendLens</div>
          <div className="sidebar-sub">Control</div>
        </div>
      </div>

      <NavGroup label="Main" items={NAV_MAIN} />
      <NavGroup label="Planning" items={NAV_PLANNING} />
      <NavGroup label="Spending" items={NAV_SPENDING} />
      <NavGroup label="System" items={NAV_SETTINGS} />

      <div style={{ flex: 1 }} />

      {!loading && (
        <div style={{
          margin: '0 12px 10px',
          padding: 10,
          background: 'rgba(255, 249, 245, 0.04)',
          borderRadius: 10,
          fontSize: 12,
        }}>
          {session ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {(user?.user_metadata as any)?.avatar_url ? (
                  <img
                    src={(user!.user_metadata as any).avatar_url}
                    alt=""
                    style={{ width: 26, height: 26, borderRadius: '50%' }}
                  />
                ) : (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'var(--accent)', color: '#fff',
                    display: 'grid', placeItems: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>
                    {(name as string).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div style={{
                  minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', color: '#fff', fontWeight: 600,
                }}>
                  {name}
                </div>
              </div>
              <button
                onClick={signOut}
                style={{
                  width: '100%', padding: '6px 10px',
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(255, 249, 245, 0.15)',
                  borderRadius: 8,
                  color: 'rgba(255, 249, 245, 0.7)',
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <div style={{ color: 'rgba(255, 249, 245, 0.7)', marginBottom: 8 }}>
                Sign in to write changes
              </div>
              <button
                onClick={signIn}
                style={{
                  width: '100%', padding: '8px 10px',
                  fontSize: 12, fontWeight: 600,
                  background: 'var(--accent)', color: '#fff',
                  borderRadius: 8,
                }}
              >
                Sign in with Google
              </button>
            </>
          )}
        </div>
      )}

      <div className="sidebar-footer">SpendLens · v{APP_VERSION}</div>
    </aside>
  );
}
