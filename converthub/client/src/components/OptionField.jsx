// Kontrol opsi lanjutan yang dipakai bersama oleh kartu Konversi & Kompres.
// Mendukung tipe: range (slider), select (dropdown), toggle (switch).
export default function OptionField({ opt, value, disabled, onChange }) {
  if (opt.type === 'range') {
    return (
      <label className="flex flex-1 items-center gap-3 text-sm">
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">{opt.label}</span>
        <input type="range" min={opt.min} max={opt.max} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
        <span className="w-10 rounded-md bg-white/[0.04] py-0.5 text-center font-mono text-xs text-slate-200">{value}</span>
      </label>
    );
  }
  if (opt.type === 'select') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{opt.label}</span>
        <select className="select-dark py-1.5" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
          {opt.choices.map((ch) => (
            <option key={ch.value} value={ch.value}>
              {ch.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (opt.type === 'toggle') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className="flex items-center gap-2.5 text-sm text-slate-300 disabled:opacity-50"
      >
        <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${value ? 'bg-brand-500' : 'bg-white/10'}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </span>
        {opt.label}
      </button>
    );
  }
  return null;
}
