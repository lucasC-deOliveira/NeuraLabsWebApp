FROM python:3.11-slim-bookworm
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-por tesseract-ocr-eng libgomp1 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch torchvision
RUN pip install --no-cache-dir 'docling-slim[format-pdf,models-local,cli]==2.151.1'
RUN docling-tools models download layout tableformer --output-dir /models
RUN pip install --no-cache-dir 'docling-slim[convert-core]==2.151.1' opencv-python-headless==4.10.0.84
RUN HF_HUB_DISABLE_XET=1 python -c "from huggingface_hub import snapshot_download; snapshot_download('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', local_dir='/models/reader-semantic', allow_patterns=['config.json','model.safetensors','tokenizer.json','tokenizer_config.json','special_tokens_map.json','sentencepiece.bpe.model'])"
ENV HF_HUB_OFFLINE=1 OMP_NUM_THREADS=2
COPY service.py semantic.py ./
EXPOSE 5051
CMD ["python", "service.py"]
