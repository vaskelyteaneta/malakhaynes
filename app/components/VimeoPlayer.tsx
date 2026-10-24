"use client";

import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";
import { snapAspectRatio } from "@/app/lib/aspect-ratio";
import { claimAudio, releaseAudio } from "@/app/lib/audio-owner";
import { useSiteSettings } from "@/app/components/SiteSettings";

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
  autoplay = false,
  poster = null,
}: {
  html: string;
  width?: number | null;
  height?: number | null;
  autoplay?: boolean;
  poster?: string | null;
}) {
  const { playIconUrl } = useSiteSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hovered, setHovered] = useState(false);
  // Autoplay is only permitted muted — every browser blocks a video that
  // starts with sound. So an autoplaying video begins silent and the viewer
  // turns the sound on themselves.
  const [muted, setMuted] = useState(autoplay);

  const videoId = html.match(/vimeo\.com\/video\/(\d+)/)?.[1];

  // Prismic stores the embed's size as the oEmbed thumbnail, whole pixels at
  // about 426 wide, so a 1920x976 film is saved as 426x216 — the true height
  // of 216.52 rounded down. Shaping the box from that makes it a hair the
  // wrong shape and Vimeo pads the gap with black.
  //
  // Start from the stored value so the box has its space reserved on first
  // paint, then ask Vimeo for the exact dimensions and correct it. Films that
  // are a standard shape are snapped up front and the fetch confirms them
  // without moving anything; only genuinely odd ratios shift, by a fraction
  // of a percent.
  const storedRatio = width && height && width > 0 ? snapAspectRatio(width, height) : DEFAULT_RATIO;
  const [ratio, setRatio] = useState(storedRatio);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}&width=1920`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.width || !data?.height) return;
        const exact = data.height / data.width;
        // Any real difference is worth taking: the whole point is that the
        // stored value is rounded. The guard is only against float noise.
        if (Math.abs(exact - storedRatio) / storedRatio > 0.0001) setRatio(exact);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [videoId, storedRatio]);
  const src = videoId
    ? `https://player.vimeo.com/video/${videoId}?controls=0&title=0&byline=0&portrait=0&transparent=0&dnt=1` +
      (autoplay ? "&autoplay=1&muted=1&loop=1" : "")
    : null;

  // How this player gives up the audio when another one takes it. An
  // autoplaying video drops back to silent and keeps running; a click-to-play
  // video pauses, since a silent film playing on is not what anyone wants.
  // Held in a ref so its identity is stable — the coordinator compares by
  // reference to know who the current owner is.
  const yieldAudioRef = useRef<() => void>(() => {});
  yieldAudioRef.current = () => {
    if (autoplay) {
      setMuted(true);
      playerRef.current?.setMuted(true);
    } else {
      playerRef.current?.pause();
    }
  };
  const yieldAudio = useRef(() => yieldAudioRef.current()).current;

  useEffect(() => () => releaseAudio(yieldAudio), [yieldAudio]);

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
    player.on("play", () => {
      setPlaying(true);
      // An autoplaying video starts muted, so it is not taking the audio by
      // starting — it only claims it when the viewer presses unmute.
      if (!autoplay) claimAudio(yieldAudio);
    });
    player.on("pause", () => { setPlaying(false); if (!autoplay) releaseAudio(yieldAudio); });
    player.on("ended", () => { setPlaying(false); setProgress(0); setCurrentTime(0); if (!autoplay) releaseAudio(yieldAudio); });
    player.on("timeupdate", ({ seconds, percent }) => {
      setProgress(percent * 100);
      setCurrentTime(seconds);
    });
    return () => { player.destroy(); };
  }, [src, autoplay, yieldAudio]);

  // Pause automatically once the player scrolls out of view, so audio doesn't
  // keep playing while scrolling away from it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // An autoplaying video is meant to be running whenever it is on
          // screen, so pick it back up after it was paused on the way past.
          if (autoplay) playerRef.current?.play().catch(() => {});
        } else {
          playerRef.current?.pause();
        }
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoplay]);

  const toggleMuted = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !muted;
    setMuted(next);
    playerRef.current?.setMuted(next);
    // Unmuting is this player claiming the page's sound; muting hands it back.
    if (next) releaseAudio(yieldAudio);
    else claimAudio(yieldAudio);
  };

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
        {/* The video's own first frame, shown until playback actually starts.
            A Vimeo player takes a second or two to load — longer on a phone
            over mobile data, and longer again with several on one page — and
            without this the visitor scrolls onto a black rectangle where the
            artwork should be. Fades out once the video is running, and stays
            put for click-to-play videos so they never show black either. */}
        {poster && !playing && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
              pointerEvents: "none",
            }}
          />
        )}

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
        {/* Shown whenever the video is not actually playing — not merely
            whenever autoplay is off. An autoplaying video hides it because it
            is already running, but autoplay can be refused (iOS Low Power
            Mode blocks it even muted), and keying off the setting rather than
            the real state left those viewers looking at a frozen frame with
            no visible way to start it. */}
        {!playing && (
          // White on both sites rather than var(--foreground): it sits on the
          // film, not on the page, so it has to read against the image.
          // Traced from the play icon on Malak's previous site
          // (playiconwddAsset-6.png, rendered there at 29x28): a hairline
          // triangle filling its box, flat left edge, sharp corners, no disc
          // behind it. Reproduced as an SVG rather than shipping the PNG so it
          // stays crisp at any size.
          playIconUrl ? (
            // Settings > Play button. Sized and positioned exactly like the
            // built-in triangle so swapping the image changes nothing else.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={playIconUrl}
              alt=""
              className="media-grid__play"
              style={{
                width: "clamp(34px, 4.5%, 64px)",
                height: "auto",
                filter: "drop-shadow(0 1px 6px rgba(0, 0, 0, 0.55))",
              }}
            />
          ) : (
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
          )
        )}
      </div>

      {/* Mute control, shown only on autoplaying videos. An autoplaying video
          has no play button, so without this there would be no way into the
          sound at all. Words rather than a speaker icon, in the site's own
          font at the same 1rem as the nav and footer. The label names the
          action, so it reads "unmute" while silent. */}
      {autoplay && (
        <button
          onClick={toggleMuted}
          className="media-grid__mute"
          style={{
            position: "absolute",
            // Top-left, clear of the timecode and seek bar along the bottom.
            top: "12px",
            left: "16px",
            zIndex: 6,
            background: "none",
            border: "none",
            padding: "0.25rem 0.5rem",
            cursor: "pointer",
            font: "inherit",
            fontSize: "1rem",
            lineHeight: 1,
            color: "#fff",
            // Strong shadow: these sit over paintings that are often nearly
            // white, where plain white text all but disappears.
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.9), 0 1px 12px rgba(0, 0, 0, 0.7)",
          }}
        >
          {muted ? "unmute" : "mute"}
        </button>
      )}

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
