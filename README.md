<div align="center">

# ConvertHub 🔄

**Konversi & kompresi file serba-guna — cepat, privat, tanpa instalasi berat.**

Ubah file antar-format (gambar, dokumen, audio, video, data) dan perkecil ukurannya, lewat satu antarmuka web yang bersih. Pemrosesan ringan berjalan **langsung di browser** Anda; yang berat diproses **di server lokal** — tidak ada file yang diunggah ke layanan pihak ketiga.

![Node](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## 📑 Daftar Isi

- [Fitur](#-fitur)
- [Matriks Konversi](#-matriks-konversi)
- [Tampilan](#-tampilan)
- [Teknologi](#-teknologi)
- [Prasyarat](#-prasyarat)
- [Instalasi](#-instalasi)
- [Cara Pakai](#-cara-pakai)
- [Konfigurasi](#-konfigurasi)
- [Struktur Proyek](#-struktur-proyek)
- [Cara Kerja](#-cara-kerja)
- [Skrip yang Tersedia](#-skrip-yang-tersedia)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Lisensi](#-lisensi)

---

## ✨ Fitur

ConvertHub punya **dua mode** dalam satu antarmuka (tab di nav bar):

- **Konversi** — ubah file dari satu format ke format lain (matriks penuh lintas kategori).
- **Kompres** — perkecil gambar, PDF, dan video (dengan **progres real-time**), atau arsipkan file apa pun ke ZIP.

Fitur inti:

- 🔍 **Deteksi format otomatis** — cukup jatuhkan file, target yang relevan langsung disarankan.
- 🎯 **Pemilihan target cerdas** — hanya menampilkan format tujuan yang valid untuk file sumber.
- ⚡ **Pemrosesan hybrid** — konversi ringan di browser (instan & privat), yang berat di server lokal.
- 🏷️ **Transparansi jalur** — tiap kartu menandai "Di browser" atau "Di server".
- 📦 **Batch & ZIP** — banyak file sekaligus, unduh semua hasil sebagai satu ZIP.
- 📊 **Progres & coba-ulang** per file, dengan pesan error yang jelas.
- 🎚️ **Opsi lanjutan** — kualitas gambar, preset kompresi PDF, bitrate audio, preset video.
- 🔐 **Privasi-first** — file browser tidak pernah diunggah; file server dihapus otomatis setelah diunduh.
- 🌙 **Dark mode** modern dengan drag-and-drop, klik-pilih, dan tempel dari clipboard.

---

## 🔀 Matriks Konversi

| Kategori | Konversi | Jalur | Engine |
|---|---|---|---|
| **Gambar** | `jpg` · `png` · `webp` saling-silang | 🖥️ Browser | Canvas |
| | → `avif` · `tiff` · `gif` · `ico`; sumber `heic` · `svg` · `bmp` | 🌐 Server | sharp · png-to-ico |
| **Audio** | `mp3` · `wav` · `aac` · `flac` · `ogg` · `m4a` saling-silang | 🌐 Server | FFmpeg |
| **Video** | `mp4` · `mov` · `webm` · `avi` · `mkv` → mp4/webm, → mp3/wav, → gif | 🌐 Server | FFmpeg |
| **Dokumen** | `docx` · `doc` · `odt` · `rtf` · `txt` · `html` → PDF & antar-format; `md` → html | 🌐 Server / 🖥️ Browser | LibreOffice · marked |
| | `pdf` → `docx` · `txt` (teks bisa diedit) | 🌐 Server | pdf2docx · PyMuPDF |
| **Data** | `csv` · `json` · `yaml` · `xml` · `xlsx` saling-silang | 🖥️ Browser | yaml · SheetJS · fast-xml-parser |
| **Kompresi** | gambar (kualitas/WebP) · PDF (preset) · video (preset) | 🌐 Server | sharp · Ghostscript · FFmpeg |
| **Apa pun** | → `zip` | 🖥️ Browser | fflate |

---

## 🖼️ Tampilan

> _Tambahkan tangkapan layar aplikasi di sini, mis. `docs/screenshot.png`, lalu tautkan:_
> `![ConvertHub](docs/screenshot.png)`

Antarmuka tunggal, dark-mode, dengan area drag-and-drop besar sebagai fokus utama; tiap file tampil sebagai kartu dengan pemilih target, opsi lanjutan, progres, dan tombol unduh.

---

## 🧰 Teknologi

**Frontend:** React 18 · Vite 6 · Tailwind CSS 3 · fflate · SheetJS · yaml · fast-xml-parser · marked
**Backend:** Node.js · Express 4 · Multer · sharp · pdf-lib · png-to-ico
**Tool eksternal (opsional, jalur server):** FFmpeg · Ghostscript · LibreOffice · Python (pdf2docx + PyMuPDF)

---

## 📋 Prasyarat

**Wajib:**

- [Node.js](https://nodejs.org) **≥ 18** (disarankan 20+)

**Opsional** — hanya untuk konversi tertentu di jalur server. Tanpa ini, konversi berbasis browser (gambar umum, data, ZIP) tetap berjalan penuh, dan UI menampilkan panduan pemasangan bila sebuah tool dibutuhkan namun belum ada.

| Tool | Dibutuhkan untuk |
|---|---|
| **FFmpeg** | Semua audio & video, kompres video |
| **Ghostscript** | Kompres PDF |
| **LibreOffice** | Konversi dokumen (DOCX/ODT/RTF/HTML/TXT → PDF, dll) |
| **Python 3 + `pdf2docx`** | PDF → DOCX / TXT |

Pemasangan tool eksternal:

| OS | Perintah |
|---|---|
| **Windows** | `winget install Gyan.FFmpeg`<br>`winget install ArtifexSoftware.GhostScript`<br>`winget install TheDocumentFoundation.LibreOffice`<br>`pip install pdf2docx` |
| **macOS** | `brew install ffmpeg ghostscript`<br>`brew install --cask libreoffice`<br>`pip3 install pdf2docx` |
| **Linux (Debian/Ubuntu)** | `sudo apt install ffmpeg ghostscript libreoffice python3-pip`<br>`pip3 install pdf2docx` |

> **Catatan PDF → DOCX:** LibreOffice tidak dapat mengubah PDF menjadi dokumen yang bisa diedit (PDF dibuka sebagai gambar/Draw). ConvertHub memakai **`pdf2docx`** (Python) untuk hasil DOCX yang benar-benar dapat diedit.

> Setelah memasang tool baru, buka **terminal baru** agar `PATH` diperbarui, lalu jalankan ulang aplikasi.

---

## 🚀 Instalasi

```bash
# 1. Clone repositori
git clone https://github.com/ArtaLugas/converthub.git
cd converthub

# 2. Pasang dependensi root (concurrently)
npm install

# 3. Pasang dependensi server & client sekaligus
npm run install:all

# 4. Jalankan (backend :3002 + frontend :5174 bersamaan)
npm run dev
```

Browser akan terbuka otomatis di **<http://localhost:5174>**. Backend berjalan di **<http://localhost:3002>**.

---

## 🖱️ Cara Pakai

1. Jalankan `npm run dev`; browser terbuka otomatis.
2. Pilih tab **Konversi** atau **Kompres**.
3. **Seret** file ke area drop (atau klik untuk memilih / tempel dari clipboard) — bisa banyak file sekaligus.
4. Untuk tiap file, pilih **format tujuan** (Konversi) atau **preset** (Kompres), lalu atur opsi lanjutan bila perlu.
5. Klik **Konversi** / **Kompres**. Progres tampil per file (video menampilkan persentase real-time).
6. **Unduh** hasil per file, atau **Download semua (ZIP)** untuk hasil batch.

---

## ⚙️ Konfigurasi

Variabel lingkungan opsional untuk backend (`server/`):

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | `3002` | Port backend. |
| `MAX_UPLOAD_MB` | `200` | Batas ukuran unggahan per file (MB). |
| `RESULT_TTL_MIN` | `60` | Berapa lama hasil disimpan sebelum dihapus otomatis (menit). |

Contoh: `PORT=4000 MAX_UPLOAD_MB=500 npm run server`

---

## 🗂️ Struktur Proyek

```
converthub/
├── client/                     # Frontend — React + Vite + Tailwind (port 5174)
│   ├── src/
│   │   ├── App.jsx             # Shell + navigasi tab (Konversi / Kompres)
│   │   ├── views/             # ConvertView · CompressView
│   │   ├── components/        # Dropzone · FileCard · CompressCard · OptionField · DependencyBanner · icons
│   │   └── lib/               # conversions · clientConvert · compress · api · format
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/                     # Backend — Node + Express (port 3002)
│   ├── index.js               # Rute konversi/kompres + unduh + health
│   ├── services/              # document (LibreOffice) · image (sharp) · media (FFmpeg) · pdf (Ghostscript) · compress
│   ├── utils/                 # deps (deteksi tool) · fileType
│   ├── store.js               # Token hasil + pembersihan otomatis
│   └── config.js
├── package.json                # Skrip: dev · install:all · build
├── LICENSE
└── README.md
```

---

## 🧠 Cara Kerja

**Routing hybrid.** Setiap konversi punya jalur default (`client` atau `server`) yang didefinisikan di [`client/src/lib/conversions.js`](client/src/lib/conversions.js):

- **Jalur browser** (gambar umum, CSV/JSON/YAML/XML/XLSX, Markdown, ZIP) — diproses via Canvas API dan library JavaScript. File **tidak pernah meninggalkan perangkat**.
- **Jalur server** (dokumen, audio/video, HEIC/AVIF/TIFF, kompres PDF/video) — diunggah ke backend lokal, diproses oleh sharp/FFmpeg/Ghostscript/LibreOffice, hasilnya diambil klien, lalu **file temp di server dihapus otomatis**.

**Privasi.** File hasil di server dibersihkan tepat setelah diunduh; sisa apa pun disapu otomatis (TTL default 1 jam) dan saat server start/stop.

---

## 📜 Skrip yang Tersedia

Dijalankan dari root proyek:

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server + client bersamaan (mode pengembangan). |
| `npm run install:all` | Memasang dependensi server & client. |
| `npm run server` | Menjalankan hanya backend. |
| `npm run client` | Menjalankan hanya frontend. |
| `npm run build` | Build frontend produksi ke `client/dist`. |

---

## 🩺 Troubleshooting

- **"FFmpeg / Ghostscript / LibreOffice belum terpasang"** — pasang tool terkait (lihat [Prasyarat](#-prasyarat)), buka terminal baru, lalu jalankan ulang.
- **Kompres PDF hemat 0%** — kemungkinan Ghostscript belum terpasang (memakai fallback ringan). Pasang Ghostscript untuk hasil optimal.
- **Port sudah dipakai** — jalankan dengan port lain, mis. `PORT=4000 npm run server`, atau hentikan proses yang memakai port 3002/5174.
- **`npm run dev` gagal di Windows** — pastikan `npm install` dan `npm run install:all` sudah dijalankan lebih dulu.

---

## 🗺️ Roadmap

- [ ] Akun & riwayat konversi
- [ ] Paket berlangganan & pembayaran
- [ ] API publik untuk konversi terprogram
- [ ] Multi-bahasa penuh (i18n)
- [ ] Unggah dari URL
- [ ] Ekstraksi arsip (7z/rar), OCR, transcoding video lanjutan

---

## 📄 Lisensi

Dirilis di bawah [Lisensi MIT](LICENSE). © 2026 ArtaLugas.
