// Konversi client-side (di browser) — privasi maksimal, file tak meninggalkan perangkat.
//   • Gambar raster (JPG/PNG/WebP) via Canvas
//   • Data: CSV/JSON/YAML/XML/XLSX saling-silang via library JS
//   • Markdown → HTML (marked)
//   • File apa pun → ZIP (fflate)
import YAML from 'yaml';
import * as XLSX from 'xlsx';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { marked } from 'marked';
import { zipSync } from 'fflate';
import { extOf } from './conversions.js';

const IMG_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function baseName(name) {
  return name.replace(/\.[^.]+$/, '') || 'file';
}

// ── Gambar via Canvas ─────────────────────────────────────────────
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal membaca gambar di browser.'));
    };
    img.src = url;
  });
}

async function convertImageClient(file, target, { quality = 80 } = {}) {
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (target === 'jpg' || target === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0);
  const mime = IMG_MIME[target] || 'image/png';
  const q = Math.min(1, Math.max(0.01, (Number(quality) || 80) / 100));
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Konversi gambar gagal.'))), mime, target === 'png' ? undefined : q),
  );
  return { blob, outputName: `${baseName(file.name)}.${target === 'jpeg' ? 'jpg' : target}`, mime };
}

// ── Data: parser universal ────────────────────────────────────────
function parseCsvToObjects(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const clean = rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
  if (clean.length === 0) return [];
  const headers = clean[0];
  return clean.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      const v = r[i] ?? '';
      if (v === '') obj[h] = '';
      else if (/^-?\d+(\.\d+)?$/.test(v)) obj[h] = Number(v);
      else if (v === 'true' || v === 'false') obj[h] = v === 'true';
      else obj[h] = v;
    });
    return obj;
  });
}

function escapeCsv(value) {
  const s = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function objectsToCsv(arr) {
  if (arr.length === 0) return '';
  const headers = [];
  const seen = new Set();
  for (const row of arr) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      for (const k of Object.keys(row)) if (!seen.has(k)) (seen.add(k), headers.push(k));
    }
  }
  if (headers.length === 0) return arr.map((v) => escapeCsv(v)).join('\n');
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of arr) lines.push(headers.map((h) => escapeCsv(row?.[h])).join(','));
  return lines.join('\n');
}

// Pastikan nilai jadi array-of-objects untuk target tabular (csv/xlsx).
function toTabular(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    // Bila objek berisi satu properti array, pakai itu.
    const vals = Object.values(value);
    if (vals.length === 1 && Array.isArray(vals[0])) return vals[0];
    return [value];
  }
  return [{ value }];
}

async function parseSource(file) {
  const ext = extOf(file.name);
  if (ext === 'xlsx') {
    const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
  const text = await file.text();
  if (ext === 'csv') return parseCsvToObjects(text);
  if (ext === 'json') return JSON.parse(text);
  if (ext === 'yaml' || ext === 'yml') return YAML.parse(text);
  if (ext === 'xml') return new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(text);
  throw new Error(`Format data tidak dikenali: ${ext}`);
}

function serializeTarget(value, target, srcBase) {
  switch (target) {
    case 'json':
      return { data: new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), mime: 'application/json' };
    case 'csv':
      return { data: new Blob([objectsToCsv(toTabular(value))], { type: 'text/csv' }), mime: 'text/csv' };
    case 'yaml':
      return { data: new Blob([YAML.stringify(value)], { type: 'text/yaml' }), mime: 'text/yaml' };
    case 'xml': {
      // fast-xml-parser butuh satu root; bungkus bila perlu.
      const root = value && typeof value === 'object' && !Array.isArray(value) ? value : { root: value };
      const xml = new XMLBuilder({ ignoreAttributes: false, format: true, attributeNamePrefix: '@_' }).build(root);
      return { data: new Blob([xml], { type: 'application/xml' }), mime: 'application/xml' };
    }
    case 'xlsx': {
      const ws = XLSX.utils.json_to_sheet(toTabular(value));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      return {
        data: new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }
    default:
      throw new Error(`Target data tidak didukung: ${target}`);
  }
}

async function convertData(file, target) {
  const value = await parseSource(file);
  const { data, mime } = serializeTarget(value, target, baseName(file.name));
  return { blob: data, outputName: `${baseName(file.name)}.${target}`, mime };
}

// ── Markdown → HTML ───────────────────────────────────────────────
async function convertMarkdown(file) {
  const md = await file.text();
  const body = marked.parse(md);
  const html = `<!doctype html>\n<html lang="id">\n<head>\n<meta charset="utf-8">\n<title>${baseName(file.name)}</title>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
  return { blob: new Blob([html], { type: 'text/html' }), outputName: `${baseName(file.name)}.html`, mime: 'text/html' };
}

// ── File apa pun → ZIP ────────────────────────────────────────────
async function convertZip(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const zipped = zipSync({ [file.name]: bytes }, { level: 6 });
  return { blob: new Blob([zipped], { type: 'application/zip' }), outputName: `${baseName(file.name)}.zip`, mime: 'application/zip' };
}

// Dispatcher konversi client-side. Mengembalikan { blob, outputName, mime }.
export async function convertClientSide(file, conv, options = {}) {
  if (conv.clientOp === 'md2html') return convertMarkdown(file);
  if (conv.clientOp === 'zip') return convertZip(file);
  if (conv.category === 'image') return convertImageClient(file, conv.target, options);
  if (conv.category === 'data') return convertData(file, conv.target);
  throw new Error('Konversi client-side tidak tersedia untuk kategori ini.');
}
