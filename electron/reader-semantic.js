const { createHash } = require("node:crypto");
const { readReaderTranscription } = require("./reader-transcriptions");

const BATCH_SIZE = 24;
const DIMENSIONS = 384;
let currentIndex;

function readerPassages(markdown) {
  const [intro, ...batches] = markdown.split(/^<!-- neuralabs-reader-batch -->\r?\n/mu);
  let chapter;
  return (batches.length ? batches : [intro]).flatMap((batch, section) => {
    const label = /^## (.+)$/mu.exec(batch)?.[1] ?? null;
    const heading = /^#{1,6} +((?:chapter|capítulo|part|parte)\s+[\p{L}\p{N}][^\n]*)$/imu.exec(batch);
    if (heading) chapter = heading[1].trim().slice(0, 140);
    const plain = batch.replace(/^\[PDF original\].*$/gmu, "").replace(/^## Página(?:s \d+–| )\d+\s*$/gmu, "")
      .replace(/!\[[^\]]*\]\([^\n]*?\)/gu, "");
    const words = plain.match(/\S+/gu) ?? [];
    const passages = [];
    for (let offset = 0; offset < words.length; offset += 60) {
      const text = words.slice(offset, offset + 72).join(" ").slice(0, 900);
      if (text.length >= 20) passages.push({ section, label, text, ...(chapter ? { chapter } : {}) });
      if (offset + 72 >= words.length) break;
    }
    return passages;
  });
}

async function requestReaderEmbeddings(passages) {
  const response = await fetch("http://127.0.0.1:5003/reader-embeddings", {
    method: "POST", body: JSON.stringify(passages), headers: { "Content-Type": "application/json" },
    redirect: "error", signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Unexpected reader embedding response ${response.status}. Expected HTTP 200.`);
  const vectors = await response.json();
  if (!Array.isArray(vectors) || vectors.length !== passages.length || !vectors.every(validVector)) {
    throw new Error("Invalid reader embeddings. Expected one finite vector of length 384 per passage.");
  }
  return vectors;
}

function validVector(vector) {
  return Array.isArray(vector) && vector.length === DIMENSIONS && vector.every(Number.isFinite);
}

async function indexReaderPassages(markdown, embed) {
  const passages = readerPassages(markdown);
  const vectors = [];
  for (let start = 0; start < passages.length; start += BATCH_SIZE) {
    const text = passages.slice(start, start + BATCH_SIZE).map((passage) => passage.text);
    vectors.push(...(await embed(text)).map((vector) => Float32Array.from(vector)));
  }
  return { passages, vectors };
}

function getReaderIndex(markdown, embed) {
  const key = createHash("sha256").update(markdown).digest("hex");
  if (currentIndex?.key === key && currentIndex.embed === embed) return currentIndex.promise;
  const promise = indexReaderPassages(markdown, embed).catch((error) => {
    if (currentIndex?.promise === promise) currentIndex = undefined;
    throw error;
  });
  currentIndex = { key, embed, promise };
  return promise;
}

/** Ranks passages from the selected linked transcription using the local encoder.
 * @example searchReaderTranscription(vault, "Book.pdf", "book/Livro.md", "mudanças climáticas")
 */
async function searchReaderTranscription(vault, book, id, query, embed = requestReaderEmbeddings) {
  if (typeof query !== "string" || !query.trim() || query.length > 240) {
    throw new Error("Invalid reader query. Expected 1 to 240 characters.");
  }
  const hits = await rankReaderPassages(await readReaderTranscription(vault, book, id), query, embed);
  return hits.slice(0, 6).map(({ passage }) => passage);
}

async function rankReaderPassages(markdown, query, embed) {
  const { passages, vectors } = await getReaderIndex(markdown, embed);
  if (!passages.length) return [];
  const [queryVector] = await embed([query.trim()]);
  return passages.map((passage, index) => ({
    passage, score: vectors[index].reduce((sum, value, dimension) => sum + value * queryVector[dimension], 0),
  })).sort((left, right) => right.score - left.score);
}

function spreadReaderEvidence(hits) {
  const candidates = [...new Map(hits.slice().reverse().map(({ passage, score }) => [passage.section, { passage, score }])).values()]
    .sort((left, right) => right.score - left.score).slice(0, 24);
  const selected = [];
  const seen = new Set();
  for (const { passage } of candidates) {
    if (!passage.chapter || seen.has(passage.chapter)) continue;
    selected.push(passage);
    seen.add(passage.chapter);
    if (selected.length === 3) break;
  }
  for (const { passage } of candidates) {
    if (selected.length === 6) break;
    if (!selected.includes(passage)) selected.push(passage);
  }
  return selected.sort((left, right) => left.section - right.section);
}

/** Selects relevant evidence from distinct pages and chapter headings for synthesis. */
async function findReaderBookEvidence(vault, book, id, query, embed = requestReaderEmbeddings) {
  if (typeof query !== "string" || !query.trim() || query.length > 1200) {
    throw new Error("Invalid book evidence query. Expected 1 to 1200 characters.");
  }
  const markdown = await readReaderTranscription(vault, book, id);
  return spreadReaderEvidence(await rankReaderPassages(markdown, query, embed));
}

module.exports = { searchReaderTranscription, findReaderBookEvidence };
