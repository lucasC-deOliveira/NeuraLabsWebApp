import json
from functools import lru_cache
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock
from urllib.parse import parse_qs, urlsplit

import cv2
import numpy as np
from paddleocr import PaddleOCR

LANGUAGES = {"pt": "latin_PP-OCRv5_mobile_rec", "en": "en_PP-OCRv5_mobile_rec"}
BODY_LIMIT = 8 * 1024 * 1024
MAX_PIXELS = 9_000_000
INFERENCE = Lock()


@lru_cache(maxsize=2)
def engine(language):
    return PaddleOCR(
        text_detection_model_name="PP-OCRv5_mobile_det",
        text_detection_model_dir="/models/PP-OCRv5_mobile_det",
        text_recognition_model_name=LANGUAGES[language],
        text_recognition_model_dir=f"/models/{LANGUAGES[language]}",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        device="cpu",
        enable_mkldnn=False,
        cpu_threads=2,
        text_det_limit_side_len=1600,
        text_det_limit_type="max",
    )


def decode_png(raw):
    if len(raw) < 24 or raw[:8] != b"\x89PNG\r\n\x1a\n" or raw[12:16] != b"IHDR":
        raise ValueError("Expected a PNG image")
    width = int.from_bytes(raw[16:20], "big")
    height = int.from_bytes(raw[20:24], "big")
    if width <= 0 or height <= 0 or width * height > MAX_PIXELS:
        raise ValueError("Page image is too large")
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid PNG image")
    return image


def recognize(raw, language):
    image = decode_png(raw)
    with INFERENCE:
        result = next(iter(engine(language).predict(image)), None)
    if result is None:
        return {"lines": []}
    return {"lines": [
        {"text": text, "confidence": float(score), "bounds": box.tolist()}
        for text, score, box in zip(result["rec_texts"], result["rec_scores"], result["rec_polys"])
    ]}


class OcrHandler(BaseHTTPRequestHandler):
    def reply(self, status, value):
        body = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self.reply(200, {"languages": list(LANGUAGES)})
        else:
            self.reply(404, {"error": "Not found"})

    def do_POST(self):
        request = urlsplit(self.path)
        language = parse_qs(request.query).get("language", [""])[0]
        if request.path != "/recognize":
            return self.reply(404, {"error": "Not found"})
        if language not in LANGUAGES:
            return self.reply(400, {"error": "Expected language pt or en"})
        if self.headers.get_content_type() != "image/png":
            return self.reply(415, {"error": "Expected image/png"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= BODY_LIMIT:
                return self.reply(413, {"error": "Invalid page size"})
            result = recognize(self.rfile.read(size), language)
        except ValueError:
            return self.reply(400, {"error": "Invalid page image"})
        except Exception as error:
            print(json.dumps({"event": "ocr_failed", "type": type(error).__name__}), flush=True)
            return self.reply(500, {"error": "Recognition failed"})
        return self.reply(200, result)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 5050), OcrHandler).serve_forever()
