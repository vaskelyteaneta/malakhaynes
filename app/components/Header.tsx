import { createClient } from "@/prismicio";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import type { SiteMode } from "@/app/lib/site-mode";
import NavLinks from "./NavLinks";

export default async function Header({ mode }: { mode: SiteMode }) {
  const client = createClient();
  const settings = await client.getSingle("settings");
  const isDark = mode === "dark";

  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1rem 2rem 1rem",
        background: "transparent",
        gap: "0.75rem",
      }}
    >
      <PrismicNextLink href={isDark ? "/music" : "/movies"}>
        {isDark ? (
          // Placeholder wordmark for Very Inner Vibrations until a real logo is designed.
          <span
            style={{
              display: "inline-block",
              textAlign: "center",
              fontSize: "1.5rem",
              letterSpacing: "0.15em",
              color: "var(--foreground)",
            }}
          >
            VERY INNER VIBRATIONS
          </span>
        ) : (
          <PrismicNextImage field={settings.data.logo} height={64} fallbackAlt="" />
        )}
      </PrismicNextLink>

      <NavLinks items={settings.data.navigation} />
    </header>
  );
}
