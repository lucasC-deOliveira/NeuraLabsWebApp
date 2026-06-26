import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { usePathname, useRouter, useParams, useSearchParams } from "./navigation";

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

beforeEach(() => navigate.mockClear());

const wrapperAt =
  (initial: string) =>
  ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>;

describe("navigation compat (next/navigation over react-router)", () => {
  it("usePathname returns the current pathname", () => {
    const { result } = renderHook(() => usePathname(), { wrapper: wrapperAt("/foo") });
    expect(result.current).toBe("/foo");
  });

  it("useRouter maps push/replace/back/forward onto navigate", () => {
    const { result } = renderHook(() => useRouter(), { wrapper: wrapperAt("/") });
    result.current.push("/x");
    expect(navigate).toHaveBeenCalledWith("/x");
    result.current.replace("/y");
    expect(navigate).toHaveBeenCalledWith("/y", { replace: true });
    result.current.back();
    expect(navigate).toHaveBeenCalledWith(-1);
    result.current.forward();
    expect(navigate).toHaveBeenCalledWith(1);
  });

  it("refresh/prefetch are safe no-ops in the SPA", () => {
    const { result } = renderHook(() => useRouter(), { wrapper: wrapperAt("/") });
    expect(() => {
      result.current.refresh();
      result.current.prefetch();
    }).not.toThrow();
  });

  it("useSearchParams exposes only the read-only params object", () => {
    const { result } = renderHook(() => useSearchParams(), { wrapper: wrapperAt("/x?a=1&b=2") });
    expect(result.current.get("a")).toBe("1");
    expect(result.current.get("b")).toBe("2");
  });

  it("useParams returns the route params object", () => {
    const { result } = renderHook(() => useParams(), { wrapper: wrapperAt("/x") });
    expect(result.current).toEqual({});
  });
});
