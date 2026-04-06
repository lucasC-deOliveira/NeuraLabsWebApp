"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrainIcon, LayersIcon, FlameIcon, NetworkIcon, FileTextIcon, MenuIcon, XIcon, SettingsIcon, LogOutIcon, UserIcon } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface CurrentUser {
  id: string;
  nome: string;
  email: string;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: BrainIcon },
  { href: "/flashcards", label: "Flashcards", icon: LayersIcon },
  { href: "/notes", label: "Notas", icon: FileTextIcon },
  { href: "/study", label: "Estudar", icon: FlameIcon },
  { href: "/graph", label: "Grafo", icon: NetworkIcon },
  { href: "/settings", label: "Configuracoes", icon: SettingsIcon },
];

function NavContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserSection({ user }: { user: CurrentUser }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="border-t border-border pt-3">
      <div className="flex items-center gap-2 px-1 py-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {user.nome.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{user.nome}</p>
          <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOutIcon className="size-3.5" />
        Sair
      </button>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Mobile hamburger + brand bar */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Abrir menu"
        >
          <MenuIcon className="size-5" />
        </button>

        <Link href="/" className="flex items-center gap-2 font-semibold text-base">
          <BrainIcon className="size-5" />
          FlashMind
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
          <aside className="absolute left-0 top-0 bottom-0 flex flex-col w-64 bg-background p-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 font-semibold text-lg"
              >
                <BrainIcon className="size-5" />
                FlashMind
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
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
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
      <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-56 flex-col border-r border-border bg-background p-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg mb-8">
          <BrainIcon className="size-5" />
          FlashMind
        </Link>

        <NavContent />

        {user && <UserSection user={user} />}
        {!loading && !user && (
          <div className="mt-auto pt-4 border-t border-border">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              <UserIcon className="size-3.5" />
              Fazer login
            </Link>
            <div className="mt-2">
              <ThemeToggle />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
