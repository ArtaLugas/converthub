// Util nama file & ekstensi untuk backend.
import path from 'node:path';

export function extOf(filename) {
  return path.extname(filename || '').replace('.', '').toLowerCase();
}

export function baseNameNoExt(filename) {
  return path.parse(filename || 'file').name || 'file';
}

// Membersihkan nama file dari karakter berbahaya / path traversal.
export function sanitizeFilename(name) {
  const base = path.basename(name || 'file');
  return base.replace(/[^\w.\-() ]+/g, '_').slice(0, 200) || 'file';
}
