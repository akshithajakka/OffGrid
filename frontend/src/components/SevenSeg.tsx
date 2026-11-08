// Seven-segment countdown digits drawn in SVG (no font needed, works offline).
const W = 30;
const H = 54;
const T = 4.5; // segment thickness
const P = 3.5; // inset

const hSeg = (x: number, y: number, len: number) =>
  `${x},${y} ${x + T / 2},${y - T / 2} ${x + len - T / 2},${y - T / 2} ${x + len},${y} ${x + len - T / 2},${y + T / 2} ${x + T / 2},${y + T / 2}`;
const vSeg = (x: number, y: number, len: number) =>
  `${x},${y} ${x + T / 2},${y + T / 2} ${x + T / 2},${y + len - T / 2} ${x},${y + len} ${x - T / 2},${y + len - T / 2} ${x - T / 2},${y + T / 2}`;

const half = H / 2;
const SEGS: Record<string, string> = {
  a: hSeg(P + 1.5, P, W - 2 * P - 3),
  g: hSeg(P + 1.5, half, W - 2 * P - 3),
  d: hSeg(P + 1.5, H - P, W - 2 * P - 3),
  f: vSeg(P, P + 1.5, half - P - 3),
  b: vSeg(W - P, P + 1.5, half - P - 3),
  e: vSeg(P, half + 1.5, half - P - 3),
  c: vSeg(W - P, half + 1.5, half - P - 3),
};
const DIGITS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
};

function Digit({ d }: { d: string }) {
  const on = DIGITS[d] ?? '';
  return (
    <svg viewBox={`-1 -1 ${W + 2} ${H + 2}`} className="h-[54px] w-[30px]" aria-hidden="true">
      {Object.entries(SEGS).map(([k, pts]) => (
        <polygon
          key={k}
          points={pts}
          fill={on.includes(k) ? 'rgba(255,59,48,0.18)' : 'none'}
          stroke={on.includes(k) ? '#FF3B30' : '#2B1212'}
          strokeWidth={1.6}
        />
      ))}
    </svg>
  );
}

export function SevenSegClock({ values, labels }: { values: number[]; labels: string[] }) {
  const text = values.map((v, i) => `${v} ${labels[i].toLowerCase()}`).join(', ');
  return (
    <div role="timer" aria-label={`Elapsed ${text}`} className="flex items-start gap-1.5">
      {values.map((v, i) => (
        <div key={labels[i]} className="flex items-start gap-1.5">
          {i > 0 && (
            <div className="flex h-[54px] flex-col justify-center gap-2.5 px-0.5" aria-hidden="true">
              <span className="size-1.5 bg-seg" />
              <span className="size-1.5 bg-seg" />
            </div>
          )}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex gap-1">
              {String(v).padStart(2, '0').split('').map((c, j) => <Digit key={j} d={c} />)}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">{labels[i]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
