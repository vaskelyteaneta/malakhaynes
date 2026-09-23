import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SliceZone } from "@prismicio/react";
import { createClient } from "@/prismicio";
import { components } from "@/slices";
import BackButton from "@/app/components/BackButton";

type Params = { uid: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const { uid } = await params;
  const client = createClient();
  const page = await client.getByUID("page", uid).catch(() => notFound());

  // Project pages (e.g. a single film) get a Back button; top-level pages
  // linked directly from the nav (Films/Music/About) don't need one — you
  // reach those from the nav, and the circle button handles moving between
  // the two sites.
  //
  // Matched on the linked document's uid, not its resolved .url: whether a
  // link carries a url depends on the client being configured with `routes`,
  // which the sibling site deliberately can't do (see its prismicio.ts). uid
  // is always present on a document link, so this works on both sites.
  const settings = await client.getSingle("settings");
  const navUids = new Set(
    settings.data.navigation.flatMap((item) =>
      item.link.link_type === "Document" && item.link.uid ? [item.link.uid] : []
    )
  );
  const isProjectPage = !navUids.has(uid);

  return (
    <>
      <SliceZone slices={page.data.slices} components={components} />
      {isProjectPage && <BackButton />}
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { uid } = await params;
  const client = createClient();
  const page = await client.getByUID("page", uid).catch(() => notFound());

  return {
    title: page.data.meta_title,
    description: page.data.meta_description,
  };
}

export async function generateStaticParams() {
  const client = createClient();
  const pages = await client.getAllByType("page");
  return pages.map((page) => ({ uid: page.uid }));
}
