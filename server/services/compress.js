// Layanan kompresi (tab "Kompres") — memperkecil ukuran tanpa mengganti format.
//   • Gambar via sharp (kualitas + opsi WebP)
//   • Video via FFmpeg (preset CRF) dengan progres real-time
// Kompresi PDF memakai compressPdf() di services/pdf.js.
import path from 'node:path';
import fsp from 'node:fs/promises';
import sharp from 'sharp';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { nanoid } from 'nanoid';
import { TEMP_DIR } from '../config.js';
import { detectDependencies, installHint } from '../utils/deps.js';

const execFileAsync = promisify(execFile);

// ── Gambar ────────────────────────────────────────────────────────
export async function compressImage(inputPath, baseName, { quality = 75, toWebp = false } = {}) {
  const q = Math.min(100, Math.max(1, Math.round(Number(quality) || 75)));
  const image = sharp(inputPath, { failOn: 'none' });
  const meta = await image.metadata();

  let format = toWebp ? 'webp' : meta.format;
  let pipeline = image;
  let ext;
  let mime;

  switch (format) {
    case 'png':
      pipeline = pipeline.png({ quality: q, compressionLevel: 9, effort: 8, palette: true });
      ext = 'png';
      mime = 'image/png';
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: q });
      ext = 'webp';
      mime = 'image/webp';
      break;
    default:
      pipeline = pipeline.jpeg({ quality: q, mozjpeg: true });
      ext = 'jpg';
      mime = 'image/jpeg';
      break;
  }

  const outputPath = path.join(TEMP_DIR, `${nanoid()}.${ext}`);
  try {
    await pipeline.toFile(outputPath);
  } catch (err) {
    await fsp.unlink(outputPath).catch(() => {});
    throw err;
  }
  return { outputPath, outputName: `${baseName}-compressed.${ext}`, mime };
}

// ── Video ─────────────────────────────────────────────────────────
const VIDEO_PRESET = {
  high: { crf: 20, preset: 'slow' },
  balanced: { crf: 26, preset: 'medium' },
  small: { crf: 32, preset: 'faster' },
};

async function probeDuration(inputPath) {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', inputPath],
      { timeout: 30000 },
    );
    return Number(String(stdout).trim()) || 0;
  } catch {
    return 0;
  }
}

function timemarkToSeconds(tm) {
  const p = String(tm).split(':').map(Number);
  if (p.length !== 3 || p.some(Number.isNaN)) return 0;
  return p[0] * 3600 + p[1] * 60 + p[2];
}

// Memampatkan video. onProgress(percent 0..100) dipanggil berkala.
export async function compressVideo(inputPath, baseName, { preset = 'balanced', onProgress } = {}) {
  const deps = await detectDependencies();
  if (!deps.ffmpeg) {
    const err = new Error(`FFmpeg belum terpasang. Kompresi video membutuhkannya. ${installHint('ffmpeg')}`);
    err.code = 'DEP_MISSING';
    err.tool = 'ffmpeg';
    throw err;
  }

  const conf = VIDEO_PRESET[preset] || VIDEO_PRESET.balanced;
  const outputPath = path.join(TEMP_DIR, `${nanoid()}.mp4`);
  const duration = await probeDuration(inputPath);

  try {
    await new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-y',
        '-i', inputPath,
        '-c:v', 'libx264',
        '-crf', String(conf.crf),
        '-preset', conf.preset,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        outputPath,
      ]);

      let stderr = '';
      ff.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        // FFmpeg menulis "time=HH:MM:SS.xx" ke stderr saat memproses.
        const m = /time=(\d+:\d+:\d+\.\d+)/.exec(text);
        if (m && duration > 0 && typeof onProgress === 'function') {
          const pct = Math.min(99, Math.round((timemarkToSeconds(m[1]) / duration) * 100));
          onProgress(pct);
        }
      });
      ff.on('error', reject);
      ff.on('close', (code) => {
        if (code === 0) {
          onProgress?.(100);
          resolve();
        } else {
          reject(new Error(`FFmpeg gagal (kode ${code}). ${stderr.slice(-300)}`));
        }
      });
    });
  } catch (err) {
    await fsp.unlink(outputPath).catch(() => {}); // bersihkan output parsial
    throw err;
  }

  return { outputPath, outputName: `${baseName}-compressed.mp4`, mime: 'video/mp4' };
}
