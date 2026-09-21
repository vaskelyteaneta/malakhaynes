"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

// Portaled straight to <body> instead of rendered inline: project pages sit
// inside layout.tsx's overflow-x:hidden content wrapper, and a position:fixed
// element inherits that as its containing block on iOS Safari (see the guard
// comment on html/body in globals.css) — a portal sidesteps that entirely,
// same as if it were a literal sibling of <body>.
export default function BackButton() {
  const router = useRouter();
  const [show, setShow] = useState(false);

  // Only shown when the visitor actually arrived from another page on this
  // site — a direct link, bookmark, or external share has nothing to go
  // "back" to within the app.
  useEffect(() => {
    try {
      setShow(new URL(document.referrer).origin === window.location.origin);
    } catch {
      setShow(false);
    }
  }, []);

  if (!show) return null;

  return createPortal(
    <button type="button" onClick={() => router.back()} aria-label="Go back" className="back-button">
      ‹ Back
    </button>,
    document.body
  );
}
