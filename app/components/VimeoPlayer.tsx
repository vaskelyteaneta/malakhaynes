"use client";

import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";
import { snapAspectRatio } from "@/app/lib/aspect-ratio";

// Shape the player to the video's own aspect ratio, taken from the dimensions
// Prismic stores with the embed. Forcing every video into 16:9 is what put
// black bars around anything that isn't — pillarboxing a square 1:1 video down
// the sides, letterboxing a 2:1 film top and bottom. With the box matching the
// video there are no bars to hide, so nothing has to be covered up.
const DEFAULT_RATIO = 9 / 16;

// A tall format at full column width gets enormous — a 1:1 video is as tall as
// it is wide, so it fills the whole screen and pushes everything else out of
// view. Cap the height and let the box narrow to suit, centred in its column.
// Widescreen is unaffected: 16:9 only reaches this height on a very wide
// viewport, so those still run the full width as before.
// No height cap. A cap on height means the resulting WIDTH depends on each
// video's aspect ratio and on the window height, so a row of videos lands on a
// different width each — which is what made them look misaligned. Width is set
// by the column (see CONTAINER_WIDTH in MediaGrid) and height simply follows
// the video's own shape, the way malakhaynes.com has always done it.

export default function VimeoPlayer({
  html,
  width,
  height,
}: {
  html: string;
  width?: number | null;
  height?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hovered, setHovered] = useState(false);

  const ratio = width && height && width > 0 ? snapAspectRatio(width, height) : DEFAULT_RATIO;

  const videoId = html.match(/vimeo\.com\/video\/(\d+)/)?.[1];
  const src = videoId
    ? `https://player.vimeo.com/video/${videoId}?controls=0&title=0&byline=0&portrait=0&transparent=0&dnt=1`
    : null;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !src) return;
    // Force the iframe to (re)load its source. On client-side route changes
    // React can reuse a previous VimeoPlayer's iframe DOM node — whose player was
    // already destroyed on unmount — and, seeing the same src, never re-requests
    // it, leaving the player blank. Reassigning src guarantees a fresh load on
    // every mount (that's why it worked on a full page load but not on an
    // in-app click-through).
    iframe.src = src;
    const player = new Player(iframe);
    playerRef.current = player;
    player.getDuration().then(d => setDuration(d));
    player.on("play", () => setPlaying(true));
    player.on("pause", () => setPlaying(false));
    player.on("ended", () => { setPlaying(false); setProgress(0); setCurrentTime(0); });
    player.on("timeupdate", ({ seconds, percent }) => {
      setProgress(percent * 100);
      setCurrentTime(seconds);
    });
    return () => { player.destroy(); };
  }, [src]);

  // Pause automatically once the player scrolls out of view, so audio doesn't
  // keep playing while scrolling away from it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) playerRef.current?.pause();
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    if (!playerRef.current) return;
    playing ? playerRef.current.pause() : playerRef.current.play();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    playerRef.current.setCurrentTime(duration * pct);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className="media-grid-video-box"
      // Same width cap as the inner .media-grid-video-wrap below. The play
      // overlay and the controls bar are positioned against THIS element, so
      // if it stayed full grid-cell width while the film sat capped and
      // centred inside it, the timecode and seek bar would render out on the
      // blank space beside the film — which is exactly what happened with
      // tall videos, whose cap is narrowest.
      style={{ position: "relative", width: "100%", margin: "0 auto" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The rounding class goes on this inner div, not the outer one above —
          this is the element with the actual clipped box (overflow:hidden +
          the padding-bottom aspect-ratio trick); the outer div has no size or
          background of its own, so rounding it is visually a no-op. */}
      <div
        className="media-grid-video-wrap"
        style={{
          position: "relative",
          // Real aspect-ratio rather than the padding-bottom trick, so the box
          // has a genuine height that max-width can be derived from.
          aspectRatio: `1 / ${ratio}`,
          width: "100%",
          overflow: "hidden",
        }}
      >
        {/* src is intentionally set in the effect (not here) so it loads exactly
            once per mount and reliably (re)loads across client-side navigations. */}
        <iframe
          ref={iframeRef}
          allow="autoplay; fullscreen; picture-in-picture"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        />

      </div>

      {/* Play/pause overlay */}
      <div
        onClick={toggle}
        style={{ position: "absolute", inset: 0, zIndex: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {!playing && (
          // White on both sites rather than var(--foreground): it sits on the
          // film, not on the page, so it has to read against the image.
          // Traced from the play icon on Malak's previous site
          // (playiconwddAsset-6.png, rendered there at 29x28): a hairline
          // triangle filling its box, flat left edge, sharp corners, no disc
          // behind it. Reproduced as an SVG rather than shipping the PNG so it
          // stays crisp at any size.
          <svg
            className="media-grid__play"
            viewBox="0 0 29 28"
            aria-hidden="true"
            focusable="false"
            style={{
              // The old site showed it at 29px on a 683px-wide film, about 4%.
              // Held to that proportion, with a floor and ceiling so it stays
              // sensible on a small embed and on a full-bleed one.
              width: "clamp(34px, 4.5%, 64px)",
              height: "auto",
              filter: "drop-shadow(0 1px 6px rgba(0, 0, 0, 0.55))",
            }}
          >
            <path
              d="M2 2 L27 14 L2 26 Z"
              fill="none"
              stroke="#fff"
              vectorEffect="non-scaling-stroke"
              strokeWidth="1.5"
            />
          </svg>
        )}
      </div>

      {/* Controls bar — inside the video, above the play overlay, on hover
          only. The generous side padding keeps the seek bar clear of the
          film's edges rather than running the full width. */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5, opacity: hovered ? 1 : 0, transition: "opacity 0.2s", padding: "0 34px 12px" }}>
        <div style={{ color: "#fff", fontSize: "0.75rem", fontFamily: "monospace", textShadow: "0 1px 4px rgba(0,0,0,0.8)", marginBottom: 6 }}>
          {fmt(currentTime)} / {fmt(duration)}
        </div>
        <div
          onClick={seek}
          style={{ height: 3, background: "rgba(255,255,255,0.4)", cursor: "pointer", borderRadius: 2 }}
        >
          <div style={{ height: "100%", width: `${progress}%`, background: "#fff", borderRadius: 2, transition: "width 0.1s linear" }} />
        </div>
      </div>
    </div>
  );
}
