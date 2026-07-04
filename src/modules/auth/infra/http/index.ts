// Default composition of the auth HTTP adapter. Presentation injects this
// singleton (or a fake port in tests).
import { HttpAuthAdapter } from "./auth-http.adapter";
import type { AuthPort } from "../../application/ports/auth.port";

export { HttpAuthAdapter } from "./auth-http.adapter";

export const authHttp: AuthPort = new HttpAuthAdapter();
