// Banner transparansi: menampilkan tool server yang belum terpasang + jalur pemrosesan.
export default function DependencyBanner({ health }) {
  if (!health) return null;
  const deps = health.dependencies || {};
  const missing = Object.entries(deps).filter(([, v]) => !v.available);
  if (missing.length === 0) return null;

  const affected = {
    libreoffice: 'konversi dokumen (DOCX/ODT/RTF → PDF, dll)',
    ffmpeg: 'audio & video',
    ghostscript: 'kompres PDF (memakai fallback)',
    pdf2docx: 'PDF → DOCX / TXT',
  };

  return (
    <div className="animate-fade-up rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-100">
            Sebagian konversi server butuh tool tambahan
          </p>
          <p className="mt-1 text-xs text-amber-100/60">
            Konversi yang diproses di browser (gambar, CSV↔JSON) tetap berjalan normal.
          </p>
          <ul className="mt-2.5 space-y-2.5">
            {missing.map(([name, v]) => (
              <li key={name} className="text-sm text-amber-100/70">
                <span className="font-semibold capitalize text-amber-100">{name}</span>
                {affected[name] ? ` — dibutuhkan untuk ${affected[name]}.` : '.'}
                <code className="mt-1 block rounded-md bg-black/20 px-2 py-1 font-mono text-[11px] text-amber-200/80">
                  {v.hint}
                </code>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
