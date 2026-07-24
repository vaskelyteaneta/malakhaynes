"use client";

import React, { useEffect, useRef, useState } from "react";
import { Content, isFilled } from "@prismicio/client";
import { SliceComponentProps, PrismicRichText } from "@prismicio/react";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import VimeoPlayer from "@/app/components/VimeoPlayer";

export type MediaGridProps = SliceComponentProps<Content.MediaGridSlice>;

type Item = Content.MediaGridSliceDefaultPrimaryItemsItem;

const SPAN: Record<string, number> = { small: 1, medium: 1, large: 2, "full-screen": 1 };

// Shared with the <section> wrapper so the slider's image track lines up with
// every other (non-slider) slice's content width.
const CONTAINER_MAX_WIDTH = "1200px";
const CONTAINER_PADDING = "2rem";

const CAPTION_FONT_SIZE = "clamp(0.85rem, 0.55rem + 0.9vw, 1.1rem)";
const TEXT_FONT_SIZE = "clamp(0.8rem, 0.6rem + 0.5vw, 0.95rem)";

// Below this width, the slider shows one item per screen (more, shorter
// slides) instead of the configured items-per-row.
const MOBILE_BREAKPOINT = 640;

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
  const configuredPerView = Number(slice.primary.items_per_row || "3");
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
        <SliderLayout items={items} perView={sliderPerView} gap={gap} fullScreen={fullScreen} />
      ) : (
        <GridLayout items={items} columns={configuredPerView} gap={gap} />
      )}

      {Array.isArray(slice.primary.section_title) && isFilled.richText(slice.primary.section_title) && (
        <div style={{ textAlign: "center", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: CAPTION_FONT_SIZE, lineHeight: "1.8", padding: "2rem 1rem", color: "var(--foreground)" }}>
          <PrismicRichText field={slice.primary.section_title} components={{ paragraph: ({ children }) => <p style={{ margin: "0.1em 0" }}>{children}</p> }} />
        </div>
      )}
    </section>
  );
};

export default MediaGrid;

function GridLayout({ items, columns, gap }: { items: Item[]; columns: number; gap: number }) {
  // Consecutive full-screen items share one full-bleed row, split evenly between them,
  // instead of each item breaking out to 100vw on its own (which causes overlap).
  const groups: { fullScreen: boolean; items: Item[] }[] = [];
  for (const item of items) {
    const isFull = item.size === "full-screen";
    const last = groups[groups.length - 1];
    if (last && last.fullScreen === isFull) last.items.push(item);
    else groups.push({ fullScreen: isFull, items: [item] });
  }

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
              <MediaItem key={i} item={item} />
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
              return (
                <MediaItem key={i} item={item} style={{ gridColumn: `span ${span}` }} />
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function SliderLayout({ items, perView, gap, fullScreen }: { items: Item[]; perView: number; gap: number; fullScreen: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const totalSlides = Math.ceil(items.length / perView);
  const canPrev = index > 0;
  const canNext = index < totalSlides - 1;

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
          <ItemMedia item={item} />
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* Arrows break out into the page margin outside the content column, instead of
          insetting the image track — so the track stays the same width as every other slice. */}
      <div
        style={
          fullScreen
            ? { position: "relative" }
            : { position: "relative", width: "100vw", left: "50%", transform: "translateX(-50%)" }
        }
      >
        {canPrev && (
          <button aria-label="Previous" style={{ ...arrowStyle, left: "1rem" }} onClick={() => go("prev")}>‹</button>
        )}
        {fullScreen ? track : (
          <div style={{ maxWidth: CONTAINER_MAX_WIDTH, margin: "0 auto", padding: `0 ${CONTAINER_PADDING}` }}>
            {track}
          </div>
        )}
        {canNext && (
          <button aria-label="Next" style={{ ...arrowStyle, right: "1rem" }} onClick={() => go("next")}>›</button>
        )}
      </div>

      {/* Captions shown below, for currently visible items */}
      {items.slice(index * perView, index * perView + perView).map((item, i) =>
        Array.isArray(item.caption) && isFilled.richText(item.caption) ? (
          <div key={i} style={{ textAlign: "center", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: CAPTION_FONT_SIZE, lineHeight: "1.8", padding: "2rem 1rem", color: "var(--foreground)" }}>
            <PrismicRichText field={item.caption} components={{ paragraph: ({ children }) => <p style={{ margin: "0.1em 0" }}>{children}</p> }} />
          </div>
        ) : null
      )}
    </div>
  );
}

function MediaItem({ item, style }: { item: Item; style?: React.CSSProperties }): React.JSX.Element {
  return (
    <figure style={{ margin: 0, ...style }}>
      <ItemMedia item={item} />
      {Array.isArray(item.caption) && isFilled.richText(item.caption) && (
        <div style={{ textAlign: "center", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: CAPTION_FONT_SIZE, lineHeight: "1.8", padding: "2rem 1rem", color: "var(--foreground)" }}>
          <PrismicRichText field={item.caption} components={{ paragraph: ({ children }) => <p style={{ margin: "0.1em 0" }}>{children}</p> }} />
        </div>
      )}
    </figure>
  );
}

function ItemMedia({ item }: { item: Item }): React.JSX.Element | null {
  const media = renderByType(item);
  if (media && isFilled.link(item.link)) {
    return (
      <PrismicNextLink field={item.link} className="media-grid__link">
        {media}
      </PrismicNextLink>
    );
  }
  return media;
}

function renderByType(item: Item): React.JSX.Element | null {
  switch (item.content_type) {
    case "Video":
      return isFilled.linkToMedia(item.video) ? (
        <CustomVideoPlayer src={item.video.url} />
      ) : null;

    case "Image": {
      const fit = (item.object_fit || "contain") as React.CSSProperties["objectFit"];
      const h = item.image_height || "auto";
      return isFilled.image(item.image) ? (
        <div className="media-grid-image-wrap" style={{ width: "100%", height: h === "auto" ? undefined : h, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <PrismicNextImage
            field={item.image}
            fallbackAlt=""
            className="media-grid-image"
            style={{
              width: "100%",
              height: h === "auto" ? "auto" : h,
              objectFit: h === "auto" ? undefined : fit,
              display: "block",
            }}
          />
        </div>
      ) : null;
    }

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
          style={{
            textAlign: "center",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: TEXT_FONT_SIZE,
            lineHeight: "1.8",
            padding: "2rem 1rem",
          }}
        >
          <PrismicRichText field={item.text} />
        </div>
      ) : null;

    default:
      return null;
  }
}

function CustomVideoPlayer({ src }: { src: string }): React.JSX.Element {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  return (
    <div style={{ position: "relative" }}>
      <video ref={ref} src={src} controls={playing} playsInline onEnded={() => setPlaying(false)} style={{ width: "100%", display: "block" }} />
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
