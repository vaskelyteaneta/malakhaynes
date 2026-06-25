"use client";

import React, { useRef, useState } from "react";
import { Content, isFilled } from "@prismicio/client";
import { SliceComponentProps, PrismicRichText } from "@prismicio/react";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";

export type MediaGridProps = SliceComponentProps<Content.MediaGridSlice>;

type Item = Content.MediaGridSliceDefaultPrimaryItemsItem;

const SPAN: Record<string, number> = { small: 1, medium: 1, large: 2, "full-screen": 1 };

const MediaGrid = ({ slice }: MediaGridProps): React.JSX.Element => {
  const mode = slice.primary.display_mode || "Grid";
  const perView = Number(slice.primary.items_per_row || "3");
  const items = slice.primary.items;

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}
    >
      {mode === "Slider" ? (
        <SliderLayout items={items} perView={perView} />
      ) : (
        <GridLayout items={items} columns={perView} />
      )}

      {isFilled.keyText(slice.primary.section_title) && (
        <figcaption
          style={{
            textAlign: "center",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "1.5rem",
            lineHeight: "1.8",
            padding: "2rem 1rem",
            color: "#111",
          }}
        >
          {slice.primary.section_title}
        </figcaption>
      )}
    </section>
  );
};

export default MediaGrid;

function GridLayout({ items, columns }: { items: Item[]; columns: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: "1.5rem",
      }}
    >
      {items.map((item, i) => {
        const span = Math.min(SPAN[item.size || "medium"] ?? 1, columns);
        return (
          <MediaItem key={i} item={item} style={{ gridColumn: `span ${span}` }} />
        );
      })}
    </div>
  );
}

function SliderLayout({ items, perView }: { items: Item[]; perView: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const showArrows = items.length > perView;

  const go = (dir: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const slideWidth = el.offsetWidth / perView;
    el.scrollBy({ left: dir === "next" ? slideWidth : -slideWidth, behavior: "smooth" });
  };

  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    fontSize: "2rem",
    cursor: "pointer",
    color: "#111",
    lineHeight: 1,
    padding: "0.5rem",
    zIndex: 10,
  };

  return (
    <div style={{ position: "relative", padding: "0 3rem" }}>
      {showArrows && (
        <button aria-label="Previous" style={{ ...arrowStyle, left: 0 }} onClick={() => go("prev")}>‹</button>
      )}

      <div
        ref={scrollRef}
        style={{
          display: "flex",
          overflowX: "hidden",
          scrollSnapType: "x mandatory",
          gap: "1.5rem",
        }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              flex: `0 0 calc(${100 / perView}% - ${((perView - 1) * 1.5) / perView}rem)`,
              scrollSnapAlign: "start",
            }}
          >
            <MediaItem item={item} />
          </div>
        ))}
      </div>

      {showArrows && (
        <button aria-label="Next" style={{ ...arrowStyle, right: 0 }} onClick={() => go("next")}>›</button>
      )}
    </div>
  );
}

function MediaItem({ item, style }: { item: Item; style?: React.CSSProperties }): React.JSX.Element {
  const fullScreen = item.size === "full-screen";
  return (
    <figure
      style={{
        margin: 0,
        ...(fullScreen
          ? { width: "100vw", position: "relative", left: "50%", transform: "translateX(-50%)" }
          : style),
      }}
    >
      <ItemMedia item={item} />
      {isFilled.keyText(item.caption) && (
        <figcaption
          style={{
            textAlign: "center",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "1.5rem",
            lineHeight: "1.8",
            padding: "2rem 1rem",
            background: "#fff",
            color: "#111",
            whiteSpace: "pre-line",
          }}
        >
          {item.caption}
        </figcaption>
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
      const fit = item.object_fit || "contain";
      const h = item.image_height || "auto";
      const hasFixedHeight = h !== "auto";
      return isFilled.image(item.image) ? (
        <div style={{ width: "100%", height: hasFixedHeight ? h : undefined, overflow: "hidden" }}>
          <PrismicNextImage
            field={item.image}
            fallbackAlt=""
            style={{
              width: "100%",
              height: hasFixedHeight ? h : "auto",
              objectFit: hasFixedHeight ? (fit as React.CSSProperties["objectFit"]) : undefined,
              display: "block",
            }}
          />
        </div>
      ) : null;
    }

    case "Embed":
      return isFilled.embed(item.embed) && item.embed.html ? (
        <div dangerouslySetInnerHTML={{ __html: item.embed.html }} />
      ) : null;

    case "Text":
      return isFilled.richText(item.text) ? (
        <div
          style={{
            textAlign: "center",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "1.1rem",
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
