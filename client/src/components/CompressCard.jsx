import { CATEGORY_ICON_COMPONENT, DownloadIcon, CloseIcon, RetryIcon, ArrowIcon, DeviceIcon, ServerIcon } from './icons.jsx';
import { formatBytes, CATEGORY_TINT } from '../lib/format.js';
import { COMPRESS_OPTIONS, COMPRESS_ACTION, compressRoute, compressRequiredDep } from '../lib/compress.js';
import OptionField from './OptionField.jsx';

// Kartu satu file di tab Kompres.
export default function CompressCard({ item, health, disabled, onOptionsChange, onRemove, onDownload, onRetry }) {
  const { name, size, category, sourceExt, status, progress, result, error } = item;
  const Icon = CATEGORY_ICON_COMPONENT[category] || CATEGORY_ICON_COMPONENT.archive;
  const opts = COMPRESS_OPTIONS[category] || [];
  const route = compressRoute(category);
  const dep = compressRequiredDep(category);
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
            <StatusBadge status={status} />
          </div>

          {status === 'ready' && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">{COMPRESS_ACTION[category]}</span>
                <RouteBadge route={route} />
              </div>
              {opts.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  {opts.map((opt) => (
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
              {!depAvailable && (
                <p className="rounded-lg border border-amber-400/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200/80">
                  Butuh <span className="font-semibold capitalize">{dep}</span> terpasang di server. Lihat panduan di atas.
                </p>
              )}
            </div>
          )}

          {status === 'processing' && (
            <div className="mt-4">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-300" style={{ width: `${progress || 12}%` }} />
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">{progress ? `Mengompres… ${progress}%` : 'Mengompres…'}</p>
            </div>
          )}

          {status === 'done' && result && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500 line-through decoration-slate-600">{formatBytes(size)}</span>
                <ArrowIcon className="h-3.5 w-3.5 text-slate-600" />
                <span className="font-semibold text-slate-100">{formatBytes(result.outputSize)}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                    result.savedPercent >= 0 ? 'bg-emerald-500/12 text-emerald-300' : 'bg-white/[0.06] text-slate-300'
                  }`}
                >
                  {result.savedPercent >= 0 ? `−${result.savedPercent}%` : `+${Math.abs(result.savedPercent)}%`}
                </span>
              </div>
              <button onClick={() => onDownload(item)} className="btn-primary ml-auto px-3 py-1.5 text-xs">
                <DownloadIcon className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="flex-1 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3 py-2 text-sm text-red-300">{error}</p>
              <button onClick={() => onRetry(item)} className="btn-ghost px-3 py-1.5 text-xs">
                <RetryIcon className="h-3.5 w-3.5" />
                Coba lagi
              </button>
            </div>
          )}
        </div>

        {status !== 'processing' && (
          <button onClick={onRemove} title="Hapus dari daftar" className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-200">
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${client ? 'bg-emerald-500/10 text-emerald-300' : 'bg-sky-500/10 text-sky-300'}`}
      title={client ? 'Diproses di browser Anda' : 'Diproses di server lokal'}
    >
      <Icon className="h-3.5 w-3.5" />
      {client ? 'Di browser' : 'Di server'}
    </span>
  );
}

function StatusBadge({ status }) {
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
