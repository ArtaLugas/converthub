// Penyimpanan hasil konversi berbasis token (in-memory) + pembersihan file temp.
// Sesuai §6/§7 PRD: file hasil dihapus otomatis setelah diunduh atau setelah TTL.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { TEMP_DIR, RESULT_TTL_MS } from './config.js';

// token -> { filePath, downloadName, mime, size, timer }
const results = new Map();

async function safeUnlink(filePath) {
  try {
    await fsp.unlink(filePath);
  } catch {
    /* sudah terhapus — abaikan */
  }
}

export function registerResult({ filePath, downloadName, mime, size }) {
  const token = nanoid();
  const timer = setTimeout(() => remove(token), RESULT_TTL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  results.set(token, { filePath, downloadName, mime, size, timer });
  return token;
}

export function getResult(token) {
  return results.get(token);
}

export async function remove(token) {
  const entry = results.get(token);
  if (!entry) return;
  clearTimeout(entry.timer);
  results.delete(token);
  await safeUnlink(entry.filePath);
}

// Siapkan folder temp saat startup & sapu sisa dari sesi lama.
export async function initTemp() {
  await fsp.mkdir(TEMP_DIR, { recursive: true });
  const entries = await fsp.readdir(TEMP_DIR).catch(() => []);
  await Promise.all(
    entries
      .filter((name) => name !== '.gitkeep')
      .map((name) => safeUnlink(path.join(TEMP_DIR, name))),
  );
}

export function cleanupAllSync() {
  for (const entry of results.values()) {
    try {
      fs.unlinkSync(entry.filePath);
    } catch {
      /* abaikan */
    }
  }
  results.clear();
}
