# Piper TTS neural, local — voz natural para a leitura dos flashcards, no mesmo
# espírito do container de embeddings (TEI): grátis, offline, sem chave.
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir piper-tts==1.2.0

# Vozes baixadas no build (repo oficial rhasspy/piper-voices), exatamente as que
# o server.py expõe. Cada voz = par .onnx + .onnx.json. O caminho carrega a
# qualidade: edresson só tem "low"; as demais, "medium". O japonês do Piper é
# fraco/incompleto — fica com a voz do sistema no cliente.
ARG VOICES=https://huggingface.co/rhasspy/piper-voices/resolve/main
RUN mkdir -p /voices && for v in \
      pt/pt_BR/faber/medium/pt_BR-faber-medium \
      pt/pt_BR/cadu/medium/pt_BR-cadu-medium \
      pt/pt_BR/jeff/medium/pt_BR-jeff-medium \
      pt/pt_BR/edresson/low/pt_BR-edresson-low \
      en/en_US/amy/medium/en_US-amy-medium \
      en/en_US/ryan/medium/en_US-ryan-medium ; do \
        f="$(basename "$v")" ; \
        curl -fsSL "$VOICES/$v.onnx" -o "/voices/$f.onnx" ; \
        curl -fsSL "$VOICES/$v.onnx.json" -o "/voices/$f.onnx.json" ; \
      done

COPY server.py /app/server.py
WORKDIR /app
EXPOSE 5000
HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=30s \
    CMD curl -fsS http://localhost:5000/health || exit 1
CMD ["python", "server.py"]
