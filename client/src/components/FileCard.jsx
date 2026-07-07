import { CATEGORY_ICON_COMPONENT, DownloadIcon, CloseIcon, RetryIcon, ArrowIcon, DeviceIcon, ServerIcon } from './icons.jsx';
import { formatBytes, CATEGORY_TINT } from '../lib/format.js';
import { requiredDep } from '../lib/conversions.js';
import OptionField from './OptionField.jsx';

// Kartu satu file: sumber → target, opsi, jalur, status, progres, hasil (F-2/F-4/F-6/F-7).
export default function FileCard({ item, health, disabled, onSelectTarget, onOptionsChange, onRemove, onDownload, onRetry }) {
  const { name, size, category, sourceExt, targets, targetIdx, status, progress, result, error } = item;
  const Icon = CATEGORY_ICON_COMPONENT[category] || CATEGORY_ICON_COMPONENT.data;
  const unsupported = targets.length === 0;
  const conv = targets[targetIdx];

  // Cek ketersediaan dependensi server untuk target terpilih.
  const dep = conv ? requiredDep(conv) : null;
  const depAvailable = !dep || health?.dependencies?.[dep]?.available !== false;

  return (
    <div className="card animate-fade-up p-4 transition-colors hover:border-white/[0.11] sm:p-5">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${CATEGORY_TINT[category]}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-100" title={name}>
                {name}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                <span className="uppercase">{sourceExt || '?'}</span> · {formatBytes(size)}
              </p>
            </div>
            <StatusBadge status={status} unsupported={unsupported} />
          </div>

          {unsupported ? (
            <p className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-sm text-slate-400">
              Format <span className="font-medium text-slate-300">.{sourceExt}</span> belum didukung
              pada MVP ini.
            </p>
          ) : (
            <>
              {/* Pemilih target + jalur (hanya saat menunggu) */}
              {status === 'ready' && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Konversi ke</span>
                    <div className="flex items-center gap-2">
                      <ArrowIcon className="h-4 w-4 text-slate-600" />
                      <select
                        className="select-dark"
                        value={targetIdx}
                        disabled={disabled}
                        onChange={(e) => onSelectTarget(Number(e.target.value))}
                      >
                        {targets.map((t, i) => (
                          <option key={t.target + i} value={i}>
                            {t.label}
                            {t.note ? ` — ${t.note}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <RouteBadge route={conv.route} />
                  </div>

                  {/* Opsi lanjutan (F-6) */}
                  {conv.options?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      {conv.options.map((opt) => (
                        <OptionField
                          key={opt.key}
                          opt={opt}
                          value={item.options[opt.key] ?? opt.default}
                          disabled={disabled}
                          onChange={(v) => onOptionsChange({ ...item.options, [opt.key]: v })}
                        />
                      ))}
                    </div>
                  )}

                  {/* Peringatan dependensi server belum tersedia */}
                  {!depAvailable && (
                    <p className="rounded-lg border border-amber-400/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200/80">
                      Butuh <span className="font-semibold capitalize">{dep}</span> terpasang di
                      server untuk konversi ini. Lihat panduan di atas.
                    </p>
                  )}
                </div>
              )}

              {/* Progres */}
              {status === 'processing' && (
                <div className="mt-4">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-300"
                      style={{ width: `${progress || 15}%` }}
                    />
                    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Mengonversi{conv.route === 'client' ? ' di browser' : ' di server'}…
                  </p>
                </div>
              )}

              {/* Hasil */}
              {status === 'done' && result && (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">{formatBytes(size)}</span>
                    <ArrowIcon className="h-3.5 w-3.5 text-slate-600" />
                    <span className="font-semibold text-slate-100">{formatBytes(result.outputSize)}</span>
                    <span className="rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-xs font-medium text-emerald-300">
                      {result.outputName.split('.').pop().toUpperCase()}
                    </span>
                  </div>
                  <button onClick={() => onDownload(item)} className="btn-primary ml-auto px-3 py-1.5 text-xs">
                    <DownloadIcon className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              )}

              {/* Error + coba ulang (F-4) */}
              {status === 'error' && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="flex-1 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                  <button onClick={() => onRetry(item)} className="btn-ghost px-3 py-1.5 text-xs">
                    <RetryIcon className="h-3.5 w-3.5" />
                    Coba lagi
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {status !== 'processing' && (
          <button
            onClick={onRemove}
            title="Hapus dari daftar"
            className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function RouteBadge({ route }) {
  const client = route === 'client';
  const Icon = client ? DeviceIcon : ServerIcon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        client ? 'bg-emerald-500/10 text-emerald-300' : 'bg-sky-500/10 text-sky-300'
      }`}
      title={client ? 'Diproses di browser Anda — file tidak diunggah' : 'Diproses di server lokal'}
    >
      <Icon className="h-3.5 w-3.5" />
      {client ? 'Di browser' : 'Di server'}
    </span>
  );
}

function StatusBadge({ status, unsupported }) {
  if (unsupported) {
    return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-slate-400">Tak didukung</span>;
  }
  const map = {
    ready: { label: 'Siap', dot: 'bg-slate-400', cls: 'text-slate-300 bg-white/[0.05]' },
    processing: { label: 'Memproses', dot: 'bg-amber-400 animate-pulse-soft', cls: 'text-amber-200 bg-amber-500/10' },
    done: { label: 'Selesai', dot: 'bg-emerald-400', cls: 'text-emerald-200 bg-emerald-500/10' },
    error: { label: 'Gagal', dot: 'bg-red-400', cls: 'text-red-200 bg-red-500/10' },
  };
  const s = map[status] || map.ready;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
