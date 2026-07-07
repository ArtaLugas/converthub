// Konversi dokumen berfidelitas tinggi via LibreOffice headless.
//   DOCX/DOC → PDF, PDF → DOCX.
import path from 'node:path';
import fsp from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { nanoid } from 'nanoid';
import { TEMP_DIR } from '../config.js';
import { detectDependencies, installHint } from '../utils/deps.js';

const execFileAsync = promisify(execFile);

// Filter output LibreOffice per format tujuan.
const TARGET_FILTER = {
  pdf: 'pdf',
  docx: 'docx:MS Word 2007 XML',
  doc: 'doc',
  rtf: 'rtf:Rich Text Format',
  txt: 'txt:Text',
  html: 'html',
  odt: 'odt',
};

// Menjalankan LibreOffice untuk mengonversi satu file ke format tujuan.
// Mengembalikan { outputPath, outputName, mime }.
export async function convertDocument(inputPath, baseName, target) {
  const deps = await detectDependencies();
  if (!deps.libreoffice) {
    const err = new Error(
      `LibreOffice belum terpasang. Konversi dokumen membutuhkannya. ${installHint('libreoffice')}`,
    );
    err.code = 'DEP_MISSING';
    err.tool = 'libreoffice';
    throw err;
  }

  const filter = TARGET_FILTER[target];
  if (!filter) {
    const err = new Error(`Format tujuan dokumen tidak didukung: ${target}`);
    err.status = 400;
    throw err;
  }

  // Folder keluaran unik + profil user unik agar aman untuk konversi paralel
  // (LibreOffice mengunci profil default bila dipakai bersamaan).
  const workId = nanoid();
  const outDir = path.join(TEMP_DIR, `doc-${workId}`);
  await fsp.mkdir(outDir, { recursive: true });
  const profileDir = path.join(TEMP_DIR, `profile-${workId}`);

  const args = [
    '--headless',
    '--norestore',
    '--nolockcheck',
    `-env:UserInstallation=file:///${profileDir.replace(/\\/g, '/')}`,
    '--convert-to',
    filter,
    '--outdir',
    outDir,
    inputPath,
  ];

  try {
    await execFileAsync(deps.sofficeBin, args, { timeout: 3 * 60 * 1000 });

    // LibreOffice bisa menghasilkan >1 file (mis. HTML + gambar aset); pilih
    // file yang berekstensi tujuan, bukan sekadar entri pertama (readdir tak urut).
    const entries = await fsp.readdir(outDir);
    const produced = entries.find((f) => f.toLowerCase().endsWith(`.${target}`)) || entries[0];
    if (!produced) throw new Error('LibreOffice tidak menghasilkan file keluaran.');

    const finalPath = path.join(TEMP_DIR, `${workId}.${target}`);
    await fsp.rename(path.join(outDir, produced), finalPath);

    return {
      outputPath: finalPath,
      outputName: `${baseName}.${target}`,
      mime: MIME[target] || 'application/octet-stream',
    };
  } finally {
    // Bersihkan folder kerja & profil sementara.
    await fsp.rm(outDir, { recursive: true, force: true }).catch(() => {});
    await fsp.rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  rtf: 'application/rtf',
  txt: 'text/plain',
  html: 'text/html',
  odt: 'application/vnd.oasis.opendocument.text',
};
