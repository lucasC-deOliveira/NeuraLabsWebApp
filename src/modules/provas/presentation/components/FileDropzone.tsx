"use client";

import { useRef, useState } from "react";
import { UploadCloudIcon, CheckCircle2Icon, XIcon } from "lucide-react";

export function FileDropzone({ label, accept, file, onFile }: {
  label: string;
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  };

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed p-5 text-center transition-colors cursor-pointer ${
        dragging
          ? "border-primary bg-primary/5"
          : file
          ? "border-green-500 bg-green-50 dark:bg-green-950/20"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2Icon className="size-5 text-green-600 dark:text-green-400 shrink-0" />
          <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onFile(null); }}
            className="text-zinc-400 hover:text-red-500"
            title="Remover"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <UploadCloudIcon className="size-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">PDF, DOCX ou TXT · até 10 MB</p>
          <p className="text-xs text-muted-foreground">Clique ou arraste o arquivo aqui</p>
        </div>
      )}
    </div>
  );
}
