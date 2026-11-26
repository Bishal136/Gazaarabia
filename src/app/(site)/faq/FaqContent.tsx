"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FaChevronDown } from "react-icons/fa";
import { faqsService, Faq, FaqCategory } from "@/lib/services/front-end/faqsService";
import "swiper/css";
import "swiper/css/navigation";

export default function FaqContent({
  initialCategories = [],
  initialFaqs = [],
}: {
  initialCategories?: FaqCategory[];
  initialFaqs?: Faq[];
}) {
  const firstCatId = initialCategories[0]?.id ?? null;
  const initialFilteredFaqs = firstCatId
    ? initialFaqs.filter((f) => f.categoryId === firstCatId)
    : initialFaqs;

  const [categories, setCategories] = useState<FaqCategory[]>(initialCategories);
  const [faqs, setFaqs] = useState<Faq[]>(initialFilteredFaqs);
  const [activeCategory, setActiveCategory] = useState<number | null>(firstCatId);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isSticky, setIsSticky] = useState<boolean>(false);

  useEffect(() => {
    if (initialCategories.length > 0) return;
    const fetchCategories = async () => {
      try {
        const res = await faqsService.getAllCategories();
        setCategories(res.data);
        if (res.data.length > 0) {
          setActiveCategory(res.data[0].id);
          fetchFaqs(res.data[0].id);
        }
      } catch (error) {
        console.error("Failed to load FAQ categories", error);
      }
    };
    fetchCategories();
  }, [initialCategories.length]);

  const fetchFaqs = async (categoryId: number) => {
    // Fast client-side path if all FAQs were SSR-preloaded
    if (initialFaqs.length > 0) {
      setFaqs(initialFaqs.filter((f) => f.categoryId === categoryId));
      setActiveIndex(null);
      return;
    }

    try {
      const res = await faqsService.getAllFaqs({ categoryId });
      setFaqs(res.data);
      setActiveIndex(null);
    } catch (error) {
      console.error("Failed to load FAQs", error);
    }
  };

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="w-full text-[var(--text-primary)] overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-white/90 max-w-xl mx-auto">
            Find answers to your most common questions, organized by category.
          </p>
        </div>
      </section>

      {/* Category Carousel */}
      {categories.length > 0 && (
        <div
          className={`bg-white py-5 border-b border-[var(--mid-gray)] transition-all duration-300 ${
            isSticky ? "sticky top-0 z-30 shadow-md" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto relative px-4 md:px-8 overflow-hidden">
            {categories.length <= 4 ? (
              <div className="flex flex-wrap justify-center gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat.id);
                      fetchFaqs(cat.id);
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-full border transition whitespace-nowrap ${
                      activeCategory === cat.id
                        ? "bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white border-transparent shadow-md"
                        : "border-[var(--mid-gray)] text-[var(--text-primary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-secondary)]"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="relative overflow-visible">
                <button
                  type="button"
                  aria-label="Previous FAQ categories"
                  className="swiper-button-prev-custom absolute left-2 sm:-left-5 top-1/2 -translate-y-1/2 
              bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)]
              text-white rounded-full w-9 h-9 flex items-center justify-center 
              hover:opacity-90 transition z-20 shadow-md pointer-events-auto"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  aria-label="Next FAQ categories"
                  className="swiper-button-next-custom absolute right-2 sm:-right-5 top-1/2 -translate-y-1/2 
              bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)]
              text-white rounded-full w-9 h-9 flex items-center justify-center 
              hover:opacity-90 transition z-20 shadow-md pointer-events-auto"
                >
                  <ChevronRight size={18} />
                </button>

                <div className="overflow-hidden">
                  <Swiper
                    modules={[Navigation]}
                    slidesPerView="auto"
                    spaceBetween={12}
                    navigation={{
                      nextEl: ".swiper-button-next-custom",
                      prevEl: ".swiper-button-prev-custom",
                    }}
                    allowTouchMove={true}
                    grabCursor={true}
                    breakpoints={{
                      0: { spaceBetween: 8 },
                      768: { spaceBetween: 12 },
                      1024: { spaceBetween: 16 },
                    }}
                    className="!px-12 cursor-grab active:cursor-grabbing"
                  >
                    {categories.map((cat) => (
                      <SwiperSlide key={cat.id} className="!w-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCategory(cat.id);
                            fetchFaqs(cat.id);
                          }}
                          className={`px-4 py-2 text-sm font-medium rounded-full border transition whitespace-nowrap ${
                            activeCategory === cat.id
                              ? "bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white border-transparent shadow-md"
                              : "border-[var(--mid-gray)] text-[var(--text-primary)] hover:border-[var(--brand-secondary)] hover:text-[var(--brand-secondary)]"
                          }`}
                        >
                          {cat.name}
                        </button>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>

                <div className="pointer-events-none absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-white to-transparent"></div>
                <div className="pointer-events-none absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-white to-transparent"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <section className="py-20 bg-[var(--soft-gray)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--brand-secondary)] opacity-10 blur-3xl -translate-x-40 -translate-y-20"></div>
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-[var(--brand-primary)] opacity-10 blur-3xl translate-x-20 translate-y-20"></div>

        <div className="max-w-4xl mx-auto px-6 relative z-10">
          {faqs.length > 0 ? (
            faqs.map((faq, index) => (
              <div
                key={faq.id}
                className="border-b border-[var(--mid-gray)] py-5 cursor-pointer group"
                onClick={() => toggleFAQ(index)}
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-[var(--black)] group-hover:text-[var(--brand-primary)] transition-colors duration-300">
                    {faq.question}
                  </h2>
                  <FaChevronDown
                    className={`transition-transform duration-300 text-[var(--brand-secondary)] ${
                      activeIndex === index ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </div>
                <div
                  className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                    activeIndex === index ? "max-h-96 mt-3" : "max-h-0"
                  }`}
                >
                  <div
                    className="text-[var(--text-secondary)] leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[var(--text-secondary)] py-12">
              No FAQs found for this category.
            </p>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-white text-center relative overflow-hidden px-4">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--soft-gray)] to-transparent opacity-50"></div>
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--black)] mb-4">
            Still have questions?
          </h2>
          <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
            If your question isn&apos;t answered here, our support team will be happy to help.
          </p>
          <Link
            href="/contact"
            className="group relative inline-flex items-center justify-center overflow-hidden px-8 py-3 font-semibold text-white rounded-lg shadow-md bg-[var(--brand-primary)] hover:scale-[1.03] transition-all duration-500"
          >
            <span className="absolute inset-0 bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
            <span className="relative z-10">Contact Support</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
