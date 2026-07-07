// Konversi audio & video via FFmpeg.
//   op 'audio' → mp3/wav/aac/flac/ogg/m4a
//   op 'video' → mp4/webm
//   op 'gif'   → video → GIF (dengan palet untuk kualitas)
import path from 'node:path';
import fsp from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { nanoid } from 'nanoid';
import { TEMP_DIR } from '../config.js';
import { detectDependencies, installHint } from '../utils/deps.js';

const execFileAsync = promisify(execFile);

const AUDIO_MIME = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
};

function audioArgs(target, bitrate) {
  const b = /^\d{2,4}k$/.test(bitrate) ? bitrate : '192k';
  switch (target) {
    case 'wav':
      return ['-vn', '-acodec', 'pcm_s16le'];
    case 'flac':
      return ['-vn', '-acodec', 'flac'];
    case 'aac':
      return ['-vn', '-acodec', 'aac', '-b:a', b];
    case 'm4a':
      return ['-vn', '-acodec', 'aac', '-b:a', b];
    case 'ogg':
      return ['-vn', '-acodec', 'libvorbis', '-b:a', b];
    case 'mp3':
    default:
      return ['-vn', '-acodec', 'libmp3lame', '-b:a', b];
  }
}

function videoArgs(target) {
  if (target === 'webm') {
    return ['-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-c:a', 'libopus'];
  }
  // mp4 (H.264/AAC), kompatibilitas luas
  return ['-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-pix_fmt', 'yuv420p'];
}

// Mengembalikan { outputPath, outputName, mime }.
export async function convertMedia(inputPath, baseName, target, op, { bitrate = '192k' } = {}) {
  const deps = await detectDependencies();
  if (!deps.ffmpeg) {
    const err = new Error(`FFmpeg belum terpasang. Konversi audio/video membutuhkannya. ${installHint('ffmpeg')}`);
    err.code = 'DEP_MISSING';
    err.tool = 'ffmpeg';
    throw err;
  }

  const outputPath = path.join(TEMP_DIR, `${nanoid()}.${target}`);
  let args;
  let mime;

  if (op === 'audio') {
    args = audioArgs(target, bitrate);
    mime = AUDIO_MIME[target] || 'audio/mpeg';
  } else if (op === 'gif') {
    args = ['-filter_complex', 'fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse', '-loop', '0'];
    mime = 'image/gif';
  } else {
    // op 'video'
    args = videoArgs(target);
    mime = target === 'webm' ? 'video/webm' : 'video/mp4';
  }

  try {
    await execFileAsync('ffmpeg', ['-y', '-i', inputPath, ...args, outputPath], { timeout: 15 * 60 * 1000 });
  } catch (err) {
    await fsp.unlink(outputPath).catch(() => {}); // bersihkan output parsial
    // Video tanpa trek audio saat diminta ekstrak audio → pesan ramah.
    if (op === 'audio' && /does not contain any stream|Output file .* does not contain/i.test(err.message)) {
      const e = new Error('Video ini tidak memiliki trek audio, sehingga tidak bisa dikonversi ke audio.');
      e.status = 400;
      throw e;
    }
    throw err;
  }
  return { outputPath, outputName: `${baseName}.${target}`, mime };
}
