"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import { useEffect, useState } from "react";

interface HeroSlide {
    desktop: string;
    mobile: string;
}

interface HeroSliderProps {
    heroSlides: HeroSlide[];
}

export default function HeroSlider({ heroSlides }: HeroSliderProps) {
    const [isMobile, setIsMobile] = useState(false);

    // Detect screen width (client-side)
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize(); // run once
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

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
                            <Image
                                src={isMobile ? slide.mobile : slide.desktop}
                                alt={`Hero Slide ${index + 1}`}
                                fill
                                priority={index === 0}
                                sizes="100vw"
                                className="object-cover object-center w-full h-full"
                            />
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    );
}
