"use client";

import { useState, useEffect } from "react";
import { Link } from "@/components/link";
import { usePathname, useRouter } from "@/lib/navigation";
import { BrainIcon, LayersIcon, NetworkIcon, FileTextIcon, MenuIcon, XIcon, SettingsIcon, LogOutIcon, UserIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, HelpCircleIcon, ClipboardListIcon, LibraryIcon, BarChart3Icon, CalendarCheckIcon } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { authApi } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// envolve o elemento com tooltip à direita (usado na sidebar retraída)
function SideTip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: BrainIcon },
  { href: "/estudo", label: "Plano de Estudo", icon: CalendarCheckIcon },
  { href: "/flashcards", label: "Flashcards", icon: LayersIcon },
  { href: "/baralhos", label: "Baralhos", icon: LibraryIcon },
  { href: "/questions", label: "Questões", icon: HelpCircleIcon },
  { href: "/provas", label: "Provas", icon: ClipboardListIcon },
  { href: "/notes", label: "Notas", icon: FileTextIcon },
  { href: "/graph", label: "Grafo", icon: NetworkIcon },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon },
  { href: "/settings", label: "Configuracoes", icon: SettingsIcon },
];

function NavContent({
  onItemClick,
  collapsed = false,
}: {
  onItemClick?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        const link = (
          <Link
            href={item.href}
            onClick={onItemClick}
            className={`flex items-center gap-2.5 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              collapsed ? "justify-center px-0" : "px-3"
            } ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-primary hover:bg-primary/10"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && item.label}
          </Link>
        );

        return collapsed ? (
          <SideTip key={item.href} label={item.label}>
            {link}
          </SideTip>
        ) : (
          <span key={item.href}>{link}</span>
        );
      })}
    </nav>
  );
}

function UserSection({
  user,
  collapsed = false,
}: {
  user: CurrentUser;
  collapsed?: boolean;
}) {
  const router = useRouter();

  async function handleLogout() {
    await authApi.logout();
    router.push("/login");
    router.refresh();
  }

  if (collapsed) {
    return (
      <div className="border-t border-border pt-3 flex flex-col items-center gap-2">
        <SideTip label={`${user.name} (${user.email})`}>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </SideTip>
        <SideTip label="Sair">
          <button
            onClick={handleLogout}
            className="flex size-8 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary/10"
          >
            <LogOutIcon className="size-3.5" />
          </button>
        </SideTip>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-3">
      <div className="flex items-center gap-2 px-1 py-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-primary">{user.name}</p>
          <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
      >
        <LogOutIcon className="size-3.5" />
        Sair
      </button>
    </div>
  );
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((u) => setUser(u ? { id: u.id, name: u.nome, email: u.email } : null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Mobile hamburger + brand bar */}
      <header className="app-sidebar-top fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Abrir menu"
        >
          <MenuIcon className="size-5" />
        </button>

        <Link href="/" className="flex items-center gap-2 font-semibold text-base text-primary">
          <BrainIcon className="size-5" />
          NeuraLabs
        </Link>

        <ThemeToggle />
      </header>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <aside className="app-sidebar absolute left-0 top-0 bottom-0 flex flex-col w-64 bg-background p-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 font-semibold text-lg text-primary"
              >
                <BrainIcon className="size-5" />
                NeuraLabs
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Fechar menu"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <NavContent onItemClick={() => setMobileOpen(false)} />

            {user && <UserSection user={user} />}
            {!loading && !user && (
              <div className="mt-auto pt-3 border-t border-border">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <UserIcon className="size-3.5" />
                  Fazer login
                </Link>
              </div>
            )}

            <div className="mt-2">
              <ThemeToggle />
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <TooltipProvider delay={200}>
      <aside
        className={`app-sidebar hidden md:flex fixed left-0 top-0 z-40 h-screen flex-col border-r border-border bg-background transition-[width] duration-200 ${
          collapsed ? "w-14 px-2 py-4" : "w-56 p-4"
        }`}
      >
        <div className={`flex items-center mb-6 ${collapsed ? "flex-col gap-2" : "justify-between"}`}>
          {collapsed ? (
            <SideTip label="NeuraLabs">
              <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-primary">
                <BrainIcon className="size-5 shrink-0" />
              </Link>
            </SideTip>
          ) : (
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-primary">
              <BrainIcon className="size-5 shrink-0" />
              NeuraLabs
            </Link>
          )}
          <SideTip label={collapsed ? "Expandir menu" : "Recolher menu"}>
            <button
              onClick={onToggleCollapse}
              className="flex size-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
            >
              {collapsed ? <PanelLeftOpenIcon className="size-4" /> : <PanelLeftCloseIcon className="size-4" />}
            </button>
          </SideTip>
        </div>

        <NavContent collapsed={collapsed} />

        {user && <UserSection user={user} collapsed={collapsed} />}
        {!loading && !user && (
          <div className={`mt-auto pt-4 border-t border-border ${collapsed ? "flex flex-col items-center gap-2" : ""}`}>
            {collapsed ? (
              <SideTip label="Fazer login">
                <Link
                  href="/login"
                  className="flex size-8 items-center justify-center rounded-lg text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <UserIcon className="size-3.5 shrink-0" />
                </Link>
              </SideTip>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <UserIcon className="size-3.5 shrink-0" />
                Fazer login
              </Link>
            )}
            <div className={collapsed ? "" : "mt-2"}>
              <ThemeToggle />
            </div>
          </div>
        )}
      </aside>
      </TooltipProvider>
    </>
  );
}
