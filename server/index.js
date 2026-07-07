// ConvertHub — backend Express (jalur server-side dari arsitektur hybrid).
// Menangani konversi berat/fidelitas-tinggi: dokumen, HEIC, kompres PDF, video→MP3.
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';

import { PORT, TEMP_DIR, MAX_UPLOAD_BYTES } from './config.js';
import { detectDependencies, installHint } from './utils/deps.js';
import { extOf, baseNameNoExt, sanitizeFilename } from './utils/fileType.js';
import { registerResult, getResult, remove, initTemp, cleanupAllSync } from './store.js';
import { convertDocument } from './services/document.js';
import { convertImage, convertToIco } from './services/image.js';
import { compressPdf } from './services/pdf.js';
import { convertMedia } from './services/media.js';
import { compressImage, compressVideo } from './services/compress.js';
import { pdfToDocx, pdfToText } from './services/pdftools.js';

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_DIR),
  filename: (_req, file, cb) => cb(null, `${nanoid()}${path.extname(file.originalname) || ''}`),
});
const upload = multer({ storage, limits: { fileSize: MAX_UPLOAD_BYTES } });

async function unlinkQuiet(p) {
  try {
    await fsp.unlink(p);
  } catch {
    /* abaikan */
  }
}

// --- Health / status dependensi (F-4, transparansi §6) ---------------------
app.get('/api/health', async (_req, res) => {
  const d = await detectDependencies({ fresh: true });
  res.json({
    ok: true,
    platform: process.platform,
    dependencies: {
      libreoffice: { available: d.libreoffice, hint: d.libreoffice ? null : installHint('libreoffice') },
      ghostscript: { available: d.ghostscript, hint: d.ghostscript ? null : installHint('ghostscript') },
      ffmpeg: { available: d.ffmpeg, hint: d.ffmpeg ? null : installHint('ffmpeg') },
      pdf2docx: {
        available: d.pdf2docx,
        // Bila Python ada tapi modul belum: cukup pip install.
        hint: d.pdf2docx ? null : d.pythonBin ? 'Jalankan: `pip install pdf2docx`.' : installHint('pdf2docx'),
      },
    },
    limits: { maxUploadBytes: MAX_UPLOAD_BYTES },
  });
});

// --- Endpoint konversi server-side -----------------------------------------
// Body (multipart): file, target (ekstensi tujuan), engine (sharp|ico|ffmpeg|
//   libreoffice|ghostscript|pdf2docx|pdftext), op (opsional: 'audio'|'video'|
//   'gif'|'compress'), options (JSON).
app.post('/api/convert', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });

  const originalName = sanitizeFilename(req.file.originalname);
  const inputPath = req.file.path;
  const originalSize = req.file.size;
  const source = extOf(originalName);
  const base = baseNameNoExt(originalName);
  const target = String(req.body.target || '').toLowerCase();
  const op = req.body.op || '';
  const engine = String(req.body.engine || '').toLowerCase();
  const options = safeParse(req.body.options);

  try {
    // Dispatch berdasarkan engine yang dipilih registri client (routing hybrid).
    let out;
    if (engine === 'ghostscript' || (op === 'compress' && source === 'pdf')) {
      out = await compressPdf(inputPath, base, options);
    } else if (engine === 'ffmpeg') {
      out = await convertMedia(inputPath, base, target, op || 'audio', options);
    } else if (engine === 'libreoffice') {
      out = await convertDocument(inputPath, base, target);
    } else if (engine === 'pdf2docx') {
      out = await pdfToDocx(inputPath, base);
    } else if (engine === 'pdftext') {
      out = await pdfToText(inputPath, base);
    } else if (engine === 'ico') {
      out = await convertToIco(inputPath, base);
    } else if (engine === 'sharp') {
      out = await convertImage(inputPath, base, target, options);
    } else {
      const err = new Error(`Engine konversi tidak dikenali: ${engine || '?'} (${source || '?'} → ${target || op || '?'})`);
      err.status = 400;
      throw err;
    }

    const stat = await fsp.stat(out.outputPath);
    await unlinkQuiet(inputPath);
    const token = registerResult({
      filePath: out.outputPath,
      downloadName: out.outputName,
      mime: out.mime,
      size: stat.size,
    });

    res.json({
      name: originalName,
      originalSize,
      outputSize: stat.size,
      downloadName: out.outputName,
      mime: out.mime,
      engine: out.engine,
      token,
    });
  } catch (err) {
    await unlinkQuiet(inputPath);
    sendError(res, err);
  }
});

// --- Kompresi gambar / PDF (tab "Kompres", sinkron) ------------------------
// Body (multipart): file, category ('image'|'pdf'), options (JSON).
app.post('/api/compress', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
  const originalName = sanitizeFilename(req.file.originalname);
  const inputPath = req.file.path;
  const originalSize = req.file.size;
  const base = baseNameNoExt(originalName);
  const category = req.body.category || '';
  const options = safeParse(req.body.options);

  try {
    let out;
    if (category === 'image') out = await compressImage(inputPath, base, options);
    else if (category === 'pdf') out = await compressPdf(inputPath, base, options);
    else {
      const err = new Error(`Kategori kompresi tidak didukung di server: ${category}`);
      err.status = 400;
      throw err;
    }
    const stat = await fsp.stat(out.outputPath);
    await unlinkQuiet(inputPath);
    const token = registerResult({ filePath: out.outputPath, downloadName: out.outputName, mime: out.mime, size: stat.size });
    const saved = originalSize > 0 ? 1 - stat.size / originalSize : 0;
    res.json({
      name: originalName,
      originalSize,
      outputSize: stat.size,
      savedPercent: Math.round(saved * 1000) / 10,
      downloadName: out.outputName,
      mime: out.mime,
      token,
    });
  } catch (err) {
    await unlinkQuiet(inputPath);
    sendError(res, err);
  }
});

// --- Kompresi video dengan progres real-time (SSE) -------------------------
const videoJobs = new Map(); // jobId -> { subscribers, done, error, result, lastPercent }

app.post('/api/compress/video', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
  const deps = await detectDependencies();
  if (!deps.ffmpeg) {
    await unlinkQuiet(req.file.path);
    return res.status(422).json({ error: `FFmpeg belum terpasang. ${installHint('ffmpeg')}`, code: 'DEP_MISSING', tool: 'ffmpeg' });
  }

  const jobId = nanoid();
  const job = { subscribers: new Set(), done: false, error: null, result: null, lastPercent: 0 };
  videoJobs.set(jobId, job);
  res.json({ jobId });

  const originalName = sanitizeFilename(req.file.originalname);
  const originalSize = req.file.size;
  const base = baseNameNoExt(originalName);
  const options = safeParse(req.body.options);

  compressVideo(req.file.path, base, {
    ...options,
    onProgress: (percent) => {
      job.lastPercent = percent;
      broadcast(job, { type: 'progress', percent });
    },
  })
    .then(async (out) => {
      const stat = await fsp.stat(out.outputPath);
      await unlinkQuiet(req.file.path);
      const token = registerResult({ filePath: out.outputPath, downloadName: out.outputName, mime: out.mime, size: stat.size });
      const saved = originalSize > 0 ? 1 - stat.size / originalSize : 0;
      const result = {
        name: originalName,
        originalSize,
        outputSize: stat.size,
        savedPercent: Math.round(saved * 1000) / 10,
        downloadName: out.outputName,
        mime: out.mime,
        token,
      };
      job.done = true;
      job.result = result;
      broadcast(job, { type: 'done', result });
      closeJob(job);
    })
    .catch(async (err) => {
      await unlinkQuiet(req.file.path);
      job.done = true;
      job.error = err.message || 'Gagal mengompres video.';
      broadcast(job, { type: 'error', error: job.error });
      closeJob(job);
    })
    .finally(() => setTimeout(() => videoJobs.delete(jobId), 30_000).unref?.());
});

app.get('/api/compress/video/:jobId/events', (req, res) => {
  const job = videoJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job tidak ditemukan.' });
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders?.();
  if (job.done && job.result) writeSse(res, { type: 'done', result: job.result });
  else if (job.done && job.error) writeSse(res, { type: 'error', error: job.error });
  else {
    writeSse(res, { type: 'progress', percent: job.lastPercent });
    job.subscribers.add(res);
  }
  req.on('close', () => job.subscribers.delete(res));
});

function broadcast(job, payload) {
  for (const r of job.subscribers) writeSse(r, payload);
}
function closeJob(job) {
  for (const r of job.subscribers) r.end();
  job.subscribers.clear();
}
function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// --- Unduh hasil (lalu bersihkan otomatis — §6) ----------------------------
app.get('/api/download/:token', (req, res) => {
  const entry = getResult(req.params.token);
  if (!entry || !fs.existsSync(entry.filePath)) {
    return res.status(404).json({ error: 'File tidak ditemukan atau sudah dibersihkan.' });
  }
  res.setHeader('Content-Type', entry.mime || 'application/octet-stream');
  // RFC 6266: fallback ASCII untuk browser lama + filename* UTF-8 untuk nama
  // berspasi/non-ASCII agar tak muncul %20 dsb pada nama file unduhan.
  const asciiName = entry.downloadName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(entry.downloadName)}`,
  );
  const stream = fs.createReadStream(entry.filePath);
  stream.pipe(res);
  stream.on('error', () => res.destroy());
  res.on('finish', () => remove(req.params.token));
});

// --- Util & error handling -------------------------------------------------
function safeParse(str) {
  if (!str) return {};
  try {
    return typeof str === 'string' ? JSON.parse(str) : str;
  } catch {
    return {};
  }
}

function sendError(res, err) {
  const status = err.status || (err.code === 'DEP_MISSING' ? 422 : 500);
  res.status(status).json({ error: err.message || 'Terjadi kesalahan.', code: err.code, tool: err.tool });
}

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Ukuran file melebihi batas (${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`
        : `Kesalahan upload: ${err.message}`;
    return res.status(413).json({ error: msg });
  }
  sendError(res, err);
});

// --- Startup & shutdown ----------------------------------------------------
await initTemp();
const server = app.listen(PORT, () => {
  console.log(`\n  ConvertHub backend berjalan di http://localhost:${PORT}`);
  detectDependencies({ fresh: true }).then((d) => {
    console.log(`  LibreOffice: ${d.libreoffice ? 'terdeteksi ✓' : 'tidak terpasang ✗ (konversi dokumen nonaktif)'}`);
    console.log(`  Ghostscript: ${d.ghostscript ? 'terdeteksi ✓' : 'tidak terpasang ✗ (fallback pdf-lib)'}`);
    console.log(`  FFmpeg: ${d.ffmpeg ? 'terdeteksi ✓' : 'tidak terpasang ✗ (audio/video nonaktif)'}`);
    console.log(`  pdf2docx: ${d.pdf2docx ? 'terdeteksi ✓' : 'tidak terpasang ✗ (PDF→DOCX/TXT nonaktif)'}\n`);
  });
});

function shutdown() {
  cleanupAllSync();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref?.();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
