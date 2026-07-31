"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2Icon } from "lucide-react";
import { baralhoSchema, type BaralhoInput } from "../../domain/services/baralho-schema";

interface CreateBaralhoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onCreate: (titulo: string) => void;
}

export function CreateBaralhoDialog({ open, onOpenChange, submitting, onCreate }: CreateBaralhoDialogProps) {
  const form = useForm<BaralhoInput>({ resolver: zodResolver(baralhoSchema), defaultValues: { titulo: "" } });

  // Ao reabrir o diálogo, limpa o campo e os erros da tentativa anterior.
  useEffect(() => {
    if (open) form.reset({ titulo: "" });
  }, [open, form]);

  function onSubmit(data: BaralhoInput): void {
    onCreate(data.titulo);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo baralho</DialogTitle>
          <DialogDescription>
            Crie o baralho e depois adicione os cartões que quiser estudar junto.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormLabel>Titulo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Biologia — Genética" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2Icon className="size-3.5 mr-1 animate-spin" />}
                Criar baralho
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
