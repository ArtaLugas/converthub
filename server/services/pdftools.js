// Konversi PDF → DOCX / TXT via Python (pdf2docx + PyMuPDF).
// LibreOffice tidak bisa mengonversi PDF ke format Writer yang bisa diedit
// (PDF dibuka sebagai dokumen Draw), jadi arah ini memakai pdf2docx.
import path from 'node:path';
import fsp from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { nanoid } from 'nanoid';
import { TEMP_DIR } from '../config.js';
import { detectDependencies, installHint } from '../utils/deps.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, '..', 'scripts', 'pdf_convert.py');

async function runPdf(mode, inputPath, baseName, ext, mime) {
  const deps = await detectDependencies();
  if (!deps.pdf2docx) {
    const err = new Error(
      `Konversi PDF → ${ext.toUpperCase()} membutuhkan Python + pdf2docx. ${installHint('pdf2docx')}`,
    );
    err.code = 'DEP_MISSING';
    err.tool = 'pdf2docx';
    throw err;
  }

  const outputPath = path.join(TEMP_DIR, `${nanoid()}.${ext}`);
  try {
    // pdf2docx menulis banyak log ke stdout → naikkan maxBuffer.
    await execFileAsync(deps.pythonBin, [SCRIPT, mode, inputPath, outputPath], {
      timeout: 5 * 60 * 1000,
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    await fsp.unlink(outputPath).catch(() => {}); // bersihkan output parsial
    throw err;
  }
  return { outputPath, outputName: `${baseName}.${ext}`, mime };
}

export function pdfToDocx(inputPath, baseName) {
  return runPdf(
    'docx',
    inputPath,
    baseName,
    'docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );
}

export function pdfToText(inputPath, baseName) {
  return runPdf('txt', inputPath, baseName, 'txt', 'text/plain');
}
