// Port the auth presentation depends on. The infra/ HTTP adapter implements it
// over the @/lib/api auth boundary (ACL); tests inject a fake.

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
}

export interface RegisterInput {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginInput {
  email: string;
  senha: string;
}

export interface AuthPort {
  register(input: RegisterInput): Promise<AuthUser>;
  login(input: LoginInput): Promise<AuthUser>;
  logout(): Promise<void>;
}
