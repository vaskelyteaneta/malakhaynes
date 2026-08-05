"use client";

import { useEffect, useRef, useState } from "react";

export default function StickyHeader({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  // Stay visible for a fraction of the first slice's height, instead of its
  // full height — enough to clear the initial hero framing without lingering
  // over the slice's own content once you're actually scrolling through it.
  const visibleThreshold = useRef(0);

  useEffect(() => {
    const firstSlice = document.querySelector<HTMLElement>("[data-slice-type]");
    if (!firstSlice) return;

    const measure = () => {
      visibleThreshold.current = firstSlice.offsetHeight * 0.25;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(firstSlice);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      setVisible(currentY < visibleThreshold.current || currentY < lastY.current);
      lastY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "transparent",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.3s ease",
      }}
    >
      {children}
    </div>
  );
}
