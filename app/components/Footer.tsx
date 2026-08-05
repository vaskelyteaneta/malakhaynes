import { createClient } from "@/prismicio";
import { isFilled } from "@prismicio/client";
import { PrismicNextLink } from "@prismicio/next";
import { PrismicRichText } from "@prismicio/react";

export default async function Footer() {
  const client = createClient();
  const settings = await client.getSingle("settings");
  const footerLinks = settings.data.footer_links ?? [];

  return (
    <footer
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        padding: "2.5rem 2rem",
        textAlign: "center",
        color: "var(--foreground)",
      }}
    >
      {isFilled.richText(settings.data.footer_text) && (
        <div style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
          <PrismicRichText field={settings.data.footer_text} />
        </div>
      )}
      {footerLinks.length > 0 && (
        <nav style={{ display: "flex", gap: "1.5rem" }}>
          {footerLinks.map((item) =>
            isFilled.link(item.link) ? (
              <PrismicNextLink
                key={item.label}
                field={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.9rem", color: "var(--foreground)", textDecoration: "none" }}
              >
                {item.label}
              </PrismicNextLink>
            ) : null
          )}
        </nav>
      )}
    </footer>
  );
}
