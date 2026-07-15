"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";

interface CreateBaralhoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onCreate: (titulo: string) => void;
}

export function CreateBaralhoDialog({ open, onOpenChange, submitting, onCreate }: CreateBaralhoDialogProps) {
  const [titulo, setTitulo] = useState("");
  const submit = (): void => {
    onCreate(titulo);
    setTitulo("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo baralho</DialogTitle>
          <DialogDescription>
            Crie o baralho e depois adicione os cartões que quiser estudar junto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          <Label htmlFor="titulo-baralho">Titulo</Label>
          <Input
            id="titulo-baralho"
            placeholder="Ex.: Biologia — Genética"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && titulo.trim()) submit(); }}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!titulo.trim() || submitting} onClick={submit}>
            {submitting && <Loader2Icon className="size-3.5 mr-1 animate-spin" />}
            Criar baralho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
