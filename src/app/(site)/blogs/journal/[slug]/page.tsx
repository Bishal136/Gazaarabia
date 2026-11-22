import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import moment from "moment";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ReadingProgressBar } from "@/components/front-end/blogs/BlogInteractionBar";

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
  // Strip out comments, header, nav, and style blocks if present in custom templates (like Modest Fashion UK)
  const withoutNav = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, " ");

  const clean = withoutNav
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&rsaquo;/gi, "›")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  return clean.length > maxLength ? `${clean.substring(0, maxLength)}...` : clean;
}

function calculateReadingTime(html: string): number {
  const clean = html.replace(/<[^>]+>/g, " ");
  const wordCount = clean.trim().split(/\s+/).length;
  return Math.max(2, Math.ceil(wordCount / 220));
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
      title: "Blog Not Found | Gazaarabia Journal",
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
  const excerpt = stripHtmlToExcerpt(blog.content, 180);
  const readTimeMinutes = calculateReadingTime(blog.content);
  const canonicalUrl = `https://gazaarabia.com/blogs/journal/${slug}`;

  // Query up to 3 related articles
  let relatedBlogs = await prisma.blogs.findMany({
    where: {
      slug: { not: slug },
      ...(blog.categoryId ? { categoryId: blog.categoryId } : {}),
    },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (relatedBlogs.length < 3) {
    const existingIds = [blog.id, ...relatedBlogs.map((b: any) => b.id)];
    const additional = await prisma.blogs.findMany({
      where: {
        id: { notIn: existingIds },
      },
      take: 3 - relatedBlogs.length,
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
    relatedBlogs = [...relatedBlogs, ...additional];
  }

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
      name: "Gazaarabia Editorial",
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
      "@id": canonicalUrl,
    },
  };

  const isStandaloneTemplate =
    sanitizedContent.includes("SITE HEADER") ||
    sanitizedContent.includes("<!-- ════════════");

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-rose-100 selection:text-rose-900">
      {/* 1. Global Reading Progress Bar */}
      <ReadingProgressBar />

      {/* 2. Structured JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* 3. Luxury Magazine Styling */}
      <style>{`
        .font-editorial-serif {
          font-family: 'Playfair Display', Didot, 'Cinzel', 'Bodoni MT', Georgia, 'Times New Roman', serif;
        }
        .prose-gazaarabia {
          color: #292524;
          font-size: 1.125rem;
          line-height: 1.95;
          letter-spacing: -0.003em;
        }
        .prose-gazaarabia > p:first-of-type::first-letter {
          float: left;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 4.5rem;
          line-height: 0.82;
          margin-right: 0.75rem;
          margin-top: 0.25rem;
          color: #0c0a09;
          font-weight: 700;
        }
        .prose-gazaarabia h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 2.125rem;
          font-weight: 600;
          color: #0c0a09;
          margin-top: 3.5rem;
          margin-bottom: 1.25rem;
          line-height: 1.25;
          letter-spacing: -0.015em;
          padding-top: 2rem;
          border-top: 1px solid #f5f5f4;
        }
        .prose-gazaarabia h3 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1c1917;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.35;
        }
        .prose-gazaarabia p {
          margin-bottom: 1.75rem;
          color: #374151;
        }
        .prose-gazaarabia strong {
          font-weight: 600;
          color: #0f172a;
        }
        .prose-gazaarabia em {
          font-style: italic;
          font-family: 'Playfair Display', Georgia, serif;
        }
        .prose-gazaarabia blockquote,
        .prose-gazaarabia .pull-quote {
          margin: 3rem 0;
          padding: 1.75rem 2rem;
          border-left: 2px solid #0f172a;
          background-color: #fafaf9;
          border-radius: 0 0.75rem 0.75rem 0;
          font-family: 'Playfair Display', Georgia, serif;
          font-style: italic;
          color: #1c1917;
          font-size: 1.25rem;
          line-height: 1.75;
        }
        .prose-gazaarabia .mission-callout {
          margin: 2.5rem 0;
          padding: 1.25rem 1.75rem;
          background-color: #fdfbf7;
          border: 1px solid #f5ede1;
          border-left: 4px solid #009639;
          border-radius: 0.75rem;
        }
        .prose-gazaarabia .mission-callout p {
          color: #44403c;
          margin-bottom: 0;
          font-size: 0.95rem;
          line-height: 1.65;
        }
        .prose-gazaarabia .mission-callout strong {
          color: #009639;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .prose-gazaarabia ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 2rem;
          color: #374151;
        }
        .prose-gazaarabia ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 2rem;
          color: #374151;
        }
        .prose-gazaarabia li {
          margin-bottom: 0.75rem;
          line-height: 1.75;
        }
        .prose-gazaarabia a {
          color: #0f172a;
          text-decoration: underline;
          text-underline-offset: 4px;
          text-decoration-color: #cbd5e1;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        .prose-gazaarabia a:hover {
          text-decoration-color: #e11d48;
          color: #e11d48;
        }
        .prose-gazaarabia img {
          border-radius: 1rem;
          margin: 2.5rem auto;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }
      `}</style>

      {isStandaloneTemplate ? (
        // Dedicated view for articles with custom-embedded HTML layout (e.g. Modest Fashion UK)
        <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
      ) : (
        // High-Fashion Editorial Magazine View for AI-drafted & Standard Articles
        <article className="w-full pt-24 sm:pt-28">
          {/* Top Breadcrumb & Kicker */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4 text-xs">
              <nav
                className="flex items-center gap-2 text-slate-500 font-medium tracking-wider uppercase text-[11px]"
                aria-label="Breadcrumb"
              >
                <Link href="/" className="hover:text-slate-900 transition-colors">
                  Home
                </Link>
                <span className="text-slate-300">/</span>
                <Link href="/blogs" className="hover:text-slate-900 transition-colors">
                  Journal
                </Link>
                {blog.category && (
                  <>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-900 font-semibold">{blog.category.name}</span>
                  </>
                )}
              </nav>

              <Link
                href="/blogs"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium"
              >
                <ArrowLeft size={13} />
                <span>All Stories</span>
              </Link>
            </div>
          </div>

          {/* Editorial Headline Header */}
          <header className="max-w-4xl mx-auto px-4 sm:px-6 pt-2 pb-6">
            {/* Category Eyebrow & Solidarity Tag */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              {blog.category?.name && (
                <span className="text-[11px] font-bold tracking-[0.25em] text-slate-950 uppercase border-b-2 border-slate-950 pb-0.5">
                  {blog.category.name}
                </span>
              )}
              <span className="text-[11px] font-medium tracking-wider text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <span>🇵🇸</span>
                <span>Modest Fashion With Purpose</span>
              </span>
            </div>

            {/* Main Title (Luxury Serif Display) */}
            <h1 className="font-editorial-serif text-3xl sm:text-5xl md:text-[3.25rem] font-medium text-slate-950 leading-[1.14] tracking-tight mb-6">
              {blog.title}
            </h1>

            {/* Sub-headline / Standfirst / Deck */}
            {excerpt && (
              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-light mb-8 max-w-3xl">
                {excerpt}
              </p>
            )}

            {/* Metadata Byline Strip (Share Section Removed) */}
            <div className="flex items-center justify-between flex-wrap gap-4 py-4 border-y border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center font-editorial-serif text-sm font-semibold tracking-wider shadow-xs">
                  GA
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
                      Gazaarabia Editorial
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      Official Desk
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      {moment.utc(blog.createdAt).format("DD MMMM YYYY")}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      {readTimeMinutes} min read
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                      <ShieldCheck size={12} /> Fact-Checked
                    </span>
                  </div>
                </div>
              </div>

              {/* Minimalist Editorial Dispatch Label */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <BookOpen size={13} className="text-slate-400" />
                <span>Editorial Dispatch</span>
              </div>
            </div>
          </header>

          {/* Featured Hero Cover Image */}
          {blog.image && (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-12">
              <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-slate-50">
                <img
                  src={blog.image}
                  alt={blog.title}
                  className="w-full h-auto max-h-[640px] object-cover object-center transition-transform duration-700 hover:scale-[1.01]"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 px-1 italic">
                <span>Photography & Curation: Gazaarabia Curated Heritage Archive</span>
                <span className="not-italic text-slate-500 font-medium">🇵🇸 High-Fashion Cultural Storytelling</span>
              </div>
            </div>
          )}

          {/* Main Article Content Container (Pure Canvas, No Boxed Cards!) */}
          <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
            <div className="prose-gazaarabia">
              <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
            </div>

            {/* Unified Editorial Sign-off & Palestine Solidarity Feature */}
            <section className="mt-16 rounded-3xl bg-slate-50 border border-slate-200/90 p-8 sm:p-10 shadow-xs relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                {/* Author Monogram & Desk Bio */}
                <div className="flex items-start gap-4 pb-6 border-b border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-slate-950 text-white flex items-center justify-center font-editorial-serif text-base font-semibold shrink-0 shadow-xs ring-4 ring-slate-200/60">
                    GA
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-bold text-sm text-slate-900 tracking-wide uppercase">
                        GAZAARABIA Editorial Desk
                      </h4>
                      <span className="text-[10px] font-mono uppercase bg-slate-200/80 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold">
                        Verified Journal
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      Written, styled, and verified by our editorial curators. We explore the convergence of British modest luxury, Middle Eastern textile heritage, and direct humanitarian solidarity.
                    </p>
                  </div>
                </div>

                {/* Humanitarian Solidarity Pledge */}
                <div className="flex items-start gap-4">
                  <span className="text-3xl shrink-0 mt-0.5" role="img" aria-label="Palestine Flag">
                    🇵🇸
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[2px] text-emerald-800">
                        100% Humanitarian Solidarity Commitment
                      </span>
                      <Sparkles size={13} className="text-amber-600" />
                    </div>
                    <h3 className="font-editorial-serif text-xl sm:text-2xl font-normal text-slate-950">
                      Modest Haute Couture with Conscience
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      At GAZAARABIA, every story published and garment crafted actively supports Palestinian self-determination. A direct percentage of every order funds verified emergency medical aid, clean water, and artisan workshop reconstruction across Gaza.
                    </p>
                    <div className="pt-3 flex items-center gap-3 flex-wrap">
                      <Link
                        href="/shop"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-slate-950 text-white hover:bg-slate-800 text-xs font-bold transition shadow-xs cursor-pointer group"
                      >
                        <span>Explore Ethical Collection</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                      <Link
                        href="/about"
                        className="text-xs font-semibold text-slate-700 hover:text-slate-950 underline underline-offset-4"
                      >
                        Our Transparency Pledge
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>

          {/* Curated Editorial Stories (Cool Slate Gallery Canvas - Clean & Modern) */}
          {relatedBlogs.length > 0 && (
            <section className="bg-slate-50 border-t border-slate-200 py-16 sm:py-20 mt-6">
              <div className="max-w-6xl mx-auto px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-slate-200 gap-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-rose-700 block mb-1">
                      GAZAARABIA ARCHIVE
                    </span>
                    <h2 className="font-editorial-serif text-2xl sm:text-4xl font-normal text-slate-950">
                      Curated Editorial Stories
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Continuing narratives on Islamic haute couture, artisan heritage, and humanitarian solidarity.
                    </p>
                  </div>
                  <Link
                    href="/blogs"
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 hover:text-rose-700 transition self-start sm:self-end"
                  >
                    <span>View Complete Archive</span>
                    <span>→</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                  {relatedBlogs.map((item: any) => {
                    const itemExcerpt = stripHtmlToExcerpt(item.content, 110);
                    const itemReadTime = calculateReadingTime(item.content);
                    return (
                      <Link
                        key={item.id}
                        href={`/blogs/journal/${item.slug}`}
                        className="group bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-slate-400 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col"
                      >
                        {/* Image Container with object-top to ensure full portrait & face visibility */}
                        <div className="relative h-60 sm:h-64 w-full bg-slate-100 overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-950 text-white/40 text-xs font-editorial-serif tracking-widest uppercase">
                              GAZAARABIA
                            </div>
                          )}
                          {item.category?.name && (
                            <span className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-2xs">
                              {item.category.name}
                            </span>
                          )}
                          <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white/90 text-[9px] font-medium px-2 py-0.5 rounded shadow-2xs">
                            {itemReadTime} min read
                          </span>
                        </div>

                        {/* Card Body with balanced typography & excerpt */}
                        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <p className="text-[11px] text-slate-400 font-medium mb-2 flex items-center gap-1.5">
                              <Calendar size={12} className="text-slate-400" />
                              <span>{moment.utc(item.createdAt).format("DD MMM YYYY")}</span>
                            </p>
                            <h3 className="font-editorial-serif font-semibold text-base sm:text-lg text-slate-950 leading-snug group-hover:text-rose-600 transition-colors line-clamp-2">
                              {item.title}
                            </h3>
                            {itemExcerpt && (
                              <p className="text-xs sm:text-sm text-slate-500 mt-2.5 line-clamp-2 leading-relaxed font-light">
                                {itemExcerpt}
                              </p>
                            )}
                          </div>
                          <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-900 group-hover:text-rose-600 transition-colors">
                            <span className="group-hover:translate-x-0.5 transition-transform">Read Essay</span>
                            <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform text-slate-400 group-hover:text-rose-600" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Luxury Newsletter Box */}
          <section className="bg-white border-t border-slate-200 py-16 sm:py-20 text-center">
            <div className="max-w-xl mx-auto px-4">
              <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-rose-700 block mb-2">
                GAZAARABIA DISPATCH
              </span>
              <h2 className="font-editorial-serif text-2xl sm:text-3xl font-medium text-slate-950 mb-3 tracking-tight">
                Stories of Heritage, Modesty & Purpose
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed max-w-md mx-auto">
                Join our private circle to receive curated weekly essays on British modest haute couture, Islamic artisan history, and humanitarian impact reports.
              </p>
              <div className="flex items-center gap-2 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email address..."
                  className="no-focus-ring flex-1 text-xs px-4 py-3 rounded-full border border-slate-200 focus:outline-none focus:border-slate-800 bg-slate-50 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                  style={{ outline: "none", boxShadow: "none" }}
                />
                <button
                  type="button"
                  className="px-6 py-3 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </section>
        </article>
      )}
    </div>
  );
}
