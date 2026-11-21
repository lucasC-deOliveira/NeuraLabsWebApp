import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

import type { GraphConfirmationState } from "../hooks/useGraphConfirmation";

export function GraphConfirmation({ request, finish }: Pick<GraphConfirmationState, "request" | "finish">) {
  const cancel = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => { if (!open) finish(false); }}>
      <DialogContent initialFocus={cancel} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          {request?.description && <DialogDescription>{request.description}</DialogDescription>}
        </DialogHeader>
        {request?.affectedGraphs && (
          <ul aria-label="Grafos afetados" className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
            {request.affectedGraphs.map(({ id, name }) => <li key={id}>{name}</li>)}
          </ul>
        )}
        <DialogFooter>
          <Button ref={cancel} variant="outline" onClick={() => finish(false)}>Cancelar</Button>
          <Button variant={request?.destructive ? "destructive" : "default"} onClick={() => finish(true)}>
            {request?.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
