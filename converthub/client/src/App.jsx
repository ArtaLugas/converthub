import { useEffect, useState } from 'react';
import ConvertView from './views/ConvertView.jsx';
import CompressView from './views/CompressView.jsx';
import DependencyBanner from './components/DependencyBanner.jsx';
import { LogoMark, ShieldIcon } from './components/icons.jsx';
import { fetchHealth } from './lib/api.js';

const TABS = [
  { id: 'convert', label: 'Konversi' },
  { id: 'compress', label: 'Kompres' },
];

export default function App() {
  const [tab, setTab] = useState('convert');
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      {/* ── Top nav dengan tab ────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-600/30">
              <LogoMark className="h-5 w-5" />
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight text-slate-100 sm:inline">
              Convert<span className="text-brand-gradient">Hub</span>
            </span>
          </div>

          {/* Segmented tab control */}
          <nav className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            {TABS.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  tab === tb.id ? 'bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tb.label}
              </button>
            ))}
          </nav>

          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[11px] font-medium text-emerald-300 sm:inline-flex">
            <ShieldIcon className="h-3.5 w-3.5" />
            Privasi
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <DependencyBanner health={health} />

        {/* Kedua view tetap mounted agar state tiap tab terjaga saat berpindah */}
        <div className={tab === 'convert' ? 'space-y-5' : 'hidden'}>
          <ConvertView health={health} active={tab === 'convert'} />
        </div>
        <div className={tab === 'compress' ? 'space-y-5' : 'hidden'}>
          <CompressView health={health} active={tab === 'compress'} />
        </div>

        <PricingStrip />
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-slate-600 sm:flex-row">
          <span>ConvertHub · Konversi & Kompres · berjalan di localhost</span>
          <span>File server dihapus otomatis setelah diunduh</span>
        </div>
      </footer>
    </div>
  );
}

function PricingStrip() {
  return (
    <div className="card mt-5 flex flex-col items-start justify-between gap-4 overflow-hidden p-5 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-semibold text-slate-100">Butuh file besar, batch tanpa batas, & akses API?</p>
        <p className="mt-1 text-sm text-slate-400">
          ConvertHub <span className="text-brand-gradient font-semibold">Pro</span> — file hingga beberapa GB, prioritas antrian, bebas iklan.
        </p>
      </div>
      <button disabled title="Segera hadir (Fase 2)" className="btn-ghost cursor-not-allowed whitespace-nowrap opacity-60">
        Segera hadir
      </button>
    </div>
  );
}
