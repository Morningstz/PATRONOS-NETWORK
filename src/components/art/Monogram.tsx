/** Generated monogram logo for records without an uploaded logo. Stays in the gold/bronze spectrum. */
export function Monogram({ name, hue = 30, size = 56, className = "" }: { name: string; hue?: number | null; size?: number; className?: string }) {
  const initials = name
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  // Clamp hue into warm bronze range (22–42) so brand accents never drift to blue/purple.
  const h = 22 + (((hue ?? 30) % 21) + 21) % 21;
  return (
    <div
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-2xl border border-white/10 ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, hsl(${h} 28% 20%), hsl(${h} 22% 9%))`,
      }}
    >
      <span className="display text-gold-hover" style={{ fontSize: size * 0.4, fontWeight: 600 }}>
        {initials}
      </span>
    </div>
  );
}

/** Abstract portrait placeholder for DEMO creators — no real faces are used. */
export function AbstractPortrait({ name, hue = 30, className = "" }: { name: string; hue?: number | null; className?: string }) {
  const h = ((hue ?? 30) % 360 + 360) % 360;
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const id = `p-${h}-${seed}`;
  const tilt = (seed % 9) - 4; // slight head turn, unique per creator
  const lightX = seed % 2 === 0 ? 0.22 : 0.78;
  return (
    <svg viewBox="0 0 400 500" role="img" aria-label={`Abstract portrait placeholder for ${name}`} className={className} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <radialGradient id={`${id}-bg`} cx={lightX} cy="0.2" r="1">
          <stop offset="0" stopColor={`hsl(${h} 55% 52%)`} />
          <stop offset="0.55" stopColor={`hsl(${(h + 25) % 360} 40% 22%)`} />
          <stop offset="1" stopColor={`hsl(${(h + 40) % 360} 30% 8%)`} />
        </radialGradient>
        <linearGradient id={`${id}-fig`} x1={lightX} y1="0" x2={1 - lightX} y2="1">
          <stop offset="0" stopColor={`hsl(${(h + 15) % 360} 35% 62%)`} />
          <stop offset="0.5" stopColor={`hsl(${(h + 15) % 360} 30% 42%)`} />
          <stop offset="1" stopColor={`hsl(${(h + 15) % 360} 25% 18%)`} />
        </linearGradient>
        <filter id={`${id}-blur`}>
          <feGaussianBlur stdDeviation="28" />
        </filter>
        <filter id={`${id}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed % 97} />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.09" />
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="400" height="500" fill={`url(#${id}-bg)`} />
      <g filter={`url(#${id}-blur)`} opacity="0.7">
        <circle cx={60 + (seed % 280)} cy={90 + (seed % 120)} r="90" fill={`hsl(${(h + 180) % 360} 45% 45%)`} />
        <circle cx={340 - (seed % 200)} cy={330} r="110" fill={`hsl(${(h + 60) % 360} 50% 40%)`} />
      </g>
      <g transform={`rotate(${tilt} 200 230)`}>
        <ellipse cx="200" cy="205" rx="78" ry="96" fill={`url(#${id}-fig)`} />
        <path d="M 168 285 L 232 285 L 238 330 L 162 330 Z" fill={`url(#${id}-fig)`} />
      </g>
      <path d="M 40 500 C 52 380, 120 330, 200 326 C 280 330, 348 380, 360 500 Z" fill={`url(#${id}-fig)`} />
      <rect width="400" height="500" filter={`url(#${id}-grain)`} />
    </svg>
  );
}
