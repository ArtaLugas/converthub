// Registri kompresi (tab "Kompres") — deteksi kategori + opsi per kategori.
import { extOf } from './conversions.js';

const IMAGE = new Set(['jpg', 'jpeg', 'png', 'webp']);
const VIDEO = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi']);

// Kategori kompresi sebuah file.
export function compressCategoryOf(filename) {
  const ext = extOf(filename);
  if (IMAGE.has(ext)) return 'image';
  if (ext === 'pdf') return 'document';
  if (VIDEO.has(ext)) return 'audiovideo';
  return 'archive'; // file lain → diarsipkan ke ZIP
}

// Jalur pemrosesan per kategori kompresi.
export function compressRoute(category) {
  return category === 'archive' ? 'client' : 'server';
}

// Dependensi server yang dibutuhkan (untuk cek ketersediaan).
export function compressRequiredDep(category) {
  if (category === 'document') return 'ghostscript'; // fallback pdf-lib tetap jalan
  if (category === 'audiovideo') return 'ffmpeg';
  return null; // gambar (sharp) & arsip (client) tak butuh tool eksternal
}

// Opsi lanjutan per kategori.
export const COMPRESS_OPTIONS = {
  image: [
    { key: 'quality', type: 'range', label: 'Kualitas', min: 1, max: 100, default: 75 },
    { key: 'toWebp', type: 'toggle', label: 'Konversi ke WebP', default: false },
  ],
  document: [
    {
      key: 'preset',
      type: 'select',
      label: 'Tingkat',
      default: 'ebook',
      choices: [
        { value: 'screen', label: 'Screen — terkecil' },
        { value: 'ebook', label: 'Ebook — seimbang' },
        { value: 'printer', label: 'Printer — kualitas tinggi' },
      ],
    },
  ],
  audiovideo: [
    {
      key: 'preset',
      type: 'select',
      label: 'Preset',
      default: 'balanced',
      choices: [
        { value: 'high', label: 'Kualitas tinggi' },
        { value: 'balanced', label: 'Seimbang' },
        { value: 'small', label: 'Ukuran kecil' },
      ],
    },
  ],
  archive: [],
};

export function defaultCompressOptions(category) {
  const o = {};
  (COMPRESS_OPTIONS[category] || []).forEach((opt) => (o[opt.key] = opt.default));
  return o;
}

// Label ringkas aksi kompresi per kategori (ditampilkan di kartu).
export const COMPRESS_ACTION = {
  image: 'Kompres gambar',
  document: 'Kompres PDF',
  audiovideo: 'Kompres video',
  archive: 'Arsipkan ke ZIP',
};
