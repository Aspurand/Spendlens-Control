/* Stub screens — every screen on the SpendLens phone app gets a matching
   placeholder here so the navigation shell is wired end-to-end. Each one
   gets a real port in a later version once the design system lands. */
import type { ReactNode } from 'react';

function Shell({ title, eyebrow, children }: { title: string; eyebrow: string; children?: ReactNode }) {
  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="content">
        {children ?? <div className="placeholder">Port coming in a later version — see README roadmap.</div>}
      </div>
    </>
  );
}

export function Dashboard() { return <Shell eyebrow="Overview"   title="Dashboard" />; }
export function Finance()   { return <Shell eyebrow="Main"       title="Finance Hub" />; }
export function CashFlow()  { return <Shell eyebrow="Planning"   title="Cash Flow Calendar" />; }
export function Goals()     { return <Shell eyebrow="Planning"   title="Savings Goals" />; }
export function Debt()      { return <Shell eyebrow="Planning"   title="Debt Payoff Planner" />; }
export function Payments()  { return <Shell eyebrow="Planning"   title="Card Payments" />; }
export function Budget()    { return <Shell eyebrow="Spending"   title="Budget & Subscriptions" />; }
export function Optimizer() { return <Shell eyebrow="Spending"   title="Card Optimizer" />; }
export function Settings()  { return <Shell eyebrow="System"     title="Settings" />; }
