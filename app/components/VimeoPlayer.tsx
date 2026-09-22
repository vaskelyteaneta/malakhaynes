"use client";

import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";

// The film is wider than the 16:9 box, so Vimeo letterboxes it: this much of
// the box's height at the top and at the bottom is empty, covered by
// background-coloured strips. The visible film therefore starts this far down
// and ends this far up — which is where the rounded corners have to go, not at
// the box's own corners (those sit in the blank strip, where rounding is
// invisible against the page).
const LETTERBOX = "8%";

export default function VimeoPlayer({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hovered, setHovered] = useState(false);

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
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The rounding class goes on this inner div, not the outer one above —
          this is the element with the actual clipped box (overflow:hidden +
          the padding-bottom aspect-ratio trick); the outer div has no size or
          background of its own, so rounding it is visually a no-op. */}
      <div className="media-grid-video-wrap" style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
        {/* src is intentionally set in the effect (not here) so it loads exactly
            once per mount and reliably (re)loads across client-side navigations. */}
        <iframe
          ref={iframeRef}
          allow="autoplay; fullscreen; picture-in-picture"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        />
        {/* Overlays to cover letterbox bars, matching the site's current background */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: LETTERBOX, background: "var(--background)", zIndex: 2 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: LETTERBOX, background: "var(--background)", zIndex: 2 }} />

        {/* Corner masks: Vimeo's video is its own GPU-composited layer, which
            some browsers let paint straight through a clip-path/border-radius
            clip on the wrapper (or even on the iframe itself), so the film
            keeps its square corners however the box is clipped. These paint a
            background-coloured quarter-circle over each corner of the film
            instead, which works whatever the video layer does.

            Offset vertically by LETTERBOX so they sit on the corners of the
            visible film, not the corners of the 16:9 box — the box's own
            corners are inside the blank letterbox strip, where rounding is
            invisible against the page.

            The gradient is centered on the OPPOSITE corner of each 30x30 box
            (the top-left mask's circle is centered at its own bottom right):
            that's where a real border-radius arc's center sits, so the sharp
            corner falls in the opaque region and the curve stays clear.
            Hidden via CSS unless Settings > Style > "Rounded media corners"
            is on. */}
        {(["top left", "top right", "bottom left", "bottom right"] as const).map((corner) => {
          const [v, h] = corner.split(" ") as ["top" | "bottom", "left" | "right"];
          const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" } as const;
          const gradientPos = `${opposite[v]} ${opposite[h]}`;
          return (
            <div
              key={corner}
              className="media-grid-video-corner-mask"
              style={{
                position: "absolute",
                [v]: LETTERBOX,
                [h]: 0,
                width: 30,
                height: 30,
                background: `radial-gradient(circle at ${gradientPos}, transparent 30px, var(--background) 30px)`,
                zIndex: 3,
                pointerEvents: "none",
              }}
            />
          );
        })}
      </div>

      {/* Play/pause overlay */}
      <div
        onClick={toggle}
        style={{ position: "absolute", inset: 0, zIndex: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {!playing && (
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 0, height: 0, borderTop: "11px solid transparent", borderBottom: "11px solid transparent", borderLeft: "18px solid #111", marginLeft: 4 }} />
          </div>
        )}
      </div>

      {/* Controls bar — inside video, above white overlay, hover only. Side
          padding (34px) is deliberately wider than the 30px corner-mask
          radius so the seek bar never reaches into the rounded corners —
          otherwise its straight edge cuts across the curve and looks like an
          unrounded frame laid over the video. */}
      <div style={{ position: "absolute", bottom: "9%", left: 0, right: 0, zIndex: 5, opacity: hovered ? 1 : 0, transition: "opacity 0.2s", padding: "0 34px 8px" }}>
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
