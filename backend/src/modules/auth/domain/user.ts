// The user identity exposed to clients (never carries the password hash).
export interface AuthenticatedUser {
  id: string;
  nome: string;
  email: string;
}

// A user as needed to verify credentials: the public identity plus the hash.
export interface UserCredentials extends AuthenticatedUser {
  senhaHash: string;
}

export interface RegisterCommand {
  nome: string;
  email: string;
  senha: string;
}

export interface LoginCommand {
  email: string;
  senha: string;
}

// A successful authentication: a signed token and the authenticated identity.
export interface AuthResult {
  token: string;
  user: AuthenticatedUser;
}

export const toAuthenticatedUser = (user: UserCredentials): AuthenticatedUser => ({
  id: user.id,
  nome: user.nome,
  email: user.email,
});
