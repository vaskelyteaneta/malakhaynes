"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PrismicNextImage } from "@prismicio/next";
import { isFilled, type ImageField } from "@prismicio/client";
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
const AUTO_DISMISS_MS = 3000;
// Fade-out duration; kept in sync with the CSS transition below.
const FADE_MS = 1500;

const isHlsSource = (src: string): boolean => /\.m3u8(\?|#|$)/i.test(src);

export default function IntroOverlay({
  src,
  image,
  mode,
  logo,
}: {
  // Video wins if set; otherwise falls back to the image; otherwise the
  // splash is just the site's plain background color behind the logo.
  src: string | null;
  image: ImageField;
  mode: SiteMode;
  logo: ImageField;
}) {
  const [show, setShow] = useState(true);
  const [closing, setClosing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Decide visibility before first paint to avoid a flash of the splash for
  // visitors who've already seen it this session. Always once-per-session —
  // no editor-facing control for this.
  useLayoutEffect(() => {
    if (hasSeenIntro()) {
      setShow(false);
      return;
    }
    markIntroSeen();
  }, []);

  // Wire the video source (HLS via hls.js where needed) and start playback.
  // No-op when there's no video (image-only or plain-color splash).
  useEffect(() => {
    if (!show || !src) return;
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

  // Scroll stays locked only while the intro is fully up. It unlocks the
  // moment the fade starts so the scroll that dismissed it takes effect
  // right away, instead of the page sitting frozen for the whole fade.
  useEffect(() => {
    if (!show || closing) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [show, closing]);

  // Dismiss on interaction, and auto-dismiss after a timeout.
  useEffect(() => {
    if (!show || closing) return;

    const dismiss = () => setClosing(true);

    const events = ["scroll", "wheel", "touchmove", "pointerdown", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, dismiss, { passive: true }));
    const autoTimer = window.setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(autoTimer);
      events.forEach((e) => window.removeEventListener(e, dismiss));
    };
  }, [show, closing]);

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
      {src ? (
        <video
          ref={videoRef}
          muted
          autoPlay
          loop
          playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        isFilled.image(image) && (
          <PrismicNextImage
            field={image}
            fallbackAlt=""
            fill
            style={{ objectFit: "cover" }}
          />
        )
        // Neither video nor image: the div's own background color is the
        // whole splash, with just the logo/wordmark over it.
      )}

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
