"use client";

import React, { useEffect, useRef, useState } from "react";
import { Content, isFilled, type RichTextField, type ImageField } from "@prismicio/client";
import { SliceComponentProps, PrismicRichText } from "@prismicio/react";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import VimeoPlayer from "@/app/components/VimeoPlayer";
// Type-only import: erased at build time, so hls.js is never pulled into the
// server bundle or loaded during SSR. The runtime library is imported lazily
// inside CustomVideoPlayer, on the client, only when an HLS source is played.
import type Hls from "hls.js";

export type MediaGridProps = SliceComponentProps<Content.MediaGridSlice>;

type Item = Content.MediaGridSliceDefaultPrimaryItemsItem;

const SPAN: Record<string, number> = { small: 1, medium: 1, large: 2, "full-screen": 1 };

// Shared with the <section> wrapper so the slider's image track lines up with
// every other (non-slider) slice's content width.
const CONTAINER_MAX_WIDTH = "1200px";
const CONTAINER_PADDING = "2rem";

// Used to convert the CMS's image_height (a design-time pixel value, chosen
// while looking at the item at roughly its default rendered width) into an
// aspect-ratio instead of a literal height. A literal height stays fixed as
// the viewport narrows, so the box gets relatively taller — eventually
// square, then portrait. An aspect-ratio scales with the box's actual
// rendered width instead, keeping the same shape at any size.
const REM_PX = 16;
const MAX_WIDTH_PX = parseFloat(CONTAINER_MAX_WIDTH);
const CONTAINER_PADDING_PX = parseFloat(CONTAINER_PADDING) * REM_PX;

const CAPTION_FONT_SIZE = "clamp(0.85rem, 0.55rem + 0.9vw, 1.1rem)";
const TEXT_FONT_SIZE = "clamp(0.8rem, 0.6rem + 0.5vw, 0.95rem)";

// Below this width, the slider shows one item per screen (more, shorter
// slides) instead of the configured items-per-row.
const MOBILE_BREAKPOINT = 768;

function useIsMobile(breakpoint = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

const MediaGrid = ({ slice }: MediaGridProps): React.JSX.Element => {
  const mode = slice.primary.display_mode || "Grid";
  const configuredPerView = Number(slice.primary.items_per_row || "1");
  const isMobile = useIsMobile();
  const sliderPerView = isMobile ? 1 : configuredPerView;
  const items = slice.primary.items;
  const fullScreen = slice.primary.gaps === "full-screen";
  const gap = fullScreen ? 0 : 1.5;

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      style={fullScreen ? { maxWidth: "100%", margin: 0, padding: 0 } : { maxWidth: CONTAINER_MAX_WIDTH, margin: "0 auto", padding: CONTAINER_PADDING }}
    >
      {mode === "Slider" ? (
        <SliderLayout items={items} perView={sliderPerView} gap={gap} fullScreen={fullScreen} sharedCaption={slice.primary.shared_caption} />
      ) : (
        <GridLayout items={items} columns={configuredPerView} gap={gap} sharedCaption={slice.primary.shared_caption} />
      )}

      {Array.isArray(slice.primary.section_title) && isFilled.richText(slice.primary.section_title) && (
        <div className="media-grid-caption" style={{ textAlign: "center", fontSize: CAPTION_FONT_SIZE, lineHeight: "1.8", padding: "0.75rem 1rem", color: "var(--foreground)" }}>
          <PrismicRichText field={slice.primary.section_title} components={{ paragraph: ({ children }) => <p style={{ margin: "0.1em 0" }}>{children}</p> }} />
        </div>
      )}
    </section>
  );
};

export default MediaGrid;

function GridLayout({ items, columns, gap, sharedCaption }: { items: Item[]; columns: number; gap: number; sharedCaption: RichTextField }) {
  // Consecutive full-screen items share one full-bleed row, split evenly between them,
  // instead of each item breaking out to 100vw on its own (which causes overlap).
  const groups: { fullScreen: boolean; items: Item[] }[] = [];
  for (const item of items) {
    const isFull = item.size === "full-screen";
    const last = groups[groups.length - 1];
    if (last && last.fullScreen === isFull) last.items.push(item);
    else groups.push({ fullScreen: isFull, items: [item] });
  }

  const availableWidthPx = MAX_WIDTH_PX - 2 * CONTAINER_PADDING_PX;
  const columnWidthPx = (availableWidthPx - (columns - 1) * gap * REM_PX) / columns;

  const hasSharedCaption = Array.isArray(sharedCaption) && isFilled.richText(sharedCaption);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${gap}rem` }}>
      {groups.map((group, gi) =>
        group.fullScreen ? (
          <div
            key={gi}
            className="media-grid-fullrow"
            style={{
              width: "100vw",
              position: "relative",
              left: "50%",
              transform: "translateX(-50%)",
              display: "grid",
              gridTemplateColumns: `repeat(${group.items.length}, minmax(0, 1fr))`,
              gap: 0,
            }}
          >
            {group.items.map((item, i) => (
              <MediaItem key={i} item={item} referenceWidthPx={MAX_WIDTH_PX / group.items.length} />
            ))}
          </div>
        ) : (
          <div
            key={gi}
            className="media-grid-row"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: `${gap}rem`,
            }}
          >
            {group.items.map((item, i) => {
              const span = Math.min(SPAN[item.size || "medium"] ?? 1, columns);
              const referenceWidthPx = columnWidthPx * span + (span - 1) * gap * REM_PX;
              return (
                <MediaItem key={i} item={item} style={{ gridColumn: `span ${span}` }} referenceWidthPx={referenceWidthPx} />
              );
            })}
          </div>
        )
      )}

      {/* Shared caption: one caption for the whole grid, not one per item.
          Rendered once after the rows and centered — on desktop it reads as
          sitting under the middle image; on mobile the rows collapse to a
          single stacked column, so it naturally lands under the last image.
          Items with their own caption still show that caption individually
          (see MediaItem); this shared one is always present when filled. */}
      {hasSharedCaption && (
        <div className="media-grid-caption" style={{ textAlign: "center", fontSize: CAPTION_FONT_SIZE, lineHeight: "1.8", padding: "0.75rem 1rem", color: "var(--foreground)" }}>
          <PrismicRichText field={sharedCaption} components={{ paragraph: ({ children }) => <p style={{ margin: "0.1em 0" }}>{children}</p> }} />
        </div>
      )}
    </div>
  );
}

function SliderLayout({ items, perView, gap, fullScreen, sharedCaption }: { items: Item[]; perView: number; gap: number; fullScreen: boolean; sharedCaption: RichTextField }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // The track lays out every slide in one continuous flex row (so the scroll-snap
  // drag works), which means the row's natural height is driven by the *tallest*
  // slide, not the one currently in view — leaving the visible slide vertically
  // off-center against that shared height. Measure just the visible slide instead
  // and clip the row to it.
  const [activeHeight, setActiveHeight] = useState<number | undefined>(undefined);
  const totalSlides = Math.ceil(items.length / perView);
  const canPrev = index > 0;
  const canNext = index < totalSlides - 1;

  const availableWidthPx = fullScreen ? MAX_WIDTH_PX : MAX_WIDTH_PX - 2 * CONTAINER_PADDING_PX;
  const referenceWidthPx = (availableWidthPx - (perView - 1) * gap * REM_PX) / perView;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const visible = Array.from(el.children).slice(index * perView, index * perView + perView) as HTMLElement[];
    const measure = () => {
      const tallest = Math.max(0, ...visible.map((c) => c.offsetHeight));
      if (tallest > 0) setActiveHeight(tallest);
    };

    measure();
    const observer = new ResizeObserver(measure);
    visible.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [index, perView, items]);

  const go = (dir: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const newIndex = dir === "next"
      ? Math.min(index + 1, totalSlides - 1)
      : Math.max(index - 1, 0);
    el.scrollTo({ left: newIndex * el.offsetWidth, behavior: "smooth" });
    setIndex(newIndex);
  };

  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    fontSize: "2rem",
    cursor: "pointer",
    color: "var(--foreground)",
    lineHeight: 1,
    padding: "0.5rem",
    zIndex: 10,
  };

  const track = (
    <div
      ref={scrollRef}
      style={{ display: "flex", gap: `${gap}rem`, overflowX: "hidden", scrollSnapType: "x mandatory" }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            flex: `0 0 calc(${100 / perView}% - ${((perView - 1) * gap) / perView}rem)`,
            scrollSnapAlign: "start",
          }}
        >
          <ItemMedia item={item} referenceWidthPx={referenceWidthPx} />
        </div>
      ))}
    </div>
  );

  const arrows = (
    <>
      {canPrev && (
        <button aria-label="Previous" style={{ ...arrowStyle, left: 0 }} onClick={() => go("prev")}>‹</button>
      )}
      {canNext && (
        <button aria-label="Next" style={{ ...arrowStyle, right: 0 }} onClick={() => go("next")}>›</button>
      )}
    </>
  );

  return (
    <div>
      {/* Arrows sit just inside the actual image track's edge — nested in the same
          width-constrained wrapper as the track — so their distance from the image
          stays consistent whether the track is full-bleed or contained. */}
      <div
        style={
          fullScreen
            ? { position: "relative" }
            : { position: "relative", width: "100vw", left: "50%", transform: "translateX(-50%)" }
        }
      >
        {fullScreen ? (
          <div style={{ position: "relative", height: activeHeight, overflow: "hidden" }}>
            {track}
            {arrows}
          </div>
        ) : (
          <div style={{ maxWidth: CONTAINER_MAX_WIDTH, margin: "0 auto", padding: `0 ${CONTAINER_PADDING}`, position: "relative", height: activeHeight, overflow: "hidden" }}>
            {track}
            {arrows}
          </div>
        )}
      </div>

      {/* Captions shown below, for currently visible items. Items with their own
          caption each get their own block; the shared caption renders once
          (not once per item) when one or more visible items fall back to it. */}
      {(() => {
        const visibleItems = items.slice(index * perView, index * perView + perView);
        const ownCaptionItems = visibleItems.filter((item) => Array.isArray(item.caption) && isFilled.richText(item.caption));
        const anyFallsBackToShared = visibleItems.length > ownCaptionItems.length;

        return (
          <>
            {ownCaptionItems.map((item, i) => (
              <div key={i} className="media-grid-caption" style={{ textAlign: "center", fontSize: CAPTION_FONT_SIZE, lineHeight: "1.8", padding: "0.75rem 1rem", color: "var(--foreground)" }}>
                <PrismicRichText field={item.caption} components={{ paragraph: ({ children }) => <p style={{ margin: "0.1em 0" }}>{children}</p> }} />
              </div>
            ))}
            {anyFallsBackToShared && Array.isArray(sharedCaption) && isFilled.richText(sharedCaption) && (
              <div className="media-grid-caption" style={{ textAlign: "center", fontSize: CAPTION_FONT_SIZE, lineHeight: "1.8", padding: "0.75rem 1rem", color: "var(--foreground)" }}>
                <PrismicRichText field={sharedCaption} components={{ paragraph: ({ children }) => <p style={{ margin: "0.1em 0" }}>{children}</p> }} />
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

function MediaItem({ item, style, referenceWidthPx }: { item: Item; style?: React.CSSProperties; referenceWidthPx: number }): React.JSX.Element {
  const caption = item.caption;
  return (
    <figure style={{ margin: 0, ...style }}>
      <ItemMedia item={item} referenceWidthPx={referenceWidthPx} />
      {Array.isArray(caption) && isFilled.richText(caption) && (
        <div className="media-grid-caption" style={{ textAlign: "center", fontSize: CAPTION_FONT_SIZE, lineHeight: "1.8", padding: "0.75rem 1rem", color: "var(--foreground)" }}>
          <PrismicRichText field={caption} components={{ paragraph: ({ children }) => <p style={{ margin: "0.1em 0" }}>{children}</p> }} />
        </div>
      )}
    </figure>
  );
}

function ItemMedia({ item, referenceWidthPx }: { item: Item; referenceWidthPx: number }): React.JSX.Element | null {
  const media = renderByType(item, referenceWidthPx);
  if (!media || !isFilled.link(item.link)) return media;

  // Internal (document) links stay in the same tab so navigation stays inside
  // the site; only external web links open in a new tab.
  const external = item.link.link_type === "Web";
  return (
    <PrismicNextLink
      field={item.link}
      className="media-grid__link"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {media}
    </PrismicNextLink>
  );
}

function renderByType(item: Item, referenceWidthPx: number): React.JSX.Element | null {
  // Poster mode (Video or Embed): when a still is provided, show it instead of
  // playing inline. ItemMedia wraps it in the item's Link, so clicking the
  // still navigates to the page (e.g. the movie page) where the video lives.
  if (isFilled.image(item.poster) && (item.content_type === "Video" || item.content_type === "Embed")) {
    return <VideoPoster item={item} referenceWidthPx={referenceWidthPx} />;
  }

  switch (item.content_type) {
    case "Video": {
      // No poster → play inline. A pasted external URL (.m3u8 HLS or .mp4)
      // takes precedence over an uploaded .mp4 media file.
      const src = isFilled.keyText(item.video_url)
        ? item.video_url.trim()
        : isFilled.linkToMedia(item.video)
          ? item.video.url
          : null;
      return src ? <CustomVideoPlayer src={src} /> : null;
    }

    case "Image":
      return renderSizedImage(item.image, item, referenceWidthPx);

    case "Embed": {
      if (!isFilled.embed(item.embed) || !item.embed.html) return null;
      if (item.embed.html.includes("vimeo.com/video/")) {
        return <VimeoPlayer html={item.embed.html} />;
      }
      return <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }} dangerouslySetInnerHTML={{ __html: item.embed.html.replace("<iframe", '<iframe style="width:100%;height:100%;position:absolute;top:0;left:0"') }} />
      </div>;
    }

    case "Text":
      return isFilled.richText(item.text) ? (
        <div
          className="media-grid-caption"
          style={{
            textAlign: "center",
            fontSize: TEXT_FONT_SIZE,
            lineHeight: "1.8",
            padding: "0.75rem 1rem",
          }}
        >
          <PrismicRichText field={item.text} />
        </div>
      ) : null;

    default:
      return null;
  }
}

// Renders an image sized by the item's image_height / object_fit controls.
// Shared by the Image content type and the Video poster still so both honour
// the same sizing. A literal pixel height is treated as a design-time value at
// roughly referenceWidthPx wide and converted to an aspect-ratio, so the box
// scales proportionally with its actual rendered width instead of staying a
// fixed height (which is what turns a landscape image square, then portrait,
// as the viewport narrows).
function renderSizedImage(image: ImageField, item: Item, referenceWidthPx: number): React.JSX.Element | null {
  if (!isFilled.image(image)) return null;
  const fit = (item.object_fit || "contain") as React.CSSProperties["objectFit"];
  const h = item.image_height || "auto";
  const heightPx = h === "auto" ? null : parseFloat(h);
  // Always reserve the image's space up-front so the layout never collapses to a
  // blank gap while the image is still loading — on a slow connection an
  // unreserved (aspectRatio:undefined) box has zero height and the page looks
  // like it "didn't load". For a fixed height we derive the ratio from the
  // reference width; for "auto" we use the image's own intrinsic dimensions.
  const dims = image.dimensions;
  const aspectRatio = heightPx
    ? `${referenceWidthPx} / ${heightPx}`
    : dims?.width && dims?.height
      ? `${dims.width} / ${dims.height}`
      : undefined;
  return (
    <div className="media-grid-image-wrap" style={{ width: "100%", aspectRatio, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <PrismicNextImage
        field={image}
        fallbackAlt=""
        className="media-grid-image"
        style={{ width: "100%", height: heightPx ? "100%" : "auto", objectFit: heightPx ? fit : undefined, display: "block" }}
      />
    </div>
  );
}

// A video's still image with a centred play badge, signalling it's a video.
// The badge is pointer-events:none so clicks fall through to ItemMedia's Link.
function VideoPoster({ item, referenceWidthPx }: { item: Item; referenceWidthPx: number }): React.JSX.Element | null {
  const poster = renderSizedImage(item.poster, item, referenceWidthPx);
  if (!poster) return null;
  return (
    <div style={{ position: "relative" }}>
      {poster}
      <span aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "4rem", height: "4rem", borderRadius: "50%", background: "rgba(0,0,0,0.45)" }}>
          <span style={{ width: 0, height: 0, borderTop: "12px solid transparent", borderBottom: "12px solid transparent", borderLeft: "20px solid #fff", marginLeft: 5 }} />
        </span>
      </span>
    </div>
  );
}

const isHlsSource = (src: string): boolean => /\.m3u8(\?|#|$)/i.test(src);

function CustomVideoPlayer({ src }: { src: string }): React.JSX.Element {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // Wire the source up here rather than via the <video src> attribute so HLS
  // (.m3u8) streams can be routed through hls.js on browsers that lack native
  // HLS. Plain .mp4 (and Safari, which plays HLS natively) just get the src set
  // directly.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    if (!isHlsSource(src) || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    let hls: Hls | null = null;
    let cancelled = false;
    import("hls.js").then(({ default: HlsLib }) => {
      if (cancelled || !ref.current) return;
      if (HlsLib.isSupported()) {
        hls = new HlsLib();
        hls.loadSource(src);
        hls.attachMedia(ref.current);
      } else {
        // No native HLS and hls.js unsupported — let the browser try anyway.
        ref.current.src = src;
      }
    });

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [src]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  return (
    <div style={{ position: "relative" }}>
      <video ref={ref} controls={playing} playsInline onEnded={() => setPlaying(false)} style={{ width: "100%", display: "block" }} />
      {!playing && (
        <button
          type="button"
          aria-label="Play video"
          onClick={toggle}
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.15)", border: 0, cursor: "pointer" }}
        >
          <span style={{ width: 0, height: 0, borderTop: "16px solid transparent", borderBottom: "16px solid transparent", borderLeft: "26px solid #fff", marginLeft: 6 }} />
        </button>
      )}
    </div>
  );
}
