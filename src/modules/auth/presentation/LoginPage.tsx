"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { Link } from "@/components/link";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { authHttp } from "../infra/http";
import { safeCallbackUrl } from "../domain/services/credential-validation";
import { loginSchema, type LoginInput } from "../domain/services/auth-schemas";
import { AuthShell, FIELD_CLASS, FieldError } from "./AuthShell";
import loginHero from "@/assets/auth/login-hero.jpg";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl") ?? "/");

  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setServerError("");
    try {
      await authHttp.login(data);
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Erro ao conectar. Tente novamente.");
    }
  }

  return (
    <AuthShell image={loginHero} title="Entrar" subtitle="Acesse seus estudos">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div className="rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300">{serverError}</div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/80">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            autoFocus
            className={FIELD_CLASS}
            {...register("email")}
          />
          <FieldError message={errors.email?.message} />
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
            className={FIELD_CLASS}
            {...register("senha")}
          />
          <FieldError message={errors.senha?.message} />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : "Entrar"}
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
