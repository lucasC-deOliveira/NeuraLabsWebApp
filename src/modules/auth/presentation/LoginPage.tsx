"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { Link } from "@/components/link";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { authHttp } from "../infra/http";
import { safeCallbackUrl } from "../domain/services/credential-validation";
import { AuthShell, FIELD_CLASS } from "./AuthShell";
import loginHero from "@/assets/auth/login-hero.jpg";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl") ?? "/");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authHttp.login({ email, senha });
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell image={loginHero} title="Entrar" subtitle="Acesse seus estudos">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300">{error}</div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            className={FIELD_CLASS}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="senha" className="text-white/80">Senha</Label>
            <Link href="/register" className="text-xs text-cyan-300 underline-offset-4 hover:underline">
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
            className={FIELD_CLASS}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : "Entrar"}
        </Button>
      </form>
    </AuthShell>
  );
}

export function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
