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

  // Only shown when there's an actual previous entry in this tab's history to
  // go back to — hidden on a direct link or a fresh tab. history.length grows
  // with every client-side navigation (Next's <Link> uses pushState), so this
  // works for in-app clicks too; document.referrer would not, since it only
  // reflects real browser navigations, never a client-side route change.
  useEffect(() => {
    setShow(window.history.length > 1);
  }, []);

  if (!show) return null;

  return createPortal(
    <button type="button" onClick={() => router.back()} aria-label="Go back" className="back-button">
      ‹ Back
    </button>,
    document.body
  );
}
