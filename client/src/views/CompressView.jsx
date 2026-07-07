import { useState, useCallback, useRef } from 'react';
import { zipSync } from 'fflate';
import Dropzone from '../components/Dropzone.jsx';
import CompressCard from '../components/CompressCard.jsx';
import { ShieldIcon, BoltIcon, LayersIcon, DownloadIcon } from '../components/icons.jsx';
import { extOf } from '../lib/conversions.js';
import { compressCategoryOf, defaultCompressOptions } from '../lib/compress.js';
import { convertClientSide } from '../lib/clientConvert.js';
import { compressServer, compressVideo, fetchResultBlob, downloadBlob } from '../lib/api.js';
import { formatBytes } from '../lib/format.js';

let idSeq = 0;
const nextId = () => `k${Date.now().toString(36)}-${idSeq++}`;

function makeItem(file) {
  const category = compressCategoryOf(file.name);
  return {
    id: nextId(),
    file,
    name: file.name,
    size: file.size,
    sourceExt: extOf(file.name),
    category,
    options: defaultCompressOptions(category),
    status: 'ready',
    progress: 0,
    result: null,
    error: null,
  };
}

async function runPool(list, limit, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (i < list.length) await worker(list[i++]);
  });
  await Promise.all(runners);
}

export default function CompressView({ health, active = true }) {
  const [items, setItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [bundling, setBundling] = useState(false);
  const abortRef = useRef(null);

  const addFiles = useCallback((fileList) => setItems((p) => [...p, ...fileList.map(makeItem)]), []);
  const patch = useCallback((id, changes) => setItems((p) => p.map((it) => (it.id === id ? { ...it, ...changes } : it))), []);
  const setOptions = useCallback((id, options) => patch(id, { options }), [patch]);
  const removeItem = useCallback((id) => setItems((p) => p.filter((it) => it.id !== id)), []);
  const clearAll = useCallback(() => setItems([]), []);

  async function processOne(item, signal) {
    patch(item.id, { status: 'processing', progress: 0, error: null });
    try {
      let blob;
      let outputName;
      let isArchive = false;
      if (item.category === 'image' || item.category === 'document') {
        const server = await compressServer(item.file, item.category === 'document' ? 'pdf' : 'image', item.options, signal);
        blob = await fetchResultBlob(server.token);
        outputName = server.downloadName;
      } else if (item.category === 'audiovideo') {
        const server = await compressVideo(item.file, item.options, (percent) => patch(item.id, { progress: percent }), signal);
        blob = await fetchResultBlob(server.token);
        outputName = server.downloadName;
      } else {
        // archive → ZIP di browser (mengarsipkan, bukan memperkecil)
        isArchive = true;
        const out = await convertClientSide(item.file, { clientOp: 'zip' }, {});
        blob = out.blob;
        outputName = out.outputName;
      }
      // Untuk arsip, persentase "hemat" menyesatkan (ZIP file terkompres bisa membesar) → null.
      const savedPercent = isArchive ? null : item.size > 0 ? Math.round((1 - blob.size / item.size) * 1000) / 10 : 0;
      patch(item.id, { status: 'done', progress: 100, result: { blob, outputName, outputSize: blob.size, savedPercent } });
    } catch (err) {
      if (err.name === 'AbortError') return patch(item.id, { status: 'ready', progress: 0 });
      patch(item.id, { status: 'error', error: err.message || 'Kompresi gagal.' });
    }
  }

  const compressAll = useCallback(async () => {
    const ready = items.filter((it) => it.status === 'ready');
    if (ready.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setProcessing(true);
    try {
      await runPool(ready, 2, (item) => processOne(item, controller.signal));
    } finally {
      setProcessing(false);
      abortRef.current = null;
    }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  // Retry lewat alur proses yang sama (mode "processing" + bisa dibatalkan, termasuk video).
  const retryOne = useCallback((item) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setProcessing(true);
    processOne({ ...item }, controller.signal).finally(() => {
      setProcessing(false);
      abortRef.current = null;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const downloadOne = useCallback((item) => item.result?.blob && downloadBlob(item.result.blob, item.result.outputName), []);

  const downloadAll = useCallback(async () => {
    const done = items.filter((it) => it.status === 'done' && it.result?.blob);
    if (done.length === 0) return;
    if (done.length === 1) return downloadOne(done[0]);
    setBundling(true);
    try {
      const files = {};
      const used = new Set();
      for (const it of done) {
        let name = it.result.outputName;
        if (used.has(name)) {
          const dot = name.lastIndexOf('.');
          const b = dot > 0 ? name.slice(0, dot) : name;
          const e = dot > 0 ? name.slice(dot) : '';
          let n = 2;
          while (used.has(`${b} (${n})${e}`)) n++;
          name = `${b} (${n})${e}`;
        }
        used.add(name);
        files[name] = new Uint8Array(await it.result.blob.arrayBuffer());
      }
      downloadBlob(new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' }), 'converthub-kompres.zip');
    } catch (err) {
      alert(err.message || 'Gagal membundel hasil.');
    } finally {
      setBundling(false);
    }
  }, [items, downloadOne]);

  const readyCount = items.filter((it) => it.status === 'ready').length;
  const doneItems = items.filter((it) => it.status === 'done' && it.result);
  const doneCount = doneItems.length;
  const totalOriginal = doneItems.reduce((s, it) => s + it.size, 0);
  const totalOut = doneItems.reduce((s, it) => s + it.result.outputSize, 0);
  const totalSaved = totalOriginal > 0 ? Math.round((1 - totalOut / totalOriginal) * 1000) / 10 : 0;

  return (
    <>
      <section className="animate-fade-up text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Perkecil ukuran, jaga kualitas
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-gradient sm:text-5xl">
          Kompres file,
          <br className="hidden sm:block" /> hemat ruang & bandwidth
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-400">
          Perkecil gambar, PDF, dan video dengan engine profesional — atau arsipkan file apa pun ke ZIP. Video menampilkan progres real-time.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <FeatureChip icon={ShieldIcon} label="Gambar · PDF · Video" />
          <FeatureChip icon={BoltIcon} label="Progres real-time" />
          <FeatureChip icon={LayersIcon} label="Batch & ZIP" />
        </div>
      </section>

      <Dropzone onFiles={addFiles} active={active} />

      {items.length > 0 && (
        <>
          <div className="glass sticky top-16 z-10 flex flex-wrap items-center gap-2.5 rounded-2xl p-3">
            {!processing ? (
              <button onClick={compressAll} disabled={readyCount === 0} className="btn-primary">
                Kompres{readyCount > 0 ? ` ${readyCount} file` : ''}
              </button>
            ) : (
              <button onClick={cancel} className="btn-danger">
                Batalkan
              </button>
            )}
            <button onClick={downloadAll} disabled={doneCount === 0 || bundling} className="btn-ghost">
              <DownloadIcon className="h-4 w-4" />
              {bundling ? 'Menyiapkan…' : doneCount > 1 ? 'Download semua (ZIP)' : 'Download'}
            </button>
            <span className="ml-auto flex items-center gap-3 pr-1 text-xs text-slate-500">
              <span>{items.length} file</span>
              {doneCount > 0 && (
                <span className="text-emerald-400">
                  {formatBytes(totalOriginal)} → {formatBytes(totalOut)} ({totalSaved >= 0 ? '−' : '+'}
                  {Math.abs(totalSaved)}%)
                </span>
              )}
              <button onClick={clearAll} disabled={processing} className="text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-40">
                Bersihkan
              </button>
            </span>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <CompressCard
                key={item.id}
                item={item}
                health={health}
                disabled={processing}
                onOptionsChange={(opts) => setOptions(item.id, opts)}
                onRemove={() => removeItem(item.id)}
                onDownload={downloadOne}
                onRetry={retryOne}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function FeatureChip({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300">
      <Icon className="h-3.5 w-3.5 text-brand-300" />
      {label}
    </span>
  );
}
