import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { FaCalendarAlt, FaUserAlt, FaTag } from "react-icons/fa";
import moment from "moment";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ slug: string }>;
}

function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");
}

function stripHtmlToExcerpt(html: string, maxLength: number = 160): string {
  if (!html) return "";
  const clean = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > maxLength ? `${clean.substring(0, maxLength)}...` : clean;
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  const blog = await prisma.blogs.findUnique({
    where: { slug },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!blog) {
    return {
      title: "Blog Not Found | Gazaarabia",
    };
  }

  const excerpt = stripHtmlToExcerpt(blog.content, 160);
  const ogImage = blog.image || "https://gazaarabia.com/images/logo.png";
  const canonicalUrl = `https://gazaarabia.com/blogs/journal/${slug}`;

  return {
    title: `${blog.title} | Gazaarabia Journal`,
    description: excerpt,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${blog.title} | Gazaarabia Journal`,
      description: excerpt,
      url: canonicalUrl,
      type: "article",
      publishedTime: blog.createdAt.toISOString(),
      modifiedTime: blog.updatedAt.toISOString(),
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: blog.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${blog.title} | Gazaarabia Journal`,
      description: excerpt,
      images: [ogImage],
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;

  if (!slug) notFound();

  const blog = await prisma.blogs.findUnique({
    where: { slug },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!blog) {
    notFound();
  }

  const sanitizedContent = sanitizeHtml(blog.content);

  const excerpt = stripHtmlToExcerpt(blog.content, 160);
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: excerpt,
    image: blog.image ? [blog.image] : undefined,
    datePublished: blog.createdAt.toISOString(),
    dateModified: blog.updatedAt.toISOString(),
    author: {
      "@type": "Organization",
      name: "Gazaarabia",
      url: "https://gazaarabia.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Gazaarabia",
      logo: {
        "@type": "ImageObject",
        url: "https://gazaarabia.com/images/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://gazaarabia.com/blogs/journal/${slug}`,
    },
  };

  return (
    <div className="w-full text-[var(--text-primary)]">
      {/* Schema.org Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center text-center overflow-hidden">
        {blog.image ? (
          <img
            src={blog.image}
            alt={blog.title}
            className="absolute inset-0 w-full h-full object-cover brightness-75"
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-900" />
        )}
        <div className="absolute inset-0 bg-black/40"></div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-white">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            {blog.title}
          </h1>
          <div className="flex justify-center gap-5 text-sm text-white/90 flex-wrap">
            <span className="flex items-center gap-2">
              <FaCalendarAlt size={14} />
              {moment.utc(blog.createdAt).format("DD/MM/YYYY")}
            </span>
            <span className="flex items-center gap-2">
              <FaUserAlt size={14} /> Admin
            </span>
            {blog.category?.name && (
              <span className="flex items-center gap-2">
                <FaTag size={14} /> {blog.category.name}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Blog Content */}
      <section className="py-16 bg-[var(--soft-gray)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--brand-secondary)] opacity-10 blur-3xl -translate-x-40 -translate-y-20 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-[var(--brand-primary)] opacity-10 blur-3xl translate-x-20 translate-y-20 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 bg-white rounded-2xl shadow-lg p-6 md:p-10 border border-[var(--mid-gray)]">
          <div className="w-24 h-1 mx-auto mb-8 bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-primary)] rounded-full"></div>

          <article className="prose max-w-none text-[var(--text-secondary)] leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
          </article>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pt-6 pb-16 bg-[var(--soft-gray)] text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent opacity-50"></div>
        <div className="relative z-10 max-w-xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--black)] mb-4">
            Enjoyed this article?
          </h2>
          <div className="w-24 h-1 mx-auto mt-3 mb-6 bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-primary)] rounded-full"></div>
          <p className="text-[var(--text-secondary)] mb-8">
            Subscribe to our newsletter and never miss the latest trends, tips, and insights.
          </p>
          <a
            href="/contact"
            className="group relative inline-flex items-center justify-center overflow-hidden px-8 py-3 font-semibold text-white rounded-lg shadow-md bg-[var(--brand-primary)] hover:scale-[1.03] transition-all duration-500"
          >
            <span className="absolute inset-0 bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
            <span className="relative z-10">Subscribe Now</span>
          </a>
        </div>
      </section>
    </div>
  );
}
