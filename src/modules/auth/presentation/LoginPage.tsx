"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { Link } from "@/components/link";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { applyServerErrors } from "@/lib/form-errors";
import { authHttp } from "../infra/http";
import { safeCallbackUrl } from "../domain/services/credential-validation";
import { loginSchema, type LoginInput } from "../domain/services/auth-schemas";
import { AuthShell, FIELD_CLASS } from "./AuthShell";
import loginHero from "@/assets/auth/login-hero.jpg";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl") ?? "/");

  const [serverError, setServerError] = useState("");
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setServerError("");
    try {
      await authHttp.login(data);
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setServerError(applyServerErrors(form, err) ?? "");
    }
  }

  return (
    <AuthShell image={loginHero} title="Entrar" subtitle="Acesse seus estudos">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {serverError && (
            <div className="rounded-md bg-red-500/15 px-3 py-2 text-xs text-red-300">{serverError}</div>
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="seu@email.com" autoFocus className={FIELD_CLASS} {...field} />
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
                <div className="flex items-center justify-between">
                  <FormLabel className="text-white/80">Senha</FormLabel>
                  <Link href="/register" className="text-xs text-cyan-300 underline-offset-4 hover:underline">
                    Criar conta
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" placeholder="••••••" className={FIELD_CLASS} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : "Entrar"}
          </Button>
        </form>
      </Form>
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
