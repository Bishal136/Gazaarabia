"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { useRouter } from "next/navigation";
import ProductVideoHover from "@/components/ProductVideoHover";
import { extractProductVideoUrl } from "@/lib/utils/productVideo";

interface Product {
  id: number;
  title: string;
  slug: string;
  sellingPrice: number;
  videoUrl?: string | null;
  productimage: any;
  productvariant?: any[];
}

interface SignatureProductsProps {
  products: Product[];
}

/**
 * Individual signature collection card supporting hover video preview
 */
function SignatureCard({
  product,
  index,
  onClick,
}: {
  product: Product;
  index: number;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const videoUrl = extractProductVideoUrl(product);

  return (
    <motion.div
      className="overflow-hidden rounded-2xl bg-[#F8F8F8] group shadow-sm hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)] transition-all duration-700 cursor-pointer"
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative w-full aspect-[3/4] overflow-hidden max-w-[320px] mx-auto"
        style={{ aspectRatio: "3/4" }}
      >
        <Image
          src={product.productimage?.[0]?.url || "/placeholder.jpg"}
          alt={product.title}
          fill
          loading="lazy"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 280px"
          className="object-cover transition-transform duration-[1500ms] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:scale-105"
        />

        {/* Hover overlay with second image */}
        {product.productimage?.[1]?.url && !videoUrl && (
          <Image
            src={product.productimage[1].url}
            alt={`${product.title} alternate`}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 280px"
            className="object-cover absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 hidden sm:block"
          />
        )}

        {/* Hover-to-play Video Preview (smoothly plays when video is available) */}
        {videoUrl && (
          <ProductVideoHover
            videoUrl={videoUrl}
            isHovered={isHovered}
          />
        )}
      </div>

      {/* Info */}
      <div className="p-5 text-center">
        <h3 className="font-medium text-[var(--text-primary)] text-base md:text-lg mb-1 group-hover:text-[var(--brand-secondary)] transition-colors duration-300 line-clamp-2 min-h-[48px]">
          {product.title}
        </h3>

        <p className="text-[var(--brand-primary)] font-semibold text-sm md:text-base">
          £{product.sellingPrice}
        </p>
      </div>
    </motion.div>
  );
}

export default function SignatureCollection({ products }: SignatureProductsProps) {
  const router = useRouter();

  const handleCardClick = (item: any) => {
    if (item?.slug) {
      router.push(`/products/${item.slug}`);
    } else {
      console.warn("⚠️ Item slug is missing:", item);
    }
  };

  const productList = Array.isArray(products) ? products : [];
  if (productList.length === 0) return null;

  // Max slidesPerView across breakpoints is 5 (at >=1400px).
  // Loop mode requires slide count to strictly exceed maximum slidesPerView (>= 6).
  const canLoop = productList.length >= 6;

  return (
    <section className="bg-[#ffffff] pt-8 pb-16 md:pt-10 md:pb-20 overflow-hidden">
      <div className="max-w-[1500px] mx-auto px-4 md:px-10 text-center overflow-hidden">
        {/* Section Heading */}
        <div className="mb-10">
          <h2 className="text-[1.9rem] md:text-[2.4rem] font-semibold tracking-tight text-[var(--text-primary)]">
            <span className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] bg-clip-text text-transparent">
              Signature Collection
            </span>
          </h2>
          <div className="w-20 h-[3px] bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] mx-auto mt-3 mb-5 rounded-full"></div>
          <p className="text-[var(--text-muted)] text-sm md:text-base max-w-2xl mx-auto font-light leading-relaxed">
            Discover our handpicked selection of elegant, timeless pieces that define modest luxury.
          </p>
        </div>

        {/* Swiper Slider */}
        <div className="overflow-hidden w-full">
          <Swiper
            key={`sig-swiper-${productList.length}-${canLoop}`}
            grabCursor={true}
            modules={[Autoplay]}
            autoplay={canLoop ? { delay: 4000, disableOnInteraction: false } : false}
            spaceBetween={5}
            slidesPerView={2.1} //Minimum 2 visible on mobile
            loop={canLoop}
            breakpoints={{
              480: { slidesPerView: 2.1 },
              640: { slidesPerView: 2.4 },
              768: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
              1400: { slidesPerView: 5 },
            }}
            speed={800}
            className="!overflow-visible w-full"
          >
            {productList.map((p, i) => (
              <SwiperSlide key={i}>
                <SignatureCard
                  product={p}
                  index={i}
                  onClick={() => handleCardClick(p)}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
