"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/free-mode";

export default function CategoryHeader({
  selectedSlug,
  title,
  description,
  parentCategory,
  categories,
  onCategoryChange,
}: {
  selectedSlug: string;
  title: string;
  description: string;
  parentCategory?: { slug: string; name?: string };
  categories: { slug: string; name: string }[];
  onCategoryChange?: (category: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState(selectedSlug);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCategorySelect = (slug: string) => {
    setActiveCategory(slug);
    onCategoryChange?.(slug);
  };

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 mb-6 text-center relative pt-4 md:pt-6"
    >
      {/* Title (rendered unconditionally in SSR HTML) */}
      <h1 className="text-3xl md:text-4xl font-semibold text-[var(--text-primary)] tracking-wide capitalize mb-4">
        {title}
      </h1>

      {/* Category SEO Description (rendered unconditionally in SSR HTML) */}
      {description && (
        <div className="max-w-3xl mx-auto">
          <p
            className={`text-[var(--text-muted)] text-sm md:text-base leading-relaxed transition-all duration-300 ${
              expanded ? "line-clamp-none" : "line-clamp-3"
            }`}
          >
            {description}
          </p>

          {description.length > 160 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[var(--text-primary)] font-medium mt-2 underline underline-offset-2 text-sm"
            >
              {expanded ? "Read less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {/* Category Scroller with Semantic Crawlable Links */}
      {(categories?.length > 0 || parentCategory) && (
        <div className="mt-8 relative w-full">
          {/* Prev Button */}
          <button
            type="button"
            aria-label="Scroll categories left"
            className="swiper-button-prev-custom absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 
              bg-black/60 text-white rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center 
              hover:bg-black/80 transition z-20 backdrop-blur-sm shadow-md"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Next Button */}
          <button
            type="button"
            aria-label="Scroll categories right"
            className="swiper-button-next-custom absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 
              bg-black/60 text-white rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center 
              hover:bg-black/80 transition z-20 backdrop-blur-sm shadow-md"
          >
            <ChevronRight size={16} />
          </button>

          {/* Swiper (Scrollable + Aligned Category Anchors) */}
          <div className="relative w-full overflow-x-hidden">
            <Swiper
              modules={[Navigation, FreeMode]}
              slidesPerView="auto"
              spaceBetween={10}
              navigation={{
                nextEl: ".swiper-button-next-custom",
                prevEl: ".swiper-button-prev-custom",
              }}
              freeMode={{
                enabled: true,
                momentumRatio: 0.3,
              }}
              centeredSlides={false}
              className="w-full !px-0 sm:!px-2 md:!px-4 overflow-visible"
            >
              {/* “All” Link */}
              {parentCategory && categories?.length > 0 && (
                <SwiperSlide className="!w-auto first:pl-4 last:pr-4 sm:first:pl-6 sm:last:pr-6">
                  <Link
                    href={`/shop/${parentCategory.slug}`}
                    prefetch={false}
                    onClick={() => handleCategorySelect(parentCategory.slug)}
                    className={`inline-block px-4 py-2 text-sm font-medium rounded-full border transition whitespace-nowrap ${
                      activeCategory === parentCategory.slug
                        ? "bg-black text-white border-black"
                        : "border-gray-300 hover:border-black hover:bg-black hover:text-white"
                    }`}
                  >
                    All
                  </Link>
                </SwiperSlide>
              )}

              {/* Category Anchors */}
              {categories.map((cat) => (
                <SwiperSlide
                  key={cat.slug}
                  className="!w-auto first:pl-4 last:pr-4 sm:first:pl-6 sm:last:pr-6"
                >
                  <Link
                    href={`/shop/${cat.slug}`}
                    prefetch={false}
                    onClick={() => handleCategorySelect(cat.slug)}
                    className={`inline-block px-4 py-2 text-sm font-medium rounded-full border transition whitespace-nowrap ${
                      activeCategory === cat.slug
                        ? "bg-black text-white border-black"
                        : "border-gray-300 hover:border-black hover:bg-black hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      )}
    </div>
  );
}
