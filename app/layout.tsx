import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import StickyHeader from "./components/StickyHeader";
import ThemeToggle from "./components/ThemeToggle";
import { getSiteMode } from "./lib/site-mode";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
