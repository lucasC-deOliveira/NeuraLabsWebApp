"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Sanitização explícita de URLs de links/imagens: bloqueia esquemas perigosos
// (javascript:, data:, vbscript:, file:...) que poderiam causar XSS. Permite
// relativo, âncora e apenas http/https/mailto/tel. Reforça o padrão do
// react-markdown e protege contra regressões (ex.: alguém habilitar rehype-raw).
const SAFE_URL_SCHEMES = ["http", "https", "mailto", "tel"];
function safeUrl(url: string): string {
  const v = (url ?? "").trim();
  const scheme = v.match(/^([a-z][a-z0-9+.-]*):/i);
  // sem esquema (relativo/âncora) é permitido; com esquema, só os da allowlist
  if (scheme && !SAFE_URL_SCHEMES.includes(scheme[1].toLowerCase())) return "";
  return v;
}

// Renderizador compartilhado de markdown (GFM: tabelas, listas de tarefas,
// riscado, links automáticos) com a tipografia do tema. Não habilita rehype-raw,
// então HTML cru no markdown NÃO é renderizado (mitiga XSS).
export function MarkdownContent({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      urlTransform={safeUrl}
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl sm:text-2xl font-bold mt-6 mb-3 text-primary">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg sm:text-xl font-semibold mt-4 mb-2 text-primary">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base sm:text-lg font-semibold mt-3 mb-1.5">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm text-foreground/85 leading-relaxed break-words my-2">{children}</p>
        ),
        ul: ({ children }) => <ul className="list-disc ml-5 my-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-5 my-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-sm text-foreground/85">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/60 pl-3 my-3 text-sm italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        code: ({ className, children }) => {
          const isBlock = /language-/.test(className ?? "");
          return isBlock ? (
            <code className={`${className} block`}>{children}</code>
          ) : (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
          );
        },
        pre: ({ children }) => (
          <pre className="rounded-md bg-muted p-3 my-3 overflow-x-auto font-mono text-xs leading-relaxed">
            {children}
          </pre>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border bg-muted px-2 py-1.5 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-2 py-1.5">{children}</td>
        ),
        hr: () => <hr className="my-4 border-border" />,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
