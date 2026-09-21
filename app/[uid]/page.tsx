import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SliceZone } from "@prismicio/react";
import { isFilled } from "@prismicio/client";
import { createClient } from "@/prismicio";
import { components } from "@/slices";
import BackButton from "@/app/components/BackButton";

type Params = { uid: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const { uid } = await params;
  const client = createClient();
  const page = await client.getByUID("page", uid).catch(() => notFound());

  // Project pages (e.g. a single movie) get a Back button; top-level pages
  // linked directly from the nav (Films/Music/About) don't need one.
  const settings = await client.getSingle("settings");
  const navHrefs = settings.data.navigation
    .map((item) => (isFilled.link(item.link) ? item.link.url : null))
    .filter(Boolean);
  const isProjectPage = !navHrefs.includes(`/${uid}`);

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
