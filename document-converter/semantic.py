from functools import lru_cache
from threading import Lock

import torch
from transformers import AutoModel, AutoTokenizer

MODEL_PATH = "/models/reader-semantic"
INFERENCE = Lock()


@lru_cache(maxsize=1)
def encoder():
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, local_files_only=True)
    model = AutoModel.from_pretrained(MODEL_PATH, local_files_only=True).eval()
    return tokenizer, model


def embed_passages(passages):
    with INFERENCE, torch.inference_mode():
        tokenizer, model = encoder()
        inputs = tokenizer(passages, padding=True, truncation=True, max_length=128, return_tensors="pt")
        tokens = model(**inputs).last_hidden_state
        mask = inputs["attention_mask"].unsqueeze(-1)
        pooled = (tokens * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1)
        return torch.nn.functional.normalize(pooled).tolist()
