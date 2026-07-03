// ACL over the @/lib/api auth boundary. Only this infra adapter knows the lib.
import { authApi } from "@/lib/api";
import type { AuthPort, AuthUser, LoginInput, RegisterInput } from "../../application/ports/auth.port";

export class HttpAuthAdapter implements AuthPort {
  register(input: RegisterInput): Promise<AuthUser> {
    return authApi.register(input);
  }

  login(input: LoginInput): Promise<AuthUser> {
    return authApi.login(input);
  }

  logout(): Promise<void> {
    return authApi.logout();
  }
}
