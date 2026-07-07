// Registri konversi ConvertHub — matriks penuh lintas kategori (F-1/F-2).
//
// Setiap sourceExt → daftar target valid: { target, label, category, route, engine, op, options }.
// route 'client' diproses di browser; 'server' via backend (sharp/ffmpeg/libreoffice/ghostscript).

// ── Opsi lanjutan reusable ────────────────────────────────────────
const QUALITY = { key: 'quality', type: 'range', label: 'Kualitas', min: 1, max: 100, default: 80 };
const PDF_PRESET = {
  key: 'preset',
  type: 'select',
  label: 'Kompresi',
  default: 'ebook',
  choices: [
    { value: 'screen', label: 'Screen — terkecil' },
    { value: 'ebook', label: 'Ebook — seimbang' },
    { value: 'printer', label: 'Printer — kualitas tinggi' },
  ],
};
const AUDIO_BITRATE = {
  key: 'bitrate',
  type: 'select',
  label: 'Bitrate',
  default: '192k',
  choices: [
    { value: '128k', label: '128 kbps' },
    { value: '192k', label: '192 kbps' },
    { value: '320k', label: '320 kbps' },
  ],
};

const t = (target, label, category, route, extra = {}) => ({ target, label, category, route, options: [], ...extra });

// ── Gambar ────────────────────────────────────────────────────────
// Sumber raster umum (jpg/png/webp) bisa dikonversi di browser (Canvas);
// format lain / target lanjutan diproses server (sharp).
const LOSSY = new Set(['jpg', 'jpeg', 'webp', 'avif']);
const imgOpts = (target) => (LOSSY.has(target) ? [QUALITY] : []);
const imgClient = (target, label) => t(target, label, 'image', 'client', { options: imgOpts(target) });
const imgServer = (target, label) => t(target, label, 'image', 'server', { engine: 'sharp', options: imgOpts(target) });

const RASTER_CLIENT = ['jpg', 'png', 'webp'];
const SERVER_IMG = [
  ['avif', 'AVIF'],
  ['tiff', 'TIFF'],
  ['gif', 'GIF'],
  ['ico', 'ICO'],
];

// Target untuk sumber raster umum: 2 di browser + sisanya di server.
function commonRasterTargets(self) {
  const client = RASTER_CLIENT.filter((f) => f !== self).map((f) => imgClient(f, f.toUpperCase()));
  const server = SERVER_IMG.map(([f, l]) => (f === 'ico' ? t('ico', 'ICO', 'image', 'server', { engine: 'ico' }) : imgServer(f, l)));
  return [...client, ...server];
}

// Sumber gambar khusus (semua di server).
function serverImageTargets(list) {
  return list.map(([f, l]) => imgServer(f, l));
}

// ── Audio & Video (FFmpeg / server) ───────────────────────────────
const AUDIO = [
  ['mp3', 'MP3'],
  ['wav', 'WAV'],
  ['aac', 'AAC'],
  ['flac', 'FLAC'],
  ['ogg', 'OGG'],
  ['m4a', 'M4A'],
];
const audioTarget = (f, l) => t(f, l, 'audiovideo', 'server', { engine: 'ffmpeg', op: 'audio', options: f === 'wav' || f === 'flac' ? [] : [AUDIO_BITRATE] });
const audioTargets = (self) => AUDIO.filter(([f]) => f !== self).map(([f, l]) => audioTarget(f, l));

const videoTargets = (self) => [
  ...['mp4', 'webm']
    .filter((f) => f !== self)
    .map((f) => t(f, `${f.toUpperCase()} (video)`, 'audiovideo', 'server', { engine: 'ffmpeg', op: 'video' })),
  t('mp3', 'MP3 (audio)', 'audiovideo', 'server', { engine: 'ffmpeg', op: 'audio', options: [AUDIO_BITRATE] }),
  t('wav', 'WAV (audio)', 'audiovideo', 'server', { engine: 'ffmpeg', op: 'audio' }),
  t('gif', 'GIF (animasi)', 'audiovideo', 'server', { engine: 'ffmpeg', op: 'gif' }),
];

// ── Dokumen (LibreOffice / server) ────────────────────────────────
const doc = (target, label) => t(target, label, 'document', 'server', { engine: 'libreoffice' });

// ── Data (library JS / client) ────────────────────────────────────
const data = (target, label) => t(target, label, 'data', 'client');

// ── Matriks ───────────────────────────────────────────────────────
export const CONVERSIONS = {
  // Gambar
  jpg: commonRasterTargets('jpg'),
  jpeg: commonRasterTargets('jpg'),
  png: commonRasterTargets('png'),
  webp: commonRasterTargets('webp'),
  avif: serverImageTargets([['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP'], ['tiff', 'TIFF']]),
  tiff: serverImageTargets([['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP'], ['avif', 'AVIF']]),
  gif: [
    ...serverImageTargets([['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WebP']]),
    t('mp4', 'MP4 (video)', 'audiovideo', 'server', { engine: 'ffmpeg', op: 'video' }),
  ],
  bmp: serverImageTargets([['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WebP']]),
  heic: serverImageTargets([['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP']]),
  heif: serverImageTargets([['jpg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP']]),
  svg: serverImageTargets([['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WebP']]),
  ico: serverImageTargets([['png', 'PNG']]),

  // Audio
  mp3: audioTargets('mp3'),
  wav: audioTargets('wav'),
  aac: audioTargets('aac'),
  flac: audioTargets('flac'),
  ogg: audioTargets('ogg'),
  m4a: audioTargets('m4a'),

  // Video
  mp4: videoTargets('mp4'),
  mov: videoTargets('mov'),
  webm: videoTargets('webm'),
  avi: videoTargets('avi'),
  mkv: videoTargets('mkv'),

  // Dokumen
  docx: [doc('pdf', 'PDF'), doc('odt', 'ODT'), doc('rtf', 'RTF'), doc('txt', 'TXT'), doc('html', 'HTML')],
  doc: [doc('pdf', 'PDF'), doc('docx', 'DOCX'), doc('odt', 'ODT'), doc('txt', 'TXT')],
  odt: [doc('pdf', 'PDF'), doc('docx', 'DOCX'), doc('rtf', 'RTF'), doc('txt', 'TXT'), doc('html', 'HTML')],
  rtf: [doc('pdf', 'PDF'), doc('docx', 'DOCX'), doc('odt', 'ODT'), doc('txt', 'TXT')],
  txt: [doc('pdf', 'PDF'), doc('docx', 'DOCX'), doc('odt', 'ODT'), doc('html', 'HTML')],
  html: [doc('pdf', 'PDF'), doc('docx', 'DOCX'), doc('odt', 'ODT'), doc('txt', 'TXT')],
  pdf: [
    doc('docx', 'Word (DOCX)'),
    doc('odt', 'ODT'),
    doc('txt', 'TXT'),
    doc('html', 'HTML'),
    t('pdf', 'PDF terkompres', 'document', 'server', { engine: 'ghostscript', op: 'compress', options: [PDF_PRESET], note: 'perkecil ukuran' }),
  ],
  md: [t('html', 'HTML', 'document', 'client', { clientOp: 'md2html' })],

  // Data
  csv: [data('json', 'JSON'), data('yaml', 'YAML'), data('xlsx', 'XLSX')],
  json: [data('csv', 'CSV'), data('yaml', 'YAML'), data('xml', 'XML'), data('xlsx', 'XLSX')],
  yaml: [data('json', 'JSON'), data('xml', 'XML')],
  yml: [data('json', 'JSON'), data('xml', 'XML')],
  xml: [data('json', 'JSON'), data('yaml', 'YAML')],
  xlsx: [
    data('csv', 'CSV'),
    data('json', 'JSON'),
    t('pdf', 'PDF', 'document', 'server', { engine: 'libreoffice' }),
  ],
};

// Target universal "→ ZIP" untuk file yang tak punya konversi lain.
const ZIP_TARGET = t('zip', 'ZIP (arsip)', 'archive', 'client', { clientOp: 'zip' });

export function extOf(filename) {
  const m = /\.([a-z0-9]+)$/i.exec(filename || '');
  return m ? m[1].toLowerCase() : '';
}

export function targetsFor(filename) {
  const known = CONVERSIONS[extOf(filename)];
  if (known && known.length) return known;
  // Fallback: file apa pun boleh diarsipkan ke ZIP.
  return [ZIP_TARGET];
}

export function isSupported(filename) {
  return Boolean(CONVERSIONS[extOf(filename)]);
}

export function requiredDep(conv) {
  if (conv.route !== 'server') return null;
  if (conv.engine === 'libreoffice') return 'libreoffice';
  if (conv.engine === 'ghostscript') return 'ghostscript';
  if (conv.engine === 'ffmpeg') return 'ffmpeg';
  return null; // sharp/ico: bawaan server
}

export const CATEGORY_LABEL = {
  document: 'Dokumen',
  image: 'Gambar',
  audiovideo: 'Audio/Video',
  data: 'Data',
  archive: 'Arsip',
};

export function categoryOf(filename) {
  const list = CONVERSIONS[extOf(filename)];
  return list && list[0] ? list[0].category : 'archive';
}
