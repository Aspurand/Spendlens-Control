interface Props {
  data: number[];
  color?: string;
  fill?: string;
  height?: number;
}

/** Thin SVG line chart with optional area fill. Stretches to container
 *  width via `preserveAspectRatio="none"`. */
export function Sparkline({ data, color = 'currentColor', fill = 'none', height = 60 }: Props) {
  if (data.length < 2) return null;
  const w = 240, h = height;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const r = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 6 - ((v - min) / r) * (h - 12),
  ]);
  const d = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  const dArea = `${d} L${w} ${h} L0 ${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {fill !== 'none' && <path d={dArea} fill={fill} opacity="0.18" />}
      <path d={d} stroke={color} strokeWidth="2" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
