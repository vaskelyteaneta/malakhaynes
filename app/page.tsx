import { redirect } from "next/navigation";
import { isFilled } from "@prismicio/client";
import { createClient } from "@/prismicio";

// Which page the site root shows is a content decision, so it lives in
// Prismic: Settings > Main > "Home page". It is a content relationship — a
// pointer to the document itself, not its URL — so renaming that page cannot
// break this. The previous version hardcoded the path here, and it silently
// broke once when the page was renamed; the old URL only kept working because
// a stale prerender was still cached.
//
// Used until Settings > Home page is filled in. It must stay a real page's
// uid, but unlike the old hardcoded path it is a fallback rather than the
// only source of truth.
const FALLBACK_HOME = "/films";

export default async function Page() {
  const client = createClient();
  const settings = await client.getSingle("settings").catch(() => null);
  const homepage = settings?.data.homepage;
  const uid = homepage && isFilled.contentRelationship(homepage) ? homepage.uid : null;

  redirect(uid ? `/${uid}` : FALLBACK_HOME);
}
