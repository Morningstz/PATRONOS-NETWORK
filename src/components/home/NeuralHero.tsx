"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Path = { d: string; key: string };

/**
 * Draws animated SVG bezier "neural" lines from each satellite to the central node.
 * Decorative only (aria-hidden). Hidden below lg; paths recompute on resize.
 */
export function NeuralNetwork({ node, nodeMobile, satellites }: { node: ReactNode; nodeMobile: ReactNode; satellites: Array<{ key: string; content: ReactNode; position: string }> }) {
  const wrap = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const satRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [paths, setPaths] = useState<Path[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const compute = () => {
      const w = wrap.current;
      const n = nodeRef.current;
      if (!w || !n) return;
      const wr = w.getBoundingClientRect();
      const nr = n.getBoundingClientRect();
      const nx = nr.left + nr.width / 2 - wr.left;
      const ny = nr.top + nr.height / 2 - wr.top;
      const next: Path[] = [];
      for (const s of satellites) {
        const el = satRefs.current[s.key];
        if (!el || el.offsetParent === null) continue;
        const r = el.getBoundingClientRect();
        const sx = r.left + r.width / 2 - wr.left;
        const sy = r.top + r.height / 2 - wr.top;
        const nLeft = nr.left - wr.left;
        const nRight = nr.right - wr.left;
        if (sx > nLeft + 40 && sx < nRight - 40) {
          // Satellite directly above/below the node: connect vertically to its nearest horizontal edge
          const below = sy > ny;
          const sEdge = below ? r.top - wr.top + 4 : r.bottom - wr.top - 4;
          const ey = below ? nr.bottom - wr.top - 4 : nr.top - wr.top + 4;
          const my = (sEdge + ey) / 2;
          // Slight S-curve: also gives the path a non-zero width so the gradient stroke renders
          next.push({ key: s.key, d: `M ${sx} ${sEdge} C ${sx + 18} ${my}, ${sx - 18} ${my}, ${sx} ${ey}` });
          continue;
        }
        // Otherwise anchor on the node's nearest vertical edge for a cleaner fan-out
        const ex = sx < nx ? nLeft + 12 : nRight - 12;
        const ey = Math.max(nr.top - wr.top + 24, Math.min(sy, nr.bottom - wr.top - 24));
        const mx = (sx + ex) / 2;
        next.push({ key: s.key, d: `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}` });
      }
      setSize({ w: wr.width, h: wr.height });
      setPaths(next);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (wrap.current) ro.observe(wrap.current);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [satellites]);

  return (
    <div ref={wrap} className="relative">
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block" width={size.w} height={size.h}>
        <defs>
          <linearGradient id="node-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#c9b8a0" stopOpacity="0.9" />
            <stop offset="1" stopColor="#a78b71" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {paths.map((p, i) => (
          <g key={p.key}>
            <path d={p.d} className="node-line" stroke="url(#node-grad)" style={{ animationDelay: `${i * 350}ms` }} />
            <path d={p.d} className="node-flow" />
          </g>
        ))}
      </svg>

      {/* Desktop: satellites float around the node */}
      <div className="relative hidden min-h-[700px] lg:block">
        {satellites.map((s) => (
          <div
            key={s.key}
            ref={(el) => {
              satRefs.current[s.key] = el;
            }}
            className={`absolute z-10 ${s.position}`}
          >
            {s.content}
          </div>
        ))}
        <div ref={nodeRef} className="absolute top-[42%] left-1/2 z-20 w-[min(540px,44vw)] -translate-x-1/2 -translate-y-1/2">
          {node}
        </div>
      </div>

      {/* Mobile: node first, satellites as a swipe row, no lines */}
      <div className="lg:hidden">
        {nodeMobile}
        <div className="shelf-track mt-6 pb-2" role="region" aria-label="Featured across the network" tabIndex={0}>
          {satellites.map((s) => (
            <div key={s.key} className="w-[240px]">
              {s.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
