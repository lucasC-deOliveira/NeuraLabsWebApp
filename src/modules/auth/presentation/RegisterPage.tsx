"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/lib/navigation";
import { Link } from "@/components/link";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { authHttp } from "../infra/http";
import { registerSchema, type RegisterInput } from "../domain/services/auth-schemas";
import { AuthShell, FIELD_CLASS, FieldError } from "./AuthShell";
import registerHero from "@/assets/auth/register-hero.jpg";

export function RegisterPage() {
  const router = useRouter();

  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterInput) {
    setServerError("");
    try {
      await authHttp.register({ nome: data.nome, email: data.email, senha: data.senha });
      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Erro ao conectar. Tente novamente.");
    }
  }

  return (
    <AuthShell image={registerHero} title="Criar conta" subtitle="Comece a estudar com flashcards inteligentes">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div className="rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300">{serverError}</div>
        )}
        <div className="space-y-2">
          <Label htmlFor="nome" className="text-white/80">Nome</Label>
          <Input id="nome" placeholder="Seu nome" autoFocus className={FIELD_CLASS} {...register("nome")} />
          <FieldError message={errors.nome?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">Email</Label>
          <Input id="email" type="email" placeholder="seu@email.com" className={FIELD_CLASS} {...register("email")} />
          <FieldError message={errors.email?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha" className="text-white/80">Senha</Label>
          <Input id="senha" type="password" placeholder="Minimo 6 caracteres" className={FIELD_CLASS} {...register("senha")} />
          <FieldError message={errors.senha?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="senhaConfirm" className="text-white/80">Confirmar senha</Label>
          <Input id="senhaConfirm" type="password" placeholder="Repita a senha" className={FIELD_CLASS} {...register("senhaConfirm")} />
          <FieldError message={errors.senhaConfirm?.message} />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : "Criar conta"}
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
