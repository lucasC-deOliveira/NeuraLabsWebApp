import base64
import json
from functools import lru_cache
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Lock
from urllib.parse import parse_qs, urlsplit
from pypdfium2 import PdfDocument

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions, TesseractCliOcrOptions
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling_core.types.doc import ImageRefMode
from semantic import embed_passages


MAX_PDF = 160 * 1024 * 1024
CHUNK_PAGES = 30
LANGUAGES = {"pt": "por", "en": "eng"}
CONVERSION = Lock()


@lru_cache(maxsize=2)
def converter(language):
    options = PdfPipelineOptions(
        artifacts_path=Path("/models"), generate_picture_images=True,
        images_scale=1.5, do_ocr=True, do_table_structure=True,
        ocr_options=TesseractCliOcrOptions(lang=[LANGUAGES[language]]),
    )
    return DocumentConverter(allowed_formats=[InputFormat.PDF], format_options={
        InputFormat.PDF: PdfFormatOption(pipeline_options=options),
    })


def convert_pdf(source, first, last, language):
    document = converter(language).convert(source, page_range=(first, last)).document
    for page in range(first, last + 1):
        yield page, export_pdf_page(document, page)


def export_pdf_page(document, page):
    with TemporaryDirectory() as directory:
        root = Path(directory)
        markdown = root / "Livro.md"
        assets = root / "imagens"
        document.save_as_markdown(markdown, artifacts_dir=assets, image_mode=ImageRefMode.REFERENCED, page_no=page)
        return read_export(markdown, assets)


def read_export(markdown, assets):
    figures = sorted(assets.glob("*.png"))
    if sum(figure.stat().st_size for figure in figures) > 48 * 1024 * 1024:
        raise OverflowError("Exported figures exceed the size limit")
    content = markdown.read_text(encoding="utf-8")
    for prefix in (assets.as_uri(), assets.as_posix()):
        content = content.replace(f"]({prefix}/", "](imagens/").replace(f"](<{prefix}/", "](<imagens/")
    return {
        "markdown": content,
        "images": [{"name": figure.name, "base64": base64.b64encode(figure.read_bytes()).decode("ascii")} for figure in figures],
    }


class ConversionHandler(BaseHTTPRequestHandler):
    def reply(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.reply(200, {"ready": True}) if self.path == "/health" else self.reply(404, {"error": "Not found"})

    def do_POST(self):
        request = urlsplit(self.path)
        if request.path == "/reader-embeddings":
            return self.embed_reader_passages()
        if request.path != "/book" or self.headers.get_content_type() != "application/pdf":
            return self.reply(415, {"error": "Expected a PDF conversion request"})
        try:
            params = parse_qs(request.query)
            language = params["language"][0]
            size = int(self.headers.get("Content-Length", "0"))
            if not (language in LANGUAGES and 0 < size <= MAX_PDF):
                raise ValueError("Invalid conversion request")
        except (KeyError, ValueError):
            return self.reply(400, {"error": "Invalid PDF or page range"})
        if not CONVERSION.acquire(blocking=False):
            return self.reply(503, {"error": "A conversion is already running"})
        try:
            self.stream_book(size, language)
        finally:
            CONVERSION.release()

    def embed_reader_passages(self):
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 256_000 or self.headers.get_content_type() != "application/json":
                raise ValueError("Expected a bounded JSON array")
            passages = json.loads(self.rfile.read(size))
            if not isinstance(passages, list) or not 1 <= len(passages) <= 32:
                raise ValueError("Expected 1 to 32 passages")
            if any(not isinstance(text, str) or not 0 < len(text) <= 1200 for text in passages):
                raise ValueError("Invalid passage length")
        except (ValueError, UnicodeError):
            return self.reply(400, {"error": "Invalid passages"})
        try:
            return self.reply(200, embed_passages(passages))
        except Exception as error:
            print(json.dumps({"event": "reader_embeddings_failed", "error": str(error)}), flush=True)
            return self.reply(503, {"error": "Local embeddings unavailable"})

    def stream_line(self, value):
        self.wfile.write(json.dumps(value, ensure_ascii=False).encode("utf-8") + b"\n")
        self.wfile.flush()

    def stream_book(self, size, language):
        with TemporaryDirectory() as directory:
            source = Path(directory) / "source.pdf"
            if not copy_request_pdf(self.rfile, source, size):
                return self.reply(400, {"error": "Incomplete PDF upload"})
            try:
                pdf = PdfDocument(source)
                total = len(pdf)
                pdf.close()
                if total < 1:
                    return self.reply(400, {"error": "PDF contains no pages"})
            except Exception:
                return self.reply(400, {"error": "Cannot open the PDF"})
            self.send_response(200)
            self.send_header("Content-Type", "application/x-ndjson")
            self.end_headers()
            try:
                self.stream_line({"type": "started", "total": total})
                for first in range(1, total + 1, CHUNK_PAGES):
                    last = min(total, first + CHUNK_PAGES - 1)
                    for page, result in convert_pdf(source, first, last, language):
                        self.stream_line({"type": "pages", "first": page, "last": page, **result})
                self.stream_line({"type": "finished"})
            except (BrokenPipeError, ConnectionResetError):
                return
            except Exception as error:
                print(json.dumps({"event": "pdf_conversion_failed", "error": str(error)}), flush=True)
                self.stream_line({"type": "failed"})


def copy_request_pdf(source, destination, size):
    with destination.open("wb") as target:
        while size > 0:
            chunk = source.read(min(size, 1024 * 1024))
            if not chunk:
                return False
            target.write(chunk)
            size -= len(chunk)
    return True


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 5051), ConversionHandler).serve_forever()
