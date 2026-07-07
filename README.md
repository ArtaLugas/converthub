# ConvertHub

Repo ini berisi **ConvertHub** — web app file serba-guna dengan dua mode dalam satu antarmuka:

- **Konversi** — ubah file antar-format (gambar, dokumen, audio, video, data).
- **Kompres** — perkecil gambar, PDF, dan video (progres real-time), atau arsipkan ke ZIP.

> Aplikasi berada di folder [`converthub/`](converthub/). Dokumentasi lengkap: [converthub/README.md](converthub/README.md).
> Nama folder repo (`compress-file`) bersifat historis — dulu menampung app "KompresLokal" yang kini sudah dilebur ke tab **Kompres** ConvertHub.

## Menjalankan

```bash
cd converthub
npm run install:all   # sekali di awal
npm run dev           # backend :3002 + frontend :5174
```

Atau dari root repo: `npm run dev` (mendelegasikan ke `converthub/`).

## Prasyarat opsional (tool server)

| Tool | Untuk | Windows |
|---|---|---|
| FFmpeg | audio/video + kompres video | `winget install Gyan.FFmpeg` |
| Ghostscript | kompres PDF | `choco install ghostscript` |
| LibreOffice | dokumen (DOCX/PDF/ODT/RTF/…) | `winget install TheDocumentFoundation.LibreOffice` |

Konversi & kompresi yang berjalan di browser (gambar umum, data, arsip ZIP) tidak membutuhkan tool apa pun.
