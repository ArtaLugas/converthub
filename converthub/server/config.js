// Konfigurasi terpusat untuk backend ConvertHub.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PORT = Number(process.env.PORT) || 3002;

// Folder kerja untuk file temporer (unggahan + hasil konversi).
export const TEMP_DIR = path.join(__dirname, 'temp');

// Batas ukuran unggahan untuk jalur server (default 200 MB untuk MVP).
export const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 200) * 1024 * 1024;

// Retensi hasil sebelum dibersihkan otomatis (default 1 jam) — sesuai §6 PRD.
export const RESULT_TTL_MS = (Number(process.env.RESULT_TTL_MIN) || 60) * 60 * 1000;
