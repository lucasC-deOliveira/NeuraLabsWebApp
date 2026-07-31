"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { Link } from "@/components/link";
import { BrainIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { authHttp } from "../infra/http";
import { safeCallbackUrl } from "../domain/services/credential-validation";
import heroImg from "@/assets/auth/hero-neura.png";
import cosmosImg from "@/assets/auth/cosmos.jpg";

// Painel-herói (só em telas médias+): a imagem da NeuraLab com a marca por cima.
function HeroPanel() {
  return (
    <div className="relative hidden md:block">
      <img src={heroImg} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      <div className="relative flex h-full flex-col justify-end gap-2 p-8">
        <div className="flex items-center gap-2">
          <BrainIcon className="size-6 text-cyan-300" />
          <span className="text-lg font-semibold tracking-tight text-white">NeuraLabs</span>
        </div>
        <p className="max-w-xs text-sm text-white/70">
          Seu universo de conhecimento — flashcards, grafo e IA num só lugar.
        </p>
      </div>
    </div>
  );
}

const FIELD_CLASS = "border-white/15 bg-white/5 text-white placeholder:text-white/40";

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
    <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <img src={cosmosImg} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-zinc-950/75" />

      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 shadow-2xl backdrop-blur-xl md:grid-cols-2">
        <HeroPanel />
        <div className="p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <BrainIcon className="size-5 text-cyan-300" />
            <span className="font-semibold text-white">NeuraLabs</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Entrar</h1>
          <p className="mb-6 text-sm text-white/60">Acesse seus estudos</p>

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
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
