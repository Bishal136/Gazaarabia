import { redirect } from "next/navigation";

export default async function BlogSlugAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/blogs/journal/${slug}`);
}
