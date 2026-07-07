// Panggilan ke backend (jalur server-side).

export async function fetchHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Backend tidak merespons.');
  return res.json();
}

async function parseError(res) {
  let msg = `Kesalahan server (${res.status}).`;
  try {
    const data = await res.json();
    if (data?.error) msg = data.error;
  } catch {
    /* default */
  }
  return new Error(msg);
}

// Konversi server-side. Mengembalikan { token, downloadName, outputSize, originalSize, ... }.
export async function convertServer(file, conv, options, signal) {
  const form = new FormData();
  form.append('file', file);
  form.append('target', conv.target);
  if (conv.engine) form.append('engine', conv.engine);
  if (conv.op) form.append('op', conv.op);
  form.append('options', JSON.stringify(options || {}));

  const res = await fetch('/api/convert', { method: 'POST', body: form, signal });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

// Kompresi gambar / PDF (sinkron). Mengembalikan { token, outputSize, savedPercent, ... }.
export async function compressServer(file, category, options, signal) {
  const form = new FormData();
  form.append('file', file);
  form.append('category', category);
  form.append('options', JSON.stringify(options || {}));
  const res = await fetch('/api/compress', { method: 'POST', body: form, signal });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

// Kompresi video dengan progres via SSE. onProgress(percent). Mengembalikan hasil { token, ... }.
export async function compressVideo(file, options, onProgress, signal) {
  const form = new FormData();
  form.append('file', file);
  form.append('options', JSON.stringify(options || {}));
  const startRes = await fetch('/api/compress/video', { method: 'POST', body: form, signal });
  if (!startRes.ok) throw await parseError(startRes);
  const { jobId } = await startRes.json();

  return new Promise((resolve, reject) => {
    const source = new EventSource(`/api/compress/video/${jobId}/events`);
    const onAbort = () => {
      source.close();
      reject(new DOMException('Dibatalkan', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    source.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type === 'progress') onProgress?.(data.percent);
      else if (data.type === 'done') {
        source.close();
        signal?.removeEventListener('abort', onAbort);
        resolve(data.result);
      } else if (data.type === 'error') {
        source.close();
        signal?.removeEventListener('abort', onAbort);
        reject(new Error(data.error || 'Gagal mengompres video.'));
      }
    };
    source.onerror = () => {
      source.close();
      signal?.removeEventListener('abort', onAbort);
      reject(new Error('Koneksi progres video terputus.'));
    };
  });
}

export function downloadUrl(token) {
  return `/api/download/${token}`;
}

// Ambil hasil server sebagai Blob (untuk membundel batch jadi ZIP di client).
export async function fetchResultBlob(token) {
  const res = await fetch(downloadUrl(token));
  if (!res.ok) throw await parseError(res);
  return res.blob();
}

// Memicu unduhan dari sebuah Blob (hasil client-side maupun server yang sudah diambil).
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
