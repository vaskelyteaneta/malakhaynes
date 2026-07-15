import { createClient } from "@/prismicio";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import type { SiteMode } from "@/app/lib/site-mode";

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
        padding: "2.5rem 2rem 1.5rem",
        background: "var(--background)",
        gap: "1.25rem",
      }}
    >
      <PrismicNextLink href="/">
        {isDark ? (
          // Placeholder wordmark for Very Inner Vibrations until a real logo is designed.
          <span
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
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

      <nav style={{ display: "flex", gap: "2.5rem" }}>
        {settings.data.navigation.map((item) => (
          <PrismicNextLink
            key={item.label}
            field={item.link}
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "1rem",
              color: "var(--foreground)",
              textDecoration: "none",
            }}
          >
            {item.label}
          </PrismicNextLink>
        ))}
      </nav>
    </header>
  );
}
