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
        <section
            className="relative w-full h-[100vh] min-h-[100vh] bg-[#4A0E17] overflow-hidden"
            style={{ backgroundColor: "#4A0E17", minHeight: "100vh" }}
        >
            <Swiper
                key={`hero-swiper-${slides.length}-${canLoop}`}
                modules={[Autoplay, Pagination, EffectFade]}
                effect="fade"
                pagination={canLoop ? { clickable: true } : false}
                autoplay={canLoop ? { delay: 5000, disableOnInteraction: false } : false}
                loop={canLoop}
                className="h-full w-full bg-[#4A0E17]"
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={index} className="bg-[#4A0E17]">
                        <div
                            className="relative w-full h-[100vh] bg-[#4A0E17]"
                            style={{ backgroundColor: "#4A0E17" }}
                        >
                            <picture className="w-full h-full">
                                <source media="(max-width: 1023px)" srcSet={slide.mobile} />
                                <source media="(min-width: 1024px)" srcSet={slide.desktop} />
                                <img
                                    src={slide.desktop}
                                    alt={`Hero Slide ${index + 1}`}
                                    className="object-cover object-center w-full h-full"
                                    fetchPriority={index === 0 ? "high" : "low"}
                                    loading={index === 0 ? "eager" : "lazy"}
                                    decoding={index === 0 ? "sync" : "async"}
                                />
                            </picture>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    );
}
