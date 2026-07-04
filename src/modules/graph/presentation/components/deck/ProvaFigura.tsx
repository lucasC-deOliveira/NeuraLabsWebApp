import { useEffect, useState } from "react";
import { Loader2Icon, ImageOffIcon } from "lucide-react";
import { graphHttp } from "@/modules/graph/infra/http";

// Renders a stored question figure. The bytes come from a JWT-guarded endpoint,
// so we fetch them as a Blob (with the Bearer token) and show an object URL —
// an <img src> pointing at the endpoint would send no Authorization header.
export function ProvaFigura({ imagemId }: { imagemId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let ignore = false;
    graphHttp
      .fetchProvaImagem(imagemId)
      .then((blob): void => {
        if (ignore) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((): void => {
        if (!ignore) setFailed(true);
      });
    return (): void => {
      ignore = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imagemId]);

  if (failed) {
    return (
      <div className="flex items-center gap-1.5 rounded border border-dashed px-2.5 py-2 text-xs text-muted-foreground">
        <ImageOffIcon className="size-3.5" /> Não foi possível carregar a figura
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex justify-center rounded border bg-muted/30 py-6">
        <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt="Figura da questão"
      className="max-h-64 max-w-full rounded border bg-white object-contain"
    />
  );
}
