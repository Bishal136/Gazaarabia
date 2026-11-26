"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaCalendarAlt, FaUserAlt, FaChevronRight, FaRegFrown } from "react-icons/fa";
import Pagination from "@/components/Pagination";
import { blogsService } from "@/lib/services/front-end/blogsService";

function stripHtmlToExcerpt(html: string, maxLength: number = 140): string {
  if (!html) return "";
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

interface Blog {
  id: number;
  title: string;
  slug: string;
  image?: string | null;
  content: string;
  createdAt: string;
  category?: { id: number; name: string } | null;
}

interface BlogCategory {
  id: number;
  name: string;
}

type ActiveCategoryType = number | "All";

export default function JournalContent({
  initialBlogs = [],
  initialCategories = [],
}: {
  initialBlogs?: Blog[];
  initialCategories?: BlogCategory[];
}) {
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs);
  const [categories, setCategories] = useState<BlogCategory[]>(initialCategories);
  const [activeCategory, setActiveCategory] = useState<ActiveCategoryType>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(initialBlogs.length === 0);

  const [currentPage, setCurrentPage] = useState(1);
  const blogsPerPage = 6;
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (initialCategories.length > 0) return;
    const fetchCategories = async () => {
      try {
        const cats: any = await blogsService.getAllCategory();
        setCategories(cats?.data ?? []);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    fetchCategories();
  }, [initialCategories.length]);

  useEffect(() => {
    if (
      isInitialMount.current &&
      initialBlogs.length > 0 &&
      activeCategory === "All" &&
      !searchTerm.trim()
    ) {
      isInitialMount.current = false;
      return;
    }
    isInitialMount.current = false;

    const fetchBlogs = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if (activeCategory !== "All") params.categoryId = activeCategory;
        if (searchTerm.trim()) params.search = searchTerm;
        const data: any = await blogsService.getAllBlogs(params);
        setBlogs(data?.data ?? []);
      } catch (err) {
        console.error("Failed to fetch blogs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [activeCategory, searchTerm, initialBlogs.length]);

  const totalPages = Math.ceil(blogs.length / blogsPerPage);
  const startIndex = (currentPage - 1) * blogsPerPage;
  const currentBlogs = Array.isArray(blogs)
    ? blogs.slice(startIndex, startIndex + blogsPerPage)
    : [];

  return (
    <div className="w-full text-[var(--text-primary)]">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-black/25 backdrop-blur-sm"></div>
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            The <span className="text-[var(--white)]">Gazaarabia Journal</span>
          </h1>
          <p className="text-lg text-white/90 max-w-xl mx-auto">
            Stories, modest fashion guides, textile heritage, and insights on our humanitarian movement.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <div className="bg-white py-6 border-b border-[var(--mid-gray)] flex justify-center gap-3 flex-wrap px-4">
        <button
          type="button"
          onClick={() => {
            setActiveCategory("All");
            setCurrentPage(1);
          }}
          className={`px-5 py-2 text-sm font-medium rounded-full border transition ${
            activeCategory === "All"
              ? "bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white border-transparent shadow-md"
              : "border-[var(--mid-gray)] text-[var(--text-primary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-secondary)]"
          }`}
        >
          All
        </button>
        {Array.isArray(categories) &&
          categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setCurrentPage(1);
              }}
              className={`px-5 py-2 text-sm font-medium rounded-full border transition ${
                activeCategory === cat.id
                  ? "bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white border-transparent shadow-md"
                  : "border-[var(--mid-gray)] text-[var(--text-primary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-secondary)]"
              }`}
            >
              {cat.name}
            </button>
          ))}
      </div>

      {/* Search Box */}
      <div className="flex justify-center py-6 bg-[var(--soft-gray)] px-4">
        <input
          type="text"
          aria-label="Search journal stories"
          placeholder="Search journal stories..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full max-w-md px-4 py-2 rounded-full border border-[var(--mid-gray)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-secondary)]"
        />
      </div>

      {/* Blog Grid */}
      <section className="pb-20 bg-[var(--soft-gray)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--brand-secondary)] opacity-10 blur-3xl -translate-x-40 -translate-y-20"></div>
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-[var(--brand-primary)] opacity-10 blur-3xl translate-x-20 translate-y-20"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <h2 className="text-3xl font-bold text-[var(--brand-primary)] text-center">
            Latest Stories
          </h2>
          <div className="w-24 h-1 mx-auto mt-3 mb-12 bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-primary)] rounded-full"></div>

          {loading ? (
            <div className="text-center py-16 text-[var(--text-muted)]">Loading journal stories...</div>
          ) : currentBlogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-0 pb-16 text-center text-[var(--text-muted)]">
              <FaRegFrown size={48} className="mb-4 text-[var(--brand-secondary)]" />
              <p className="text-lg font-medium">No articles found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {currentBlogs.map((blog) => (
                <article
                  key={blog.id}
                  className="group relative bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-xl hover:-translate-y-2 transition-all duration-500 flex flex-col"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"></div>

                  {/* Image with next/image optimization & explicit sizing */}
                  <div className="relative h-64 w-full overflow-hidden bg-stone-100">
                    <Image
                      src={blog.image || "/images/home/hero-desktop-1.jpg"}
                      alt={blog.title}
                      fill
                      loading="lazy"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    {blog.category?.name && (
                      <span className="relative z-10 inline-block mt-3 ml-3 bg-slate-950/85 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-2xs">
                        {blog.category.name}
                      </span>
                    )}
                  </div>

                  <div className="relative z-10 p-6 flex flex-col gap-3 flex-1 justify-between">
                    <div>
                      <div className="flex items-center gap-4 text-stone-400 text-xs mb-1">
                        <span suppressHydrationWarning className="flex items-center gap-1.5 font-medium">
                          <FaCalendarAlt size={11} className="text-stone-400" />
                          {new Date(blog.createdAt).toLocaleDateString("en-GB", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <FaUserAlt size={10} className="text-stone-400" /> Gazaarabia Editorial
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[var(--brand-primary)] transition-colors line-clamp-2 leading-snug">
                        <Link
                          href={`/blogs/journal/${blog.slug}`}
                          className="after:absolute after:inset-0"
                        >
                          {blog.title}
                        </Link>
                      </h3>

                      <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed mt-1 font-light">
                        {stripHtmlToExcerpt(blog.content, 140)}
                      </p>
                    </div>

                    <span className="mt-2 inline-flex items-center gap-2 text-emerald-700 font-semibold group-hover:gap-3 transition-all text-xs uppercase tracking-wider">
                      <span>Read Essay</span>
                      <FaChevronRight size={11} />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </section>
    </div>
  );
}
