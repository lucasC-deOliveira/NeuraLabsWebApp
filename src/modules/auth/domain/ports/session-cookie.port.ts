export interface SessionCookieReader {
  read(): Promise<string | null>
}
