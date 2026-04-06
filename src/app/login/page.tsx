"use client";

import { Suspense, useState, useRef, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrainIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const ALL_PROVIDERS: { name: string; icon: string; color: string; provider: string }[] = [
  { name: "GitHub", icon: "GH", color: "bg-zinc-900 text-white border-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-200", provider: "github" },
];

function OAuthButtons() {
  function handleOAuth(provider: string) {
    window.location.href = `/api/auth/${provider}`;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {ALL_PROVIDERS.map((p) => (
          <button
            key={p.provider}
            type="button"
            onClick={() => handleOAuth(p.provider)}
            className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:opacity-90 ${p.color}`}
          >
            <span className="text-sm">{p.icon}</span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

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
          <CardTitle className="text-xl">FlashMind</CardTitle>
          <CardDescription>Faca login para acessar seus estudos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <OAuthButtons />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-50 dark:bg-zinc-950 px-2 text-muted-foreground">ou continue com email</span>
              </div>
            </div>

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
