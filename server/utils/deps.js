// Deteksi ketersediaan tool eksternal untuk jalur server-side.
//   - LibreOffice (soffice)  → konversi dokumen (DOCX/ODT/RTF/… → PDF, dll)
//   - Ghostscript            → kompresi PDF
//   - FFmpeg                 → audio & video
//   - Python + pdf2docx      → PDF → DOCX / TXT (LibreOffice tak bisa arah ini)
// Hasil di-cache; dipakai untuk pesan error ramah + instruksi instalasi per-OS.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';

const execFileAsync = promisify(execFile);

// Kandidat biner LibreOffice per-OS (termasuk lokasi instalasi umum di Windows).
const SOFFICE_CANDIDATES =
  process.platform === 'win32'
    ? [
        'soffice',
        'soffice.com',
        'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
      ]
    : process.platform === 'darwin'
      ? ['soffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice']
      : ['soffice', 'libreoffice'];

const GS_CANDIDATES =
  process.platform === 'win32' ? ['gswin64c', 'gswin32c', 'gs'] : ['gs'];

const PYTHON_CANDIDATES =
  process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];

let cache = null;

async function canRun(cmd, args) {
  try {
    await execFileAsync(cmd, args, { timeout: 8000 });
    return true;
  } catch (err) {
    // ENOENT = biner tidak ada. Error lain berarti binernya ada.
    return err.code !== 'ENOENT';
  }
}

async function resolveFrom(candidates, versionArgs) {
  for (const bin of candidates) {
    // Path absolut: cek keberadaan file dulu agar cepat.
    if (bin.includes('\\') || bin.includes('/')) {
      if (fs.existsSync(bin)) return bin;
      continue;
    }
    if (await canRun(bin, versionArgs)) return bin;
  }
  return null;
}

// Python untuk PDF→DOCX/TXT (pdf2docx + PyMuPDF). Cari biner python yang jalan,
// lalu cek modul pdf2docx & fitz tersedia (tanpa meng-import penuh agar cepat).
async function resolvePython() {
  for (const bin of PYTHON_CANDIDATES) {
    try {
      await execFileAsync(bin, ['--version'], { timeout: 8000 });
      return bin;
    } catch (err) {
      if (err.code !== 'ENOENT') return bin; // ada, tapi exit non-zero
    }
  }
  return null;
}

async function hasPdf2docx(pythonBin) {
  if (!pythonBin) return false;
  try {
    await execFileAsync(
      pythonBin,
      ['-c', "import importlib.util as u,sys; sys.exit(0 if u.find_spec('pdf2docx') and u.find_spec('fitz') else 1)"],
      { timeout: 12000 },
    );
    return true;
  } catch {
    return false;
  }
}

export async function detectDependencies({ fresh = false } = {}) {
  if (cache && !fresh) return cache;

  const sofficeBin = await resolveFrom(SOFFICE_CANDIDATES, ['--version']);
  const ghostscriptBin = await resolveFrom(GS_CANDIDATES, ['--version']);
  const ffmpeg = await canRun('ffmpeg', ['-version']);
  const pythonBin = await resolvePython();
  const pdf2docx = await hasPdf2docx(pythonBin);

  cache = {
    libreoffice: Boolean(sofficeBin),
    sofficeBin,
    ghostscript: Boolean(ghostscriptBin),
    ghostscriptBin,
    ffmpeg,
    pythonBin,
    pdf2docx,
  };
  return cache;
}

export const INSTALL_HINTS = {
  libreoffice: {
    win32: 'Windows: unduh dari https://www.libreoffice.org/download atau `winget install TheDocumentFoundation.LibreOffice`.',
    darwin: 'macOS: `brew install --cask libreoffice`.',
    linux: 'Linux: `sudo apt install libreoffice` (Debian/Ubuntu) atau padanan distro Anda.',
  },
  ghostscript: {
    win32: 'Windows: unduh dari https://ghostscript.com/releases/ atau `choco install ghostscript`.',
    darwin: 'macOS: `brew install ghostscript`.',
    linux: 'Linux: `sudo apt install ghostscript`.',
  },
  ffmpeg: {
    win32: 'Windows: `winget install Gyan.FFmpeg` (lalu restart terminal).',
    darwin: 'macOS: `brew install ffmpeg`.',
    linux: 'Linux: `sudo apt install ffmpeg`.',
  },
  pdf2docx: {
    win32: 'Windows: pasang Python 3 (https://python.org), lalu `pip install pdf2docx`.',
    darwin: 'macOS: `brew install python`, lalu `pip3 install pdf2docx`.',
    linux: 'Linux: `sudo apt install python3-pip`, lalu `pip3 install pdf2docx`.',
  },
};

export function installHint(tool) {
  const perOs = INSTALL_HINTS[tool];
  if (!perOs) return '';
  return perOs[process.platform] || perOs.linux;
}
