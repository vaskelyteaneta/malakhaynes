"use client";

import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";

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
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "8%", background: "var(--background)", zIndex: 2 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "8%", background: "var(--background)", zIndex: 2 }} />
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

      {/* Controls bar — inside video, above white overlay, hover only */}
      <div style={{ position: "absolute", bottom: "9%", left: 0, right: 0, zIndex: 5, opacity: hovered ? 1 : 0, transition: "opacity 0.2s", padding: "0 12px 8px" }}>
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
