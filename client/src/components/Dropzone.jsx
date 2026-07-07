import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadIcon } from './icons.jsx';

// Area drag-and-drop + klik-pilih + tempel clipboard (F-1).
export default function Dropzone({ onFiles, active = true }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  const handleSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  // Tempel gambar/file dari clipboard (F-1) — hanya tab aktif yang menangkap.
  useEffect(() => {
    if (!active) return undefined;
    const onPaste = (e) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length) onFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onFiles, active]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl px-6 py-16 text-center outline-none transition-all duration-300 ${
        dragging ? 'border border-brand-400/60 bg-brand-500/[0.07] shadow-glow' : 'card hover:border-white/[0.14] hover:bg-white/[0.04]'
      }`}
    >
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleSelect} />

      <div
        className={`pointer-events-none absolute -top-24 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl transition-opacity duration-500 ${
          dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
        }`}
      />

      <div
        className={`relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] text-brand-200 transition-transform duration-300 ${
          dragging ? 'scale-110' : 'group-hover:scale-105'
        }`}
      >
        <UploadIcon className="h-7 w-7" />
      </div>

      <p className="relative text-lg font-semibold text-slate-100">
        {dragging ? 'Lepaskan untuk menambahkan' : 'Seret file ke sini'}
        {!dragging && (
          <>
            {' '}
            atau <span className="text-brand-gradient font-semibold">telusuri</span>
          </>
        )}
      </p>
      <p className="relative mt-2 max-w-md text-sm text-slate-400">
        Dokumen, gambar, video, atau data — banyak file sekaligus. Format sumber terdeteksi
        otomatis dan target yang relevan langsung disarankan.
      </p>

      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
        {['PDF', 'DOCX', 'XLSX', 'JPG', 'PNG', 'WEBP', 'AVIF', 'HEIC', 'SVG', 'MP4', 'MP3', 'WAV', 'GIF', 'CSV', 'JSON', 'YAML', 'XML'].map((t) => (
          <span
            key={t}
            className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] font-medium tracking-wide text-slate-400"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
