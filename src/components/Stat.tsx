import type { ReactNode } from 'react';
import { splitMoney, money } from '@/lib/format';
import { Icon } from './Icon';

interface Props {
  label: string;
  value: number;
  size?: 'md' | 'lg' | 'xl';
  delta?: number;
  /** When true, format `value` as a money amount with the cents
   *  rendered at a smaller weight per the design. Defaults to true. */
  asMoney?: boolean;
  /** Override the auto-tone (up if delta>0, down if delta<0). */
  deltaTone?: 'up' | 'down' | 'muted';
  /** Suffix appended to the delta caption (e.g. "this month"). */
  deltaCaption?: ReactNode;
}

export function Stat({
  label,
  value,
  size = 'md',
  delta,
  asMoney = true,
  deltaTone,
  deltaCaption = 'this month',
}: Props) {
  const sizeCls = size === 'xl' ? ' xl' : size === 'lg' ? ' lg' : '';
  return (
    <div>
      {label && <div className="card-title">{label}</div>}
      <div className={'stat-value' + sizeCls} style={label ? { marginTop: 8 } : undefined}>
        {asMoney ? (() => {
          const m = splitMoney(value);
          return (<>
            <span>{m.sign}{m.dollars}</span>
            <span className="cents">{m.cents}</span>
          </>);
        })() : (
          <span>{value.toLocaleString('en-US')}</span>
        )}
      </div>
      {delta !== undefined && delta !== 0 && (() => {
        const tone = deltaTone ?? (delta >= 0 ? 'up' : 'down');
        return (
          <div className={'delta ' + tone} style={{ marginTop: 6 }}>
            <Icon name={tone === 'up' ? 'arrowUp' : tone === 'down' ? 'arrowDown' : 'arrowRight'} size={13} />
            {money(Math.abs(delta))} {deltaCaption}
          </div>
        );
      })()}
    </div>
  );
}
