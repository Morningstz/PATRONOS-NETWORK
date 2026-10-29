/**
 * Deterministic generative artwork used for DEMO records, so the seed data needs
 * no third-party images or licences. Rendered as SVG at the artwork's TRUE aspect
 * ratio and in full colour (artworks are never desaturated or cropped).
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES: string[][] = [
  ["#1d1a17", "#c4532d", "#e9c46a", "#f4ede1", "#2a4b5c"],
  ["#0f1c2e", "#3e7cb1", "#9fd3c7", "#f2efe7", "#e07a5f"],
  ["#2b2118", "#a0522d", "#d9a066", "#efe2cc", "#5b6e4f"],
  ["#111111", "#e8e1d4", "#b8a993", "#6b5e4f", "#d1452f"],
  ["#1a2421", "#3f7d5c", "#c9d6a3", "#f3f0e6", "#c7883c"],
  ["#22142b", "#8c3b6b", "#e58f65", "#f6e7cf", "#3c6e8f"],
  ["#f1ebe0", "#1f2d3d", "#c0392b", "#e6b33e", "#7d8f85"],
  ["#0c2230", "#d96c3f", "#f2c14e", "#e9e4d9", "#5a8f7b"],
];

type Props = {
  seed: number;
  ratio: number; // width / height
  title: string;
  className?: string;
  /** Decorative backgrounds only (covers, banners). NEVER use for an artwork — artworks are never cropped. */
  decorativeCover?: boolean;
};

export function GenerativeArt({ seed, ratio, title, className, decorativeCover = false }: Props) {
  const rnd = mulberry32(seed * 9973 + 17);
  const pal = PALETTES[seed % PALETTES.length]!;
  const W = 1000;
  const H = Math.round(W / Math.max(0.3, Math.min(ratio, 3)));
  const style = Math.floor(seed / PALETTES.length) % 4;
  const pick = (i: number) => pal[i % pal.length]!;
  const id = `ga-${seed}`;

  const shapes: React.ReactNode[] = [];

  if (style === 0) {
    // Orbits
    const cx = W * (0.3 + rnd() * 0.4);
    const cy = H * (0.3 + rnd() * 0.4);
    const rings = 7 + Math.floor(rnd() * 6);
    for (let i = rings; i > 0; i--) {
      const r = (Math.min(W, H) * 0.62 * i) / rings;
      shapes.push(<circle key={`o${i}`} cx={cx + (rnd() - 0.5) * 40} cy={cy + (rnd() - 0.5) * 40} r={r} fill={pick(i + 1)} opacity={0.92} />);
    }
    shapes.push(
      <path
        key="arc"
        d={`M ${W * 0.08} ${H * 0.86} Q ${W * 0.5} ${H * (0.2 + rnd() * 0.3)} ${W * 0.92} ${H * 0.78}`}
        stroke={pick(4)}
        strokeWidth={10 + rnd() * 14}
        fill="none"
        strokeLinecap="round"
      />,
    );
  } else if (style === 1) {
    // Colour-field bands
    const bands = 3 + Math.floor(rnd() * 2);
    let y = H * 0.07;
    const avail = H * 0.86;
    for (let i = 0; i < bands; i++) {
      const h = (avail / bands) * (0.75 + rnd() * 0.4);
      shapes.push(
        <rect key={`b${i}`} x={W * 0.08} y={y} width={W * 0.84} height={Math.min(h, H * 0.93 - y)} rx={18} fill={pick(i + 1)} filter={`url(#${id}-soft)`} opacity={0.94} />,
      );
      y += h + H * 0.02;
      if (y > H * 0.9) break;
    }
  } else if (style === 2) {
    // Shards
    const n = 18 + Math.floor(rnd() * 14);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W;
      const yy = rnd() * H;
      const s = 90 + rnd() * 260;
      const pts = [0, 1, 2].map(() => `${x + (rnd() - 0.5) * s},${yy + (rnd() - 0.5) * s}`).join(" ");
      shapes.push(<polygon key={`s${i}`} points={pts} fill={pick(1 + (i % 4))} opacity={0.55 + rnd() * 0.4} />);
    }
    shapes.push(<circle key="sun" cx={W * (0.2 + rnd() * 0.6)} cy={H * (0.2 + rnd() * 0.3)} r={Math.min(W, H) * 0.11} fill={pick(4)} />);
  } else {
    // Bauhaus grid
    const cols = 4 + Math.floor(rnd() * 3);
    const cell = W / cols;
    const rows = Math.ceil(H / cell);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cell;
        const yy = r * cell;
        const k = Math.floor(rnd() * 4);
        const fill = pick(1 + Math.floor(rnd() * 4));
        const key = `g${r}-${c}`;
        if (k === 0) shapes.push(<circle key={key} cx={x + cell / 2} cy={yy + cell / 2} r={cell * 0.42} fill={fill} />);
        else if (k === 1) shapes.push(<path key={key} d={`M ${x} ${yy} L ${x + cell} ${yy} A ${cell} ${cell} 0 0 1 ${x} ${yy + cell} Z`} fill={fill} />);
        else if (k === 2) shapes.push(<rect key={key} x={x + cell * 0.12} y={yy + cell * 0.12} width={cell * 0.76} height={cell * 0.76} fill={fill} />);
        else shapes.push(<path key={key} d={`M ${x} ${yy + cell} L ${x + cell / 2} ${yy} L ${x + cell} ${yy + cell} Z`} fill={fill} />);
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role={decorativeCover ? undefined : "img"}
      aria-hidden={decorativeCover ? true : undefined}
      aria-label={decorativeCover ? undefined : `${title} — generated demo artwork`}
      className={className}
      style={{ width: "100%", height: decorativeCover ? "100%" : "auto", display: "block" }}
      preserveAspectRatio={decorativeCover ? "xMidYMid slice" : "xMidYMid meet"}
    >
      <defs>
        <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed % 100} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.07" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width={W} height={H} fill={pick(0)} />
      {shapes}
      <rect width={W} height={H} filter={`url(#${id}-grain)`} />
    </svg>
  );
}
