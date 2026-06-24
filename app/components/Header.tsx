import { createClient } from "@/prismicio";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";

export default async function Header() {
  const client = createClient();
  const settings = await client.getSingle("settings");

  return (
    <header
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2.5rem 2rem 1.5rem",
        background: "#fff",
        gap: "1.25rem",
      }}
    >
      <PrismicNextLink href="/">
        <PrismicNextImage field={settings.data.logo} height={64} fallbackAlt="" />
      </PrismicNextLink>

      <nav style={{ display: "flex", gap: "2.5rem" }}>
        {settings.data.navigation.map((item) => (
          <PrismicNextLink
            key={item.label}
            field={item.link}
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "1rem",
              color: "#111",
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
