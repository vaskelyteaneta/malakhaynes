"use client";

import { usePathname } from "next/navigation";
import type { SiteMode } from "@/app/lib/site-mode";

export default function ThemeToggle({ mode }: { mode: SiteMode }) {
  const pathname = usePathname();
  const nextMode: SiteMode = mode === "dark" ? "light" : "dark";

  return (
    <a
      href={`${pathname}?${nextMode}`}
      aria-label={`Switch to ${nextMode} mode`}
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 200,
        display: "block",
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: nextMode === "dark" ? "#000" : "#fff",
        border: "1px solid rgba(128,128,128,0.5)",
      }}
    />
  );
}
