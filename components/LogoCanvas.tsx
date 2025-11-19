'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';

export type LogoStyle = 'Minimalist' | 'Playful' | 'Corporate' | 'Futuristic';
export type Aspect = '1:1' | '4:5' | '9:16';

export interface LogoSpec {
  campaignName: string;
  tagline: string;
  primary: string;
  secondary: string;
  accent: string;
  style: LogoStyle;
  seed: string;
  aspect: Aspect;
}

function hashToInt(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function prng(seed: string) {
  let s = hashToInt(seed) || 1;
  return () => {
    // xorshift*
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function sizeByAspect(aspect: Aspect): { w: number; h: number } {
  switch (aspect) {
    case '4:5':
      return { w: 800, h: 1000 };
    case '9:16':
      return { w: 900, h: 1600 };
    default:
      return { w: 1000, h: 1000 };
  }
}

function getFontFamily(style: LogoStyle): string {
  switch (style) {
    case 'Corporate':
      return 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
    case 'Futuristic':
      return 'Rajdhani, Orbitron, Inter, ui-sans-serif, system-ui';
    case 'Playful':
      return 'Poppins, Quicksand, Inter, ui-sans-serif, system-ui';
    default:
      return 'Inter, ui-sans-serif, system-ui';
  }
}

function generateGlyphPaths(rnd: () => number, style: LogoStyle) {
  const shapes = ['circle', 'triangle', 'diamond', 'hex', 'swoosh', 'spark'];
  const layout = pick(rnd, ['stack', 'row', 'cluster']);
  const glyph = pick(rnd, shapes);

  const elems: Array<{
    type: string;
    attrs: Record<string, string | number>;
  }> = [];

  const baseX = 140;
  const baseY = 140;
  const unit = 80;

  const layers = style === 'Futuristic' ? 4 : style === 'Playful' ? 5 : 3;
  for (let i = 0; i < layers; i++) {
    const jitter = style === 'Playful' ? (rnd() - 0.5) * 14 : (rnd() - 0.5) * 6;
    const x = baseX + (layout === 'row' ? i * unit * 0.6 : layout === 'cluster' ? (rnd() - 0.5) * 60 : 0) + jitter;
    const y = baseY + (layout === 'stack' ? i * unit * 0.55 : layout === 'cluster' ? (rnd() - 0.5) * 60 : 0) + jitter;
    const scale = 1 - i * (style === 'Minimalist' ? 0.1 : 0.12 + rnd() * 0.05);
    const rotate = (rnd() - 0.5) * (style === 'Corporate' ? 6 : 22);
    const opacity = 0.9 - i * 0.18;

    switch (glyph) {
      case 'circle':
        elems.push({ type: 'circle', attrs: { cx: x, cy: y, r: 50 * scale, opacity } });
        break;
      case 'triangle':
        {
          const p = [
            [x, y - 56 * scale],
            [x - 48 * scale, y + 40 * scale],
            [x + 48 * scale, y + 40 * scale],
          ];
          elems.push({ type: 'polygon', attrs: { points: p.map((q) => q.join(',')).join(' '), transform: `rotate(${rotate} ${x} ${y})`, opacity } });
        }
        break;
      case 'diamond':
        {
          const p = [
            [x, y - 60 * scale],
            [x + 60 * scale, y],
            [x, y + 60 * scale],
            [x - 60 * scale, y],
          ];
          elems.push({ type: 'polygon', attrs: { points: p.map((q) => q.join(',')).join(' '), transform: `rotate(${rotate} ${x} ${y})`, opacity } });
        }
        break;
      case 'hex':
        {
          const p: Array<[number, number]> = [];
          for (let k = 0; k < 6; k++) {
            const a = ((Math.PI * 2) / 6) * k + (rotate * Math.PI) / 180;
            p.push([x + Math.cos(a) * 56 * scale, y + Math.sin(a) * 56 * scale]);
          }
          elems.push({ type: 'polygon', attrs: { points: p.map((q) => q.join(',')).join(' '), opacity } });
        }
        break;
      case 'swoosh':
        {
          const path = `M ${x - 60} ${y} C ${x - 20} ${y - 80}, ${x + 40} ${y + 80}, ${x + 90} ${y}`;
          elems.push({ type: 'path', attrs: { d: path, strokeWidth: 18 * scale, fill: 'none', opacity } });
        }
        break;
      case 'spark':
        {
          const len = 70 * scale;
          elems.push({ type: 'line', attrs: { x1: x - len, y1: y, x2: x + len, y2: y, strokeWidth: 12 * scale, opacity } });
          elems.push({ type: 'line', attrs: { x1: x, y1: y - len, x2: x, y2: y + len, strokeWidth: 12 * scale, opacity } });
          elems.push({ type: 'line', attrs: { x1: x - len * 0.7, y1: y - len * 0.7, x2: x + len * 0.7, y2: y + len * 0.7, strokeWidth: 8 * scale, opacity } });
          elems.push({ type: 'line', attrs: { x1: x - len * 0.7, y1: y + len * 0.7, x2: x + len * 0.7, y2: y - len * 0.7, strokeWidth: 8 * scale, opacity } });
        }
        break;
    }
  }

  return elems;
}

export default function LogoCanvas({
  spec,
  showBounds = false,
}: {
  spec: LogoSpec;
  showBounds?: boolean;
}) {
  const rnd = useMemo(() => prng(spec.seed + spec.campaignName + spec.style), [spec]);
  const { w, h } = useMemo(() => sizeByAspect(spec.aspect), [spec.aspect]);
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const glyphs = useMemo(() => generateGlyphPaths(rnd, spec.style), [rnd, spec.style]);
  const font = getFontFamily(spec.style);

  async function downloadPNG() {
    if (!ref.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 3, skipFonts: false });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${spec.campaignName || 'logo'}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  function downloadSVG() {
    const svg = document.getElementById('svg-' + spec.seed) as SVGSVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    let src = serializer.serializeToString(svg);
    if (!src.match(/^<svg[^>]+xmlns=/)) {
      src = src.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.campaignName || 'logo'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        className="card relative"
        style={{
          width: w,
          height: h,
          background: 'transparent',
        }}
      >
        {showBounds && <div className="absolute inset-0 rounded-xl border border-white/10" />}
        <svg
          id={'svg-' + spec.seed}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={'g1-' + spec.seed} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={spec.primary} />
              <stop offset="100%" stopColor={spec.accent} />
            </linearGradient>
            <linearGradient id={'g2-' + spec.seed} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={spec.secondary} />
              <stop offset="100%" stopColor={spec.primary} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={w} height={h} fill="transparent" />

          <g transform={`translate(${w * 0.08}, ${h * 0.16})`}>
            {glyphs.map((g, i) => {
              const stroke = i % 2 === 0 ? `url(#g1-${spec.seed})` : `url(#g2-${spec.seed})`;
              const fill = g.type === 'path' || g.type === 'line' ? 'none' : stroke;
              const strokeWidth = g.type === 'line' ? (g.attrs['strokeWidth'] as number) : 10;
              const common = {
                fill,
                stroke,
                strokeWidth,
                strokeLinejoin: 'round' as const,
                strokeLinecap: 'round' as const,
                opacity: g.attrs.opacity ?? 1,
              };
              if (g.type === 'circle') {
                const { cx, cy, r } = g.attrs as any;
                return <circle key={i} cx={cx} cy={cy} r={r} {...common} />;
              }
              if (g.type === 'polygon') {
                const { points, transform } = g.attrs as any;
                return <polygon key={i} points={points} transform={transform} {...common} />;
              }
              if (g.type === 'path') {
                const { d } = g.attrs as any;
                return <path key={i} d={d} {...common} />;
              }
              if (g.type === 'line') {
                const { x1, y1, x2, y2 } = g.attrs as any;
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} {...common} />;
              }
              return null;
            })}
          </g>

          <g transform={`translate(${w * 0.08}, ${h * 0.16})`}>
            <text
              x={240}
              y={220}
              fontFamily={font}
              fontSize={78}
              fontWeight={700}
              fill="white"
              letterSpacing="0.5px"
            >
              {spec.campaignName || 'Your Campaign'}
            </text>
            <text
              x={240}
              y={260}
              fontFamily={font}
              fontSize={24}
              fontWeight={400}
              fill="rgba(226,232,240,0.9)"
            >
              {spec.tagline || 'High-impact Meta creative'}
            </text>
          </g>
        </svg>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-ghost" onClick={downloadSVG}>Download SVG</button>
        <button className="btn btn-primary" onClick={downloadPNG} disabled={downloading}>
          {downloading ? 'Rendering?' : 'Download PNG'}
        </button>
      </div>
    </div>
  );
}
