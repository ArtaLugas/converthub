// Util pemformatan.

export function formatBytes(bytes) {
  if (bytes === 0 || bytes == null) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

// Aksen warna per kategori untuk tile ikon (teks/bg/ring).
export const CATEGORY_TINT = {
  document: 'text-sky-300 bg-sky-500/10 ring-sky-400/20',
  image: 'text-emerald-300 bg-emerald-500/10 ring-emerald-400/20',
  audiovideo: 'text-violet-300 bg-violet-500/10 ring-violet-400/20',
  data: 'text-amber-300 bg-amber-500/10 ring-amber-400/20',
  archive: 'text-slate-300 bg-slate-500/10 ring-slate-400/20',
};
