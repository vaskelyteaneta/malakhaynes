"use client";

import { useRouter } from "next/navigation";
import type { SiteMode } from "@/app/lib/site-mode";

// Same cookie proxy.ts reads (MODE_COOKIE) — set directly on the client so
// switching themes doesn't require a full page navigation (which would
// reset scroll position to the top).
const MODE_COOKIE = "site-mode";

export default function ThemeToggle({ mode }: { mode: SiteMode }) {
  const router = useRouter();
  const nextMode: SiteMode = mode === "dark" ? "light" : "dark";

  const toggle = () => {
    document.cookie = `${MODE_COOKIE}=${nextMode}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={toggle}
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
        padding: 0,
        cursor: "pointer",
      }}
    />
  );
}
