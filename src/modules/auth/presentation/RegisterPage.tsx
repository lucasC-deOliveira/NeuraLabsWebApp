"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@/lib/navigation";
import { Link } from "@/components/link";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { applyServerErrors } from "@/lib/form-errors";
import { authHttp } from "../infra/http";
import { registerSchema, type RegisterInput } from "../domain/services/auth-schemas";
import { AuthShell, FIELD_CLASS } from "./AuthShell";
import registerHero from "@/assets/auth/register-hero.jpg";

export function RegisterPage() {
  const router = useRouter();

  const [serverError, setServerError] = useState("");
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterInput) {
    setServerError("");
    try {
      await authHttp.register({ nome: data.nome, email: data.email, senha: data.senha });
      router.push("/");
      router.refresh();
    } catch (err) {
      setServerError(applyServerErrors(form, err) ?? "");
    }
  }

  return (
    <AuthShell image={registerHero} title="Criar conta" subtitle="Comece a estudar com flashcards inteligentes">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <div className="rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300">{serverError}</div>
          )}
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome" autoFocus className={FIELD_CLASS} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="seu@email.com" className={FIELD_CLASS} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="senha"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">Senha</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Minimo 6 caracteres" className={FIELD_CLASS} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="senhaConfirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">Confirmar senha</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Repita a senha" className={FIELD_CLASS} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : "Criar conta"}
          </Button>
          <p className="text-center text-xs text-white/60">
            Ja tem conta?{" "}
            <Link href="/login" className="text-cyan-300 underline-offset-4 hover:underline">
              Fazer login
            </Link>
          </p>
        </form>
      </Form>
    </AuthShell>
  );
}
