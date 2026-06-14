// Compat de Link: aceita `href` (estilo Next) e delega ao Link do react-router.
// Permite migrar do `next/link` trocando apenas a linha de import.
import { Link as RouterLink } from "react-router-dom";
import type { ComponentPropsWithoutRef } from "react";

type LinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
  // props do next/link sem efeito no SPA — aceitas e ignoradas
  prefetch?: boolean;
  scroll?: boolean;
  replace?: boolean;
};

export function Link({ href, prefetch: _prefetch, scroll: _scroll, replace, ...rest }: LinkProps) {
  return <RouterLink to={href} replace={replace} {...rest} />;
}

export default Link;
