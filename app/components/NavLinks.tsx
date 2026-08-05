"use client";

import { usePathname } from "next/navigation";
import { PrismicNextLink } from "@prismicio/next";
import { isFilled, type Content } from "@prismicio/client";

export default function NavLinks({ items }: { items: Content.SettingsDocumentDataNavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", gap: "2.5rem" }}>
      {items.map((item) => {
        const href = isFilled.link(item.link) ? item.link.url : undefined;
        const isActive = href
          ? href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`)
          : false;

        return (
          <PrismicNextLink
            key={item.label}
            field={item.link}
            style={{
              fontSize: "1rem",
              color: isActive ? "#888" : "var(--foreground)",
              textDecoration: "none",
            }}
          >
            {item.label}
          </PrismicNextLink>
        );
      })}
    </nav>
  );
}
