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

      {Array.isArray(slice.primary.section_title) && isFilled.richText(slice.primary.section_title) && (
        <div style={{ textAlign: "center", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "1.5rem", lineHeight: "1.8", padding: "2rem 1rem", color: "#111" }}>
          <PrismicRichText field={slice.primary.section_title} components={{ paragraph: ({ children }) => <p style={{ margin: "0.1em 0" }}>{children}</p> }} />
        </div>
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
    color: "#111",
    lineHeight: 1,
    padding: "0.5rem",
    zIndex: 10,
  };

  return (
    <div style={{ padding: "0 3rem" }}>
      {/* Image-only scroll area — arrows are centered on this */}
      <div style={{ position: "relative" }}>
        {canPrev && (
          <button aria-label="Previous" style={{ ...arrowStyle, left: "-3rem" }} onClick={() => go("prev")}>‹</button>
        )}
        <div
          ref={scrollRef}
          style={{ display: "flex", overflowX: "hidden", scrollSnapType: "x mandatory" }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                flex: `0 0 calc(${100 / perView}% - ${((perView - 1) * 1.5) / perView}rem)`,
                scrollSnapAlign: "start",
              }}
            >
              <ItemMedia item={item} />
            </div>
          ))}
        </div>
        {canNext && (
          <button aria-label="Next" style={{ ...arrowStyle, right: "-3rem" }} onClick={() => go("next")}>›</button>
        )}
      </div>

      {/* Captions shown below, for currently visible items */}
      {items.slice(index * perView, index * perView + perView).map((item, i) =>
        Array.isArray(item.caption) && isFilled.richText(item.caption) ? (
          <div key={i} style={{ textAlign: "center", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "1.5rem", lineHeight: "1.8", padding: "2rem 1rem", color: "#111" }}>
            <PrismicRichText field={item.caption} components={{ paragraph: ({ children }) => <p style={{ margin: "0.1em 0" }}>{children}</p> }} />
          </div>
        ) : null
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
      {Array.isArray(item.caption) && isFilled.richText(item.caption) && (
        <div style={{ textAlign: "center", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "1.5rem", lineHeight: "1.8", padding: "2rem 1rem", color: "#111" }}>
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
        <div style={{ width: "100%", height: h === "auto" ? undefined : h, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <PrismicNextImage
            field={item.image}
            fallbackAlt=""
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
      let html = item.embed.html;
      if (html.includes("vimeo.com/video/")) {
        html = html.replace(/src="([^"]*vimeo\.com\/video\/[^"]*)"/, (_match, src) => {
          try {
            const url = new URL(src);
            url.searchParams.set("title", "0");
            url.searchParams.set("byline", "0");
            url.searchParams.set("portrait", "0");
            return `src="${url.toString()}"`;
          } catch { return _match; }
        });
      }
      return <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }} dangerouslySetInnerHTML={{ __html: html.replace("<iframe", '<iframe style="width:100%;height:100%;position:absolute;top:0;left:0"') }} />
      </div>;
    }

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
