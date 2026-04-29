import { NavLink } from 'react-router-dom';
import { APP_VERSION } from '@/lib/version';

// Sections mirror the phone app's side panel so muscle memory carries over.
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

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="sidebar-mark">SL</div>
        <div>
          <div className="sidebar-title">SpendLens</div>
          <div className="sidebar-sub">Control</div>
        </div>
      </div>

      <div className="sidebar-group-label">Main</div>
      {NAV_MAIN.map(n => (
        <NavLink
          key={n.to}
          to={n.to}
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
        >
          {n.label}
        </NavLink>
      ))}

      <div className="sidebar-group-label">Planning</div>
      {NAV_PLANNING.map(n => (
        <NavLink
          key={n.to}
          to={n.to}
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
        >
          {n.label}
        </NavLink>
      ))}

      <div className="sidebar-group-label">Spending</div>
      {NAV_SPENDING.map(n => (
        <NavLink
          key={n.to}
          to={n.to}
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
        >
          {n.label}
        </NavLink>
      ))}

      <div className="sidebar-group-label">System</div>
      {NAV_SETTINGS.map(n => (
        <NavLink
          key={n.to}
          to={n.to}
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
        >
          {n.label}
        </NavLink>
      ))}

      <div style={{ flex: 1 }} />

      <div className="sidebar-footer">SpendLens · v{APP_VERSION}</div>
    </aside>
  );
}
