// Kompresi PDF: Ghostscript utama, pdf-lib sebagai fallback.
import path from 'node:path';
import fsp from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PDFDocument } from 'pdf-lib';
import { nanoid } from 'nanoid';
import { TEMP_DIR } from '../config.js';
import { detectDependencies } from '../utils/deps.js';

const execFileAsync = promisify(execFile);

const GS_PRESET = { screen: '/screen', ebook: '/ebook', printer: '/printer' };

async function withGhostscript(bin, inputPath, outputPath, preset) {
  const setting = GS_PRESET[preset] || GS_PRESET.ebook;
  await execFileAsync(
    bin,
    [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=${setting}`,
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      '-dDetectDuplicateImages=true',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ],
    { timeout: 5 * 60 * 1000 },
  );
}

async function withPdfLib(inputPath, outputPath) {
  const bytes = await fsp.readFile(inputPath);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  await fsp.writeFile(outputPath, await doc.save({ useObjectStreams: true }));
}

// Mengembalikan { outputPath, outputName, mime, engine }.
export async function compressPdf(inputPath, baseName, { preset = 'ebook' } = {}) {
  const outputPath = path.join(TEMP_DIR, `${nanoid()}.pdf`);
  const deps = await detectDependencies();

  if (deps.ghostscript) {
    try {
      await withGhostscript(deps.ghostscriptBin, inputPath, outputPath, preset);
      return { outputPath, outputName: `${baseName}.pdf`, mime: 'application/pdf', engine: 'ghostscript' };
    } catch {
      /* jatuh ke fallback */
    }
  }
  await withPdfLib(inputPath, outputPath);
  return { outputPath, outputName: `${baseName}.pdf`, mime: 'application/pdf', engine: 'pdf-lib' };
}
