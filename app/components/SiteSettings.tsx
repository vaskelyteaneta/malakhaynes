"use client";

import { createContext, useContext } from "react";

// A few Settings values are needed deep inside client components — the video
// player sits several layers below the layout, and threading props through
// every slice to reach it would be worse than this. Read in the layout (a
// server component) and handed down once.
type SiteSettings = {
  /** Settings > Play button. Null means the built-in outlined triangle. */
  playIconUrl: string | null;
};

const SiteSettingsContext = createContext<SiteSettings>({ playIconUrl: null });

export function SiteSettingsProvider({
  playIconUrl,
  children,
}: {
  playIconUrl: string | null;
  children: React.ReactNode;
}) {
  return (
    <SiteSettingsContext.Provider value={{ playIconUrl }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext);
}
