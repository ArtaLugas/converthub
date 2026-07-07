# ConvertHub 🔄

Web app file serba-guna dengan **dua mode dalam satu antarmuka** (tab di nav bar):

- **Konversi** — ubah file antar-format (matriks penuh lintas kategori).
- **Kompres** — perkecil gambar, PDF, dan video (dengan progres real-time), atau arsipkan file apa pun ke ZIP.

Arsitektur **hybrid**: pemrosesan ringan berjalan **langsung di browser** (privasi maksimal), yang berat/fidelitas-tinggi diproses **di server lokal**. Setiap kartu menampilkan badge transparan **"Di browser" / "Di server"**.

> **Status:** MVP Fase 1 dengan matriks konversi penuh + kompresi. Menggabungkan fitur KompresLokal & ConvertHub. Akun, pembayaran, dan API adalah fase berikutnya (roadmap PRD).

---

## ✨ Matriks konversi

| Kategori | Konversi | Jalur | Engine |
|---|---|---|---|
| **Gambar** | jpg · png · webp saling-silang | 🖥️ Browser | Canvas |
| | → avif · tiff · gif · **ico**; sumber heic · svg · bmp · avif · tiff · gif | 🌐 Server | sharp / png-to-ico |
| **Audio** | mp3 · wav · aac · flac · ogg · m4a saling-silang | 🌐 Server | FFmpeg |
| **Video** | mp4 · mov · webm · avi · mkv → mp4/webm, → mp3/wav, → **gif** | 🌐 Server | FFmpeg |
| **Dokumen** | pdf · docx · doc · odt · rtf · txt · html ↔ ; kompres PDF; md → html | 🌐 Server / 🖥️ Browser | LibreOffice · Ghostscript · marked |
| **Data** | csv · json · yaml · xml · xlsx saling-silang | 🖥️ Browser | yaml · SheetJS · fast-xml-parser |
| **Apa pun** | → zip | 🖥️ Browser | fflate |

Fitur: deteksi format otomatis + saran target (F-1), pemilihan target cerdas per sumber (F-2), batch paralel + **Download semua (ZIP)** (F-3), progres & coba-ulang per file (F-4), opsi lanjutan kualitas/preset/bitrate (F-6), badge transparansi jalur (browser vs server).

---

## 📋 Prasyarat

1. **Node.js ≥ 18** — wajib.
2. Tool server (opsional, sesuai kebutuhan konversi):

| Tool | Untuk | Instalasi (Windows) |
|---|---|---|
| **FFmpeg** | Video → MP3 | `winget install Gyan.FFmpeg` |
| **Ghostscript** | Kompres PDF | `choco install ghostscript` |
| **LibreOffice** | DOCX ↔ PDF | `winget install TheDocumentFoundation.LibreOffice` |

macOS: `brew install ffmpeg ghostscript` + `brew install --cask libreoffice`.
Linux: `sudo apt install ffmpeg ghostscript libreoffice`.

Konversi **browser** (gambar, CSV↔JSON) tetap berjalan tanpa tool apa pun. Konversi server yang tool-nya belum terpasang akan menampilkan instruksi instalasi di UI.

---

## 🚀 Menjalankan

```bash
cd converthub
npm install          # memasang root; jika sub-paket belum ikut, jalankan: npm run install:all
npm run dev          # backend (3002) + frontend (5174) sekaligus
```

Browser terbuka otomatis di **<http://localhost:5174>**.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server + client bersamaan. |
| `npm run install:all` | Pasang dependensi server & client. |
| `npm run build` | Build frontend produksi. |

---

## 🏗️ Arsitektur

```
converthub/
├── server/                 # Express (localhost:3002) — jalur server-side
│   ├── index.js            # routing konversi + unduh + health
│   ├── services/           # document (LibreOffice) · image (sharp) · pdf (Ghostscript) · audio (FFmpeg)
│   ├── utils/deps.js       # deteksi LibreOffice/Ghostscript/FFmpeg
│   └── store.js            # token hasil + auto-delete (privasi §6)
└── client/                 # React + Vite + Tailwind (localhost:5174)
    └── src/
        ├── lib/
        │   ├── conversions.js    # REGISTRI konversi — otak F-1/F-2
        │   ├── clientConvert.js  # konversi di browser (Canvas, CSV/JSON)
        │   └── api.js            # panggilan jalur server
        └── components/     # Dropzone · FileCard · DependencyBanner
```

**Routing hybrid:** setiap konversi punya jalur default (`client`/`server`) di `conversions.js`. Jalur browser tak pernah mengunggah file; jalur server memproses lokal lalu **menghapus file otomatis** setelah hasil diambil.

**Stack:** React · Vite · Tailwind · Node/Express · sharp · Ghostscript · FFmpeg · LibreOffice · fflate (ZIP client-side).

---

## 🔐 Privasi

- Konversi gambar & data **tidak pernah meninggalkan browser**.
- Hasil dari server diambil klien lalu file temp server langsung dihapus; sisa apa pun disapu otomatis (TTL 1 jam) dan saat server start/stop.

---

## 🧭 Belum termasuk (fase berikutnya, per PRD)

Akun & riwayat (F-7), paket & pembayaran (F-8), API publik (F-9), i18n penuh (F-10), unggah dari URL, transcoding video, OCR, format matriks penuh. Halaman harga saat ini hanya placeholder ("Segera hadir").
