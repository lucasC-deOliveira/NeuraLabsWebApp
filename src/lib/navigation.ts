// Compat dos hooks de navegação do Next (next/navigation) sobre react-router.
// Mantém a mesma API usada nas páginas (useRouter().push, usePathname, etc.)
// para a migração trocar só a linha de import.
import {
  useNavigate,
  useLocation,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
} from "react-router-dom";

export function usePathname(): string {
  return useLocation().pathname;
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    // No SPA não há "refresh" de servidor: as páginas refazem o fetch ao montar.
    refresh: () => {},
    prefetch: () => {},
  };
}

export function useParams<
  T extends Record<string, string> = Record<string, string>,
>(): T {
  return useRouterParams() as T;
}

// next/navigation retorna direto o objeto de busca (ReadonlyURLSearchParams);
// o react-router retorna [params, setParams]. Expomos só o objeto.
export function useSearchParams() {
  return useRouterSearchParams()[0];
}
