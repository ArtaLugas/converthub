// Konversi gambar server-side via sharp + ICO via png-to-ico.
// Mendukung: jpg, png, webp, avif, tiff, gif (dan input heic/heif/svg/bmp/tiff/gif).
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fsp from 'node:fs/promises';
import { nanoid } from 'nanoid';
import { TEMP_DIR } from '../config.js';
import { extOf } from '../utils/fileType.js';

const OUT = {
  jpg: { ext: 'jpg', mime: 'image/jpeg' },
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  webp: { ext: 'webp', mime: 'image/webp' },
  avif: { ext: 'avif', mime: 'image/avif' },
  tiff: { ext: 'tiff', mime: 'image/tiff' },
  gif: { ext: 'gif', mime: 'image/gif' },
};

function pipelineFor(image, ext, q) {
  switch (ext) {
    case 'jpg':
      return image.jpeg({ quality: q, mozjpeg: true });
    case 'png':
      return image.png({ compressionLevel: 9 });
    case 'webp':
      return image.webp({ quality: q });
    case 'avif':
      return image.avif({ quality: q });
    case 'tiff':
      return image.tiff({ quality: q });
    case 'gif':
      return image.gif();
    default:
      return image.png();
  }
}

// Konversi gambar biasa (bukan ICO). Mengembalikan { outputPath, outputName, mime }.
export async function convertImage(inputPath, baseName, target, { quality = 85 } = {}) {
  const out = OUT[target] || OUT.png;
  const q = Math.min(100, Math.max(1, Math.round(Number(quality) || 85)));
  const outputPath = path.join(TEMP_DIR, `${nanoid()}.${out.ext}`);

  // SVG butuh density lebih tinggi agar hasil raster tajam.
  const isSvg = extOf(inputPath) === 'svg';
  const image = sharp(inputPath, { failOn: 'none', density: isSvg ? 200 : 72 });

  try {
    await pipelineFor(image, out.ext, q).toFile(outputPath);
  } catch (err) {
    if (/heif|heic|unsupported|compile|bmp/i.test(err.message)) {
      const e = new Error(
        `Gagal memproses gambar: format sumber mungkin tidak didukung build sharp di sistem ini (${err.message}).`,
      );
      e.code = 'IMG_UNSUPPORTED';
      throw e;
    }
    throw err;
  }
  return { outputPath, outputName: `${baseName}.${out.ext}`, mime: out.mime };
}

// Konversi ke ICO (favicon) — raster apa pun → PNG multi-ukuran → ICO.
export async function convertToIco(inputPath, baseName) {
  const pngBuf = await sharp(inputPath, { failOn: 'none' })
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const icoBuf = await pngToIco([pngBuf]);
  const outputPath = path.join(TEMP_DIR, `${nanoid()}.ico`);
  await fsp.writeFile(outputPath, icoBuf);
  return { outputPath, outputName: `${baseName}.ico`, mime: 'image/x-icon' };
}
