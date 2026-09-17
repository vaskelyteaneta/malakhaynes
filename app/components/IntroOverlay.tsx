"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PrismicNextImage } from "@prismicio/next";
import type { ImageField } from "@prismicio/client";
import type { SiteMode } from "@/app/lib/site-mode";
// Type-only import: erased at build time so hls.js is never in the server
// bundle. The runtime library loads lazily on the client, only for .m3u8.
import type Hls from "hls.js";

const SEEN_KEY = "intro_seen";

// sessionStorage: cleared when the tab closes, and scoped to that tab alone —
// opening the site in a new tab replays the intro there.
function hasSeenIntro(): boolean {
  return typeof window !== "undefined" && sessionStorage.getItem(SEEN_KEY) === "1";
}

function markIntroSeen(): void {
  sessionStorage.setItem(SEEN_KEY, "1");
}

// Auto-dismiss the intro after this long even without any interaction.
const AUTO_DISMISS_MS = 2000;
// Fade-out duration; kept in sync with the CSS transition below.
const FADE_MS = 700;

const isHlsSource = (src: string): boolean => /\.m3u8(\?|#|$)/i.test(src);

export default function IntroOverlay({
  src,
  mode,
  logo,
  frequency,
}: {
  src: string;
  mode: SiteMode;
  logo: ImageField;
  frequency: "Once per session" | "Every visit" | null;
}) {
  const [show, setShow] = useState(true);
  const [closing, setClosing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Decide visibility before first paint to avoid a flash of the splash for
  // visitors who've already seen it this session.
  useLayoutEffect(() => {
    if (frequency === "Every visit") return;
    if (hasSeenIntro()) {
      setShow(false);
      return;
    }
    markIntroSeen();
  }, [frequency]);

  // Wire the video source (HLS via hls.js where needed) and start playback.
  useEffect(() => {
    if (!show) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let cancelled = false;

    if (!isHlsSource(src) || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      import("hls.js").then(({ default: HlsLib }) => {
        if (cancelled || !videoRef.current) return;
        if (HlsLib.isSupported()) {
          hls = new HlsLib();
          hls.loadSource(src);
          hls.attachMedia(videoRef.current);
        } else {
          videoRef.current.src = src;
        }
      });
    }
    // Muted autoplay is allowed without a user gesture; ignore rejections.
    video.play().catch(() => {});

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [show, src]);

  // Lock scroll, dismiss on interaction, and auto-dismiss after a timeout.
  useEffect(() => {
    if (!show) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dismiss = () => setClosing(true);

    const events = ["scroll", "wheel", "touchmove", "pointerdown", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, dismiss, { passive: true }));
    const autoTimer = window.setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(autoTimer);
      events.forEach((e) => window.removeEventListener(e, dismiss));
      document.body.style.overflow = prevOverflow;
    };
  }, [show]);

  // After the fade completes, unmount fully.
  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(() => setShow(false), FADE_MS);
    return () => window.clearTimeout(t);
  }, [closing]);

  if (!show) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--background)",
        opacity: closing ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: closing ? "none" : "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        muted
        autoPlay
        loop
        playsInline
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Brand logo over the video: image for Malak (light), text wordmark for
          Very Inner Vibrations (dark), matching the site header. */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "1rem" }}>
        {mode === "dark" ? (
          <span
            style={{
              display: "inline-block",
              fontSize: "clamp(1.5rem, 4vw, 3rem)",
              letterSpacing: "0.15em",
              color: "#fff",
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            VERY INNER VIBRATIONS
          </span>
        ) : (
          <PrismicNextImage
            field={logo}
            fallbackAlt=""
            style={{ maxWidth: "min(60vw, 320px)", height: "auto", filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.35))" }}
          />
        )}
      </div>
    </div>
  );
}
