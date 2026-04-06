"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
  authPaths: string[];
}

export function AppShell({ children, authPaths }: AppShellProps) {
  const pathname = usePathname();
  const isAuthPage = authPaths.includes(pathname);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="ml-0 md:ml-56 mt-14 md:mt-0 flex-1">{children}</main>
    </>
  );
}
