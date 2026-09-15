"use client";

import { useRef, useState } from "react";
import type { SiteMode } from "@/app/lib/site-mode";

// Malak Haynes and Very Inner Vibrations are two fully separate deployments
// (own Prismic repo, own Vercel project, own domain). This is no longer a
// same-site mode toggle — it's a hard link to the other site.
const VERY_INNER_VIBRATIONS_URL = "https://very-inner-vibrations.vercel.app";

export default function ThemeToggle({ mode }: { mode: SiteMode }) {
  const otherMode: SiteMode = mode === "dark" ? "light" : "dark";
  const [dimmed, setDimmed] = useState(false);
  const blinkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startBlink = () => {
    if (blinkInterval.current) return;
    // Only blink on devices with a real hover (desktop). On touch, a tap fires
    // mouseenter but never mouseleave, so the blink would get stuck "on".
    if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) return;
    blinkInterval.current = setInterval(() => setDimmed((prev) => !prev), 500);
  };

  const stopBlink = () => {
    if (blinkInterval.current) {
      clearInterval(blinkInterval.current);
      blinkInterval.current = null;
    }
    setDimmed(false);
  };

  return (
    <a
      href={VERY_INNER_VIBRATIONS_URL}
      aria-label={`Visit the ${otherMode === "dark" ? "Very Inner Vibrations" : "Malak Haynes"} site`}
      onMouseEnter={startBlink}
      onMouseLeave={stopBlink}
      className="theme-toggle"
      style={{
        display: "block",
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: otherMode === "dark" ? "#000" : "#fff",
        border: "1px solid rgba(128,128,128,0.5)",
        padding: 0,
        cursor: "pointer",
        opacity: dimmed ? 0.15 : 1,
        transition: "opacity 0.15s ease",
      }}
    />
  );
}
