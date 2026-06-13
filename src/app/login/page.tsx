"use client";

import { Suspense, useState, useRef, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrainIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getOAuthConfig } from "@/actions/oauth-config";

// API exposta pelo preload do Electron (só existe no app desktop)
type DesktopAuth = { isDesktop: boolean; login: (p: string) => Promise<{ ok: boolean; error?: string }> };
function getDesktopAuth(): DesktopAuth | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { desktopAuth?: DesktopAuth }).desktopAuth ?? null;
}

const ALL_PROVIDERS: { name: string; icon: string; color: string; provider: string }[] = [
  { name: "GitHub", icon: "GH", color: "bg-zinc-900 text-white border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-200", provider: "github" },
  { name: "Google", icon: "G", color: "bg-white text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600", provider: "google" },
];

// Só mostra os botões de provedores configurados. Na web: lê /api/auth/providers
// (env). No desktop: lê as credenciais salvas (banco) e dispara o OAuth via
// navegador externo (IPC do Electron). Retorna null enquanto carrega ou se nenhum.
function OAuthButtons() {
  const [enabled, setEnabled] = useState<Record<string, boolean> | null>(null);
  const [desktop, setDesktop] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState("");

  useEffect(() => {
    let active = true;
    const da = getDesktopAuth();
    if (da?.isDesktop) {
      setDesktop(true);
      getOAuthConfig()
        .then((c) => active && setEnabled({ google: c.google, github: c.github }))
        .catch(() => active && setEnabled({}));
    } else {
      fetch("/api/auth/providers")
        .then((r) => (r.ok ? r.json() : {}))
        .then((data) => active && setEnabled(data))
        .catch(() => active && setEnabled({}));
    }
    return () => {
      active = false;
    };
  }, []);

  async function handleOAuth(provider: string) {
    if (desktop) {
      const da = getDesktopAuth();
      if (!da) return;
      setBusy(provider);
      setOauthError("");
      try {
        const r = await da.login(provider);
        // sucesso: o app recarrega a janela já autenticado; só tratamos o erro
        if (!r?.ok) setOauthError(r?.error || "Falha no login social");
      } catch (e) {
        setOauthError(e instanceof Error ? e.message : "Falha no login social");
      } finally {
        setBusy(null);
      }
    } else {
      window.location.href = `/api/auth/${provider}`;
    }
  }

  if (!enabled) return null;
  const providers = ALL_PROVIDERS.filter((p) => enabled[p.provider]);
  if (providers.length === 0) return null;

  return (
    <>
      {oauthError && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{oauthError}</div>
      )}
      <div className="space-y-2">
        <div className={`grid gap-2 ${providers.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {providers.map((p) => (
            <button
              key={p.provider}
              type="button"
              disabled={busy !== null}
              onClick={() => handleOAuth(p.provider)}
              className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50 ${p.color}`}
            >
              {busy === p.provider ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <>
                  <span className="text-sm">{p.icon}</span>
                  <span>{p.name}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-50 dark:bg-zinc-950 px-2 text-muted-foreground">ou continue com email</span>
        </div>
      </div>
    </>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("callbackUrl") ?? "/";
  // Reject absolute URLs and protocol-relative paths to prevent open redirect.
  const callbackUrl =
    raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao fazer login");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <Card className="w-full max-w-sm border-zinc-200 dark:border-zinc-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
            <BrainIcon className="size-5 text-primary" />
          </div>
          <CardTitle className="text-xl">NeuraLabs</CardTitle>
          <CardDescription>Faca login para acessar seus estudos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <OAuthButtons />

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  ref={emailRef}
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="senha">Senha</Label>
                  <Link href="/register" className="text-xs text-primary underline-offset-4 hover:underline">
                    Criar conta
                  </Link>
                </div>
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2Icon className="size-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
