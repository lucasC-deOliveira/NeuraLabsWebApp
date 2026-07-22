"""HTTP mínimo na frente do Piper.

- GET  /voices        → { "pt-BR": ["pt_BR-faber-medium", ...], "en-US": [...] }
- POST /synthesize?voice=<id>&rate=<x>  (texto no corpo) → WAV
- GET  /health

Um processo `piper` por requisição — leitura de flashcard não é alta vazão, e o
CLI é a interface estável entre versões. Sem voz feminina de pt-BR no Piper
oficial: exponho as que existem e o cliente escolhe.
"""
import json
import os
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

# id da voz → (idioma, arquivo). Idioma agrupa no seletor do cliente.
VOICES = {
    "pt_BR-faber-medium": ("pt-BR", "/voices/pt_BR-faber-medium.onnx"),
    "pt_BR-cadu-medium": ("pt-BR", "/voices/pt_BR-cadu-medium.onnx"),
    "pt_BR-jeff-medium": ("pt-BR", "/voices/pt_BR-jeff-medium.onnx"),
    # edresson só existe em qualidade "low" no repo oficial (não há -medium).
    "pt_BR-edresson-low": ("pt-BR", "/voices/pt_BR-edresson-low.onnx"),
    "en_US-amy-medium": ("en-US", "/voices/en_US-amy-medium.onnx"),
    "en_US-ryan-medium": ("en-US", "/voices/en_US-ryan-medium.onnx"),
}
DEFAULT_VOICE = "pt_BR-faber-medium"
MAX_CHARS = 4000


def voices_by_lang() -> dict:
    out: dict = {}
    for vid, (lang, _path) in VOICES.items():
        out.setdefault(lang, []).append(vid)
    return out


def synthesize(text: str, model: str, rate: float) -> bytes:
    # length_scale é o inverso da velocidade: >1 mais lento, <1 mais rápido.
    length_scale = 1.0 / rate if rate > 0 else 1.0
    proc = subprocess.run(
        ["piper", "-m", model, "-f", "/dev/stdout", "--length_scale", str(length_scale)],
        input=text.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=True,
    )
    return proc.stdout


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: bytes = b"", ctype: str = "text/plain"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self._send(200, b"ok")
        elif path == "/voices":
            self._send(200, json.dumps(voices_by_lang()).encode(), "application/json")
        else:
            self._send(404)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/synthesize":
            self._send(404)
            return
        query = parse_qs(parsed.query)
        voice = query.get("voice", [DEFAULT_VOICE])[0]
        if voice not in VOICES:
            voice = DEFAULT_VOICE
        rate = clamp_rate(query.get("rate", ["1"])[0])
        length = int(self.headers.get("Content-Length", 0))
        text = self.rfile.read(length).decode("utf-8", "ignore").strip()[:MAX_CHARS]
        if not text:
            self._send(400, b"empty text")
            return
        try:
            self._send(200, synthesize(text, VOICES[voice][1], rate), "audio/wav")
        except Exception:
            self._send(500, b"synthesis failed")


def clamp_rate(raw: str) -> float:
    try:
        return min(2.0, max(0.5, float(raw)))
    except ValueError:
        return 1.0


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
