"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/lib/navigation";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
  authPaths: string[];
}

const COLLAPSED_KEY = "sidebar-collapsed";

export function AppShell({ children, authPaths }: AppShellProps) {
  const pathname = usePathname();
  const isAuthPage = authPaths.includes(pathname);

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
  }, []);

  const toggleCollapse = () =>
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      return !c;
    });

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <main
        className={`ml-0 ${collapsed ? "md:ml-14" : "md:ml-56"} mt-14 md:mt-0 flex-1 transition-[margin] duration-200`}
      >
        {children}
      </main>
    </>
  );
}
