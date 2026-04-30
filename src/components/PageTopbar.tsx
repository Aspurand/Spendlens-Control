import type { ReactNode } from 'react';

interface Props {
  eyebrow: string;
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
}

/** Shared topbar for every screen — eyebrow / title / sub on the left,
 *  free-form actions on the right. */
export function PageTopbar({ eyebrow, title, sub, right }: Props) {
  return (
    <div className="topbar">
      <div className="topbar-meta">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {sub && <div className="topbar-sub">{sub}</div>}
      </div>
      {right && <div className="topbar-actions">{right}</div>}
    </div>
  );
}
