"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

interface HeroSlide {
    desktop: string;
    mobile: string;
}

interface HeroSliderProps {
    heroSlides: HeroSlide[];
}

export default function HeroSlider({ heroSlides }: HeroSliderProps) {
    const slides = Array.isArray(heroSlides) ? heroSlides : [];
    if (slides.length === 0) return null;

    const canLoop = slides.length > 1;

    return (
        <section className="relative w-full h-[100vh] overflow-hidden">
            <Swiper
                key={`hero-swiper-${slides.length}-${canLoop}`}
                modules={[Autoplay, Pagination, EffectFade]}
                effect="fade"
                pagination={canLoop ? { clickable: true } : false}
                autoplay={canLoop ? { delay: 5000, disableOnInteraction: false } : false}
                loop={canLoop}
                className="h-full w-full"
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={index}>
                        <div className="relative w-full h-[100vh]">
                            <picture className="w-full h-full">
                                <source media="(max-width: 1023px)" srcSet={slide.mobile} />
                                <source media="(min-width: 1024px)" srcSet={slide.desktop} />
                                <img
                                    src={slide.desktop}
                                    alt={`Hero Slide ${index + 1}`}
                                    className="object-cover object-center w-full h-full"
                                    fetchPriority={index === 0 ? "high" : "low"}
                                    loading={index === 0 ? "eager" : "lazy"}
                                />
                            </picture>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    );
}
