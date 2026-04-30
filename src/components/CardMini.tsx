import type { Card } from '@/lib/types';

interface Props {
  card: Card;
  width?: number | string;
}

/** Stylized credit-card chip: brand on top, name + last4 on the
 *  bottom, painted with the card's saved color. */
export function CardMini({ card, width = '100%' }: Props) {
  return (
    <div className="card-mini" style={{ background: card.color || '#1A1612', width }}>
      <div className="brand">{card.issuer.replace(/-/g, ' ')}</div>
      <div>
        <div className="nm">{card.name}</div>
        <div className="l4">•••• {card.last4}</div>
      </div>
    </div>
  );
}
