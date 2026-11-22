FROM python:3.11-slim-bookworm
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir paddlepaddle==3.2.2 paddleocr==3.3.2
COPY fetch_models.py ./
RUN python fetch_models.py
COPY service.py ./
ENV PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True OMP_NUM_THREADS=2
EXPOSE 5050
CMD ["python", "service.py"]
