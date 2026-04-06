"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainIcon, LayersIcon, FlameIcon, NetworkIcon, FileTextIcon } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: BrainIcon },
  { href: "/flashcards", label: "Flashcards", icon: LayersIcon },
  { href: "/notes", label: "Notas", icon: FileTextIcon },
  { href: "/study", label: "Estudar", icon: FlameIcon },
  { href: "/graph", label: "Grafo", icon: NetworkIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-56 border-r bg-background p-4 flex flex-col">
      <Link href="/" className="flex items-center gap-2 font-semibold text-lg mb-8">
        <BrainIcon className="size-5" />
        FlashMind
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
