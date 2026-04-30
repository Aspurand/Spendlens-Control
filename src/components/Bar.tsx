type Tone = 'gold' | 'teal' | 'green' | 'warn' | 'ink';

interface Props {
  pct: number;
  tone?: Tone;
}

/** Horizontal progress bar. Pct is clamped to [0, 100]. Default tone
 *  is `ink` (the dark fill); gold matches the design's accent. */
export function Bar({ pct, tone = 'ink' }: Props) {
  const cls = tone === 'ink' ? 'bar-fill' : `bar-fill ${tone}`;
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="bar-track">
      <div className={cls} style={{ width: `${w}%` }} />
    </div>
  );
}
