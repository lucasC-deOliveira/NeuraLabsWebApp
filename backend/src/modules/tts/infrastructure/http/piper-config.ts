// Local Piper TTS container from docker-compose. Reachable by the backend over
// the compose network; not published to the browser (the backend proxies it).
const DEFAULT_BASE_URL = 'http://piper:5000';

export interface PiperConfig {
  baseUrl: string;
}

/**
 * Reads the Piper endpoint from the environment, defaulting to the bundled
 * container. For host-based dev (backend via npm), point it at the published
 * port, e.g. PIPER_BASE_URL=http://localhost:5001.
 * @example piperConfigFromEnv() // → { baseUrl: 'http://piper:5000' }
 */
export function piperConfigFromEnv(): PiperConfig {
  return { baseUrl: process.env.PIPER_BASE_URL ?? DEFAULT_BASE_URL };
}
