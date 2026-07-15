"use client";

// Quadro único de todas as páginas: mesma largura e mesmo respiro. Antes cada
// página repetia as classes na mão e o app tinha seis larguras diferentes (2xl a
// 7xl), então o conteúdo "pulava" de lugar ao navegar. Alterar aqui vale para todas.

interface PageContainerProps {
  children: React.ReactNode;
  // Espaçamento vertical entre as seções da página (varia com a densidade dela).
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 py-6 sm:py-8 lg:px-8 ${className ?? ""}`}>
      {children}
    </div>
  );
}
