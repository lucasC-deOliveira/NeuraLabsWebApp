import { InvalidAiJsonError } from '../errors';

// Extracts a JSON value from an LLM response, which often wraps it in prose or a
// markdown code fence. Tries, in order: the raw text, a ```json fenced block,
// then the largest { … } span. Throws InvalidAiJsonError when none parse.
export function parseAiJson(text: string): unknown {
  for (const candidate of [text, stripMarkdownFence(text), largestBraceBlock(text)]) {
    if (candidate === null) continue;
    const result = tryParse(candidate);
    if (result.ok) return result.value;
  }
  throw new InvalidAiJsonError();
}

type ParseResult = { ok: true; value: unknown } | { ok: false };

function tryParse(text: string): ParseResult {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function stripMarkdownFence(text: string): string | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function largestBraceBlock(text: string): string | null {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  return first !== -1 && last > first ? text.slice(first, last + 1) : null;
}
