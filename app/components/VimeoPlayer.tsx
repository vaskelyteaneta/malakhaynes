"use client";

import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";

export default function VimeoPlayer({ html }: { html: string }) {
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
    if (!iframeRef.current || !src) return;
    const player = new Player(iframeRef.current);
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
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
        <iframe
          ref={iframeRef}
          src={src}
          allow="autoplay; fullscreen; picture-in-picture"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
        />
        {/* White overlays to cover letterbox bars */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "8%", background: "#fff", zIndex: 2 }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "8%", background: "#fff", zIndex: 2 }} />
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
