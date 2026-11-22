from pathlib import Path
from urllib.request import urlretrieve

MODELS = (
    "PP-OCRv5_mobile_det",
    "latin_PP-OCRv5_mobile_rec",
    "en_PP-OCRv5_mobile_rec",
)

for model in MODELS:
    folder = Path("/models") / model
    folder.mkdir(parents=True, exist_ok=True)
    for filename in ("inference.json", "inference.pdiparams", "inference.yml"):
        base = f"https://huggingface.co/PaddlePaddle/{model}/resolve/main"
        urlretrieve(f"{base}/{filename}", folder / filename)
