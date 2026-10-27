"use client";

import SingleImgMultiColorProductCard from "./SingleImgMultiColorsProductCard";

interface WearWithProps {
    products?: any[];
}

export default function WearWith({ products = [] }: WearWithProps) {
    if (!products || products.length === 0) {
        return null;
    }

    return (
        <section className="max-w-[1600px] mx-auto px-4 py-16 border-t">
            <h2 className="text-2xl font-semibold mb-8 text-[var(--text-primary)] tracking-tight">
                Wear With
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {products.map((item, index) => (
                    <SingleImgMultiColorProductCard
                        key={item.id || index}
                        product={item}
                        removable
                    />
                ))}
            </div>
        </section>
    );
}
