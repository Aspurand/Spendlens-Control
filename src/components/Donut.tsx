interface Segment { value: number; color: string }
interface Props {
  size?: number;
  stroke?: number;
  segments: Segment[];
}

/** SVG donut chart — concentric arcs sized by `value`. Empty segments
 *  collapse to nothing; total of 0 renders just the track ring. */
export function Donut({ size = 180, stroke = 22, segments }: Props) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke="var(--surface-sunk)" strokeWidth={stroke} fill="none"
      />
      {total > 0 && segments.map((s, i) => {
        const len = (s.value / total) * C;
        const dash = `${len} ${C - len}`;
        const el = (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={r}
            stroke={s.color} strokeWidth={stroke} fill="none"
            strokeDasharray={dash} strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}
