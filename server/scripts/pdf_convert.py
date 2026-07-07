"""Konversi PDF ke DOCX / TXT untuk ConvertHub.

PDF -> DOCX  : pakai pdf2docx (rekonstruksi layout/teks/tabel).
PDF -> TXT   : pakai PyMuPDF (fitz) untuk ekstraksi teks.

Dipanggil oleh backend Node:  python pdf_convert.py <docx|txt> <input.pdf> <output>
"""
import sys


def main():
    if len(sys.argv) != 4:
        print("usage: pdf_convert.py <docx|txt> <input> <output>", file=sys.stderr)
        sys.exit(2)

    mode, inp, outp = sys.argv[1], sys.argv[2], sys.argv[3]

    if mode == "docx":
        from pdf2docx import Converter
        cv = Converter(inp)
        try:
            cv.convert(outp)
        finally:
            cv.close()

    elif mode == "txt":
        import fitz  # PyMuPDF
        doc = fitz.open(inp)
        try:
            parts = [page.get_text() for page in doc]
        finally:
            doc.close()
        with open(outp, "w", encoding="utf-8") as f:
            f.write("\n".join(parts))

    else:
        print("mode tidak dikenal: " + mode, file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
