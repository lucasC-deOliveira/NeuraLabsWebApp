// Cliente da síntese de voz (Piper) via backend NestJS. Diferente do apiFetch:
// a resposta é áudio binário (WAV), não JSON — então lê como Blob. O backend faz
// o proxy para o container do Piper (o browser não fala com ele direto).
import { resolveApiUrl, getToken, ApiError } from "./api";

export interface SynthesizeSpeechInput {
  text: string;
  voice?: string;
  rate?: number;
}

export async function synthesizeSpeech(input: SynthesizeSpeechInput): Promise<Blob> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${resolveApiUrl()}/tts/synthesize`, {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ApiError(res.status, `Falha na síntese de voz (${res.status})`);
  return res.blob();
}
