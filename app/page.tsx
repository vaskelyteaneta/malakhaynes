import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SliceZone } from "@prismicio/react";
import { createClient } from "@/prismicio";
import { components } from "@/slices";

export default async function Page() {
  const client = createClient();
  const page = await client.getByUID("page", "home").catch(() => notFound());

  return <SliceZone slices={page.data.slices} components={components} />;
}

export async function generateMetadata(): Promise<Metadata> {
  const client = createClient();
  const page = await client.getByUID("page", "home").catch(() => notFound());

  return {
    title: page.data.meta_title,
    description: page.data.meta_description,
  };
}
