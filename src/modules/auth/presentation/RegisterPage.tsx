"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "@/lib/navigation";
import { Link } from "@/components/link";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { authHttp } from "../infra/http";
import { validateRegistration } from "../domain/services/credential-validation";
import { AuthShell, FIELD_CLASS } from "./AuthShell";
import registerHero from "@/assets/auth/register-hero.jpg";

export function RegisterPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaConfirm, setSenhaConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const validationError = validateRegistration(nome, email, senha, senhaConfirm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      await authHttp.register({ nome, email, senha });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell image={registerHero} title="Criar conta" subtitle="Comece a estudar com flashcards inteligentes">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300">{error}</div>
        )}
        <div className="space-y-2">
          <Label htmlFor="nome" className="text-white/80">Nome</Label>
          <Input
            id="nome"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            autoFocus
            className={FIELD_CLASS}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={FIELD_CLASS}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha" className="text-white/80">Senha</Label>
          <Input
            id="senha"
            type="password"
            placeholder="Minimo 6 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className={FIELD_CLASS}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senhaConfirm" className="text-white/80">Confirmar senha</Label>
          <Input
            id="senhaConfirm"
            type="password"
            placeholder="Repita a senha"
            value={senhaConfirm}
            onChange={(e) => setSenhaConfirm(e.target.value)}
            required
            className={FIELD_CLASS}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : "Criar conta"}
        </Button>
        <p className="text-center text-xs text-white/60">
          Ja tem conta?{" "}
          <Link href="/login" className="text-cyan-300 underline-offset-4 hover:underline">
            Fazer login
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
