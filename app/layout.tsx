import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import StickyHeader from "./components/StickyHeader";
import ThemeToggle from "./components/ThemeToggle";
import { getSiteMode } from "./lib/site-mode";

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const mode = await getSiteMode();
  return mode === "dark"
    ? { title: "Very Inner Vibrations", description: "Very Inner Vibrations" }
    : { title: "Malak Haynes", description: "Malak Haynes" };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mode = await getSiteMode();

  return (
    <html
      lang="en"
      data-theme={mode}
      className={`${cormorantGaramond.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
          <ThemeToggle mode={mode} />
          <StickyHeader>
            <Header mode={mode} />
          </StickyHeader>
          <div style={{ paddingTop: "160px" }}>{children}</div>
        </body>
    </html>
  );
}
