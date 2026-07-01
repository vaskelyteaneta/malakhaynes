"use client";

import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";

export default function VimeoPlayer({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hovered, setHovered] = useState(false);

  const videoId = html.match(/vimeo\.com\/video\/(\d+)/)?.[1];
  const src = videoId
    ? `https://player.vimeo.com/video/${videoId}?controls=0&title=0&byline=0&portrait=0&transparent=0&dnt=1`
    : null;

  useEffect(() => {
    if (!iframeRef.current || !src) return;
    const player = new Player(iframeRef.current);
    playerRef.current = player;
    player.on("play", () => setPlaying(true));
    player.on("pause", () => setPlaying(false));
    player.on("ended", () => { setPlaying(false); setProgress(0); });
    player.on("timeupdate", ({ percent }) => setProgress(percent * 100));
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
    playerRef.current.getDuration().then(d => playerRef.current?.setCurrentTime(d * pct));
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
      </div>

      {/* Play/pause overlay */}
      <div
        onClick={toggle}
        style={{ position: "absolute", inset: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {!playing && (
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 0, height: 0, borderTop: "11px solid transparent", borderBottom: "11px solid transparent", borderLeft: "18px solid #111", marginLeft: 4 }} />
          </div>
        )}
      </div>

      {/* Progress bar — hover only */}
      <div
        onClick={seek}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.3)", cursor: "pointer", opacity: hovered ? 1 : 0, transition: "opacity 0.2s" }}
      >
        <div style={{ height: "100%", width: `${progress}%`, background: "#fff", transition: "width 0.1s linear" }} />
      </div>
    </div>
  );
}
