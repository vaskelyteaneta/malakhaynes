import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { isFilled } from "@prismicio/client";
import "./globals.css";
import { createClient } from "@/prismicio";
import Footer from "./components/Footer";
import Header from "./components/Header";
import IntroOverlay from "./components/IntroOverlay";
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

  const client = createClient();
  const settings = await client.getSingle("settings");
  // A pasted external URL (.m3u8/.mp4) wins over an uploaded mp4 file.
  const introSrc =
    settings.data.intro_video_url?.trim() ||
    (isFilled.linkToMedia(settings.data.intro_video) ? settings.data.intro_video.url : null);

  return (
    <html
      lang="en"
      data-theme={mode}
      className={`${cormorantGaramond.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
          {introSrc && (
            <IntroOverlay
              src={introSrc}
              mode={mode}
              logo={settings.data.logo}
              frequency={settings.data.intro_frequency}
            />
          )}
          <StickyHeader>
            <Header mode={mode} />
          </StickyHeader>
          {/* Keyed on mode so a theme toggle (router.refresh(), not a full page
              load) remounts every Client Component under here fresh. Without
              this, components like MediaGrid/VimeoPlayer keep their old DOM
              refs and state across the refresh and can render blank. */}
          <div key={mode} style={{ paddingTop: "128px", flex: "1 0 auto" }}>{children}</div>
          <ThemeToggle mode={mode} />
          <Footer />
        </body>
    </html>
  );
}
