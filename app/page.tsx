'use client';
import LogoCanvas, { Aspect, LogoSpec, LogoStyle } from '@/components/LogoCanvas';
import { generatePaletteFromSeed, normalizeHex } from '@/lib/color';
import { useMemo, useState } from 'react';
import JSZip from 'jszip';

export default function Page() {
  const [campaignName, setCampaignName] = useState('OrbitPay');
  const [tagline, setTagline] = useState('Frictionless payments');
  const [style, setStyle] = useState<LogoStyle>('Futuristic');
  const [aspect, setAspect] = useState<Aspect>('1:1');
  const [seed, setSeed] = useState('A');

  const palette = useMemo(() => generatePaletteFromSeed(campaignName + style), [campaignName, style]);
  const [primary, setPrimary] = useState(palette.primary);
  const [secondary, setSecondary] = useState(palette.secondary);
  const [accent, setAccent] = useState(palette.accent);

  // keep palette in sync when campaign/style changes and user hasn't edited fields
  useMemo(() => {
    setPrimary(palette.primary);
    setSecondary(palette.secondary);
    setAccent(palette.accent);
  }, [palette.primary, palette.secondary, palette.accent]);

  const variations = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => ({
      campaignName,
      tagline,
      primary: normalizeHex(primary),
      secondary: normalizeHex(secondary),
      accent: normalizeHex(accent),
      style,
      seed: `${seed}-${i + 1}`,
      aspect,
    })) as LogoSpec[];
  }, [campaignName, tagline, primary, secondary, accent, style, seed, aspect]);

  async function downloadKit() {
    const zip = new JSZip();
    const meta = {
      campaignName,
      tagline,
      style,
      colors: { primary, secondary, accent },
      aspect,
      generatedAt: new Date().toISOString(),
    };
    zip.file('brand.json', JSON.stringify(meta, null, 2));
    // Collect the first three DOM nodes for PNG export
    const nodes: HTMLElement[] = Array.from(document.querySelectorAll('[data-logo-node]')).slice(0, 3) as any;
    if (nodes.length === 0) return;
    const { toPng } = await import('html-to-image');
    let idx = 1;
    for (const node of nodes) {
      const dataUrl = await toPng(node, { pixelRatio: 3, skipFonts: false });
      const b64 = dataUrl.split(',')[1]!;
      zip.file(`logo-${idx}.png`, b64, { base64: true });
      // also SVG if available
      const svg = node.querySelector('svg');
      if (svg) {
        const s = new XMLSerializer().serializeToString(svg);
        zip.file(`logo-${idx}.svg`, s, { binary: false });
      }
      idx++;
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaignName.replace(/\s+/g, '-')}-brand-kit.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="space-y-8">
      <section className="card p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300">Campaign name</label>
              <input className="input" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-300">Tagline</label>
              <input className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-300">Primary</label>
                <input className="input" value={primary} onChange={(e) => setPrimary(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-300">Secondary</label>
                <input className="input" value={secondary} onChange={(e) => setSecondary(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-300">Accent</label>
                <input className="input" value={accent} onChange={(e) => setAccent(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300">Style</label>
              <select className="select" value={style} onChange={(e) => setStyle(e.target.value as LogoStyle)}>
                <option>Minimalist</option>
                <option>Playful</option>
                <option>Corporate</option>
                <option>Futuristic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300">Aspect</label>
              <select className="select" value={aspect} onChange={(e) => setAspect(e.target.value as Aspect)}>
                <option>1:1</option>
                <option>4:5</option>
                <option>9:16</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300">Seed</label>
              <input className="input" value={seed} onChange={(e) => setSeed(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button className="btn btn-primary" onClick={() => setSeed(Math.random().toString(36).slice(2, 8))}>
              Regenerate variations
            </button>
            <button className="btn btn-ghost" onClick={downloadKit}>Download brand kit</button>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-auto-fit gap-6">
          {variations.map((v) => (
            <div key={v.seed} className="p-3 card" data-logo-node>
              <LogoCanvas spec={v} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
