import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import { BookOpenIcon, ArrowUpRightIcon } from "lucide-react";
import { desktop } from "@/lib/vault-bridge";
import { drawPdfCover, openLocalPdf } from "../infra/pdf-reader";

export interface LibraryFile { path: string; name: string }
type CoverQueue = RefObject<Promise<void>>;

function enqueueCover(queue: CoverQueue, task: () => Promise<void>): void {
  queue.current = queue.current.then(task).catch(() => undefined);
}

async function renderCover(file: string, canvas: HTMLCanvasElement, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const book = await openLocalPdf(await desktop.vault.readLibraryPdf(file), signal);
  try {
    await drawPdfCover(book, canvas, signal);
  } finally {
    book.close();
  }
}

function observeCover(canvas: HTMLCanvasElement, queue: CoverQueue, file: string, ready: () => void): () => void {
  const controller = new AbortController();
  const load = (): void => enqueueCover(queue, async () => {
    await renderCover(file, canvas, controller.signal);
    if (!controller.signal.aborted) ready();
  });
  if (typeof IntersectionObserver === "undefined") {
    load();
    return (): void => controller.abort();
  }
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return;
    observer.disconnect();
    load();
  });
  observer.observe(canvas);
  return (): void => { observer.disconnect(); controller.abort(); };
}

function BookCoverCard({ file, queue, onOpen }: { file: LibraryFile; queue: CoverQueue; onOpen: (file: LibraryFile) => void }): ReactElement {
  const surface = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const title = file.name.replace(/\.pdf$/iu, "").replace(/_/gu, " ");
  useEffect(() => {
    if (!surface.current) return undefined;
    return observeCover(surface.current, queue, file.path, () => setReady(true));
  }, [file.path, queue]);

  return (
    <button
      type="button"
      onClick={() => onOpen(file)}
      title={file.path}
      className="group relative isolate grid aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-950 text-left text-white shadow-md transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transform-none"
    >
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950" aria-hidden="true">
        <BookOpenIcon className="size-14 -translate-y-4 text-indigo-200/45" strokeWidth={1.25} />
      </div>
      <canvas ref={surface} aria-hidden="true" className={`absolute inset-0 size-full bg-white object-cover object-top transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`} />
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 bg-gradient-to-t from-black via-black/85 to-transparent px-4 pb-4 pt-12">
        <span className="line-clamp-3 flex-1 text-sm font-semibold leading-snug sm:text-base">{title}</span>
        <ArrowUpRightIcon className="size-4 shrink-0 text-white/80" aria-hidden="true" />
      </div>
    </button>
  );
}

/** Displays local books, for example <LibraryShelf files={files} onOpen={open} />. */
export function LibraryShelf({ files, onOpen }: { files: LibraryFile[]; onOpen: (file: LibraryFile) => void }): ReactElement {
  const queue = useRef(Promise.resolve());
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-5">
      {files.map((file) => <li key={file.path}><BookCoverCard file={file} queue={queue} onOpen={onOpen} /></li>)}
    </ul>
  );
}
