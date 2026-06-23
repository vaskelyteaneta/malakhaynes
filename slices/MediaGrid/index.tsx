"use client";

import React, { useEffect, useRef, useState } from "react";
import { Content, isFilled } from "@prismicio/client";
import { SliceComponentProps, PrismicRichText } from "@prismicio/react";
import { PrismicNextImage, PrismicNextLink } from "@prismicio/next";
import Splide from "@splidejs/splide";
import "@splidejs/splide/css";

export type MediaGridProps = SliceComponentProps<Content.MediaGridSlice>;

type Item = Content.MediaGridSliceDefaultPrimaryItemsItem;

const SPAN: Record<string, number> = { small: 1, medium: 1, large: 2 };

const MediaGrid = ({ slice }: MediaGridProps): React.JSX.Element => {
  const mode = slice.primary.display_mode || "Grid";
  const perView = Number(slice.primary.items_per_row || "3");
  const items = slice.primary.items;

  return (
    <section
      data-slice-type={slice.slice_type}
      data-slice-variation={slice.variation}
      className="media-grid"
    >
      {isFilled.keyText(slice.primary.section_title) && (
        <h2 className="media-grid__title">{slice.primary.section_title}</h2>
      )}

      {mode === "Slider" ? (
        <SliderLayout
          items={items}
          perView={perView}
          label={slice.primary.section_title || "Media slider"}
        />
      ) : (
        <GridLayout items={items} columns={perView} />
      )}
    </section>
  );
};

export default MediaGrid;

function GridLayout({ items, columns }: { items: Item[]; columns: number }) {
  return (
    <div
      className="media-grid__grid"
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

function SliderLayout({
  items,
  perView,
  label,
}: {
  items: Item[];
  perView: number;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const splide = new Splide(ref.current, {
      perPage: perView,
      perMove: 1,
      gap: "1.5rem",
      pagination: false,
      arrows: true,
      rewind: true,
    });
    splide.mount();
    return () => { splide.destroy(); };
  }, [perView, items.length]);

  return (
    <div className="splide media-grid__slider" ref={ref} aria-label={label}>
      <div className="splide__track">
        <ul className="splide__list">
          {items.map((item, i) => (
            <li className="splide__slide" key={i}>
              <MediaItem item={item} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MediaItem({
  item,
  style,
}: {
  item: Item;
  style?: React.CSSProperties;
}): React.JSX.Element {
  return (
    <figure className="media-grid__item" style={{ margin: 0, ...style }}>
      <ItemMedia item={item} />
      {isFilled.keyText(item.caption) && (
        <figcaption className="media-grid__caption">{item.caption}</figcaption>
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

    case "Image":
      return isFilled.image(item.image) ? (
        <PrismicNextImage field={item.image} className="media-grid__image" />
      ) : null;

    case "Embed":
      return isFilled.embed(item.embed) && item.embed.html ? (
        <div
          className="media-grid__embed"
          dangerouslySetInnerHTML={{ __html: item.embed.html }}
        />
      ) : null;

    case "Text":
      return isFilled.richText(item.text) ? (
        <div className="media-grid__text">
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
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="media-grid__video" style={{ position: "relative" }}>
      <video
        ref={ref}
        src={src}
        controls={playing}
        playsInline
        onEnded={() => setPlaying(false)}
        style={{ width: "100%", display: "block" }}
      />
      {!playing && (
        <button
          type="button"
          aria-label="Play video"
          onClick={toggle}
          className="media-grid__play"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.15)",
            border: 0,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 0,
              height: 0,
              borderTop: "16px solid transparent",
              borderBottom: "16px solid transparent",
              borderLeft: "26px solid #fff",
              marginLeft: 6,
            }}
          />
        </button>
      )}
    </div>
  );
}
