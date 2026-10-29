import { prisma } from "@/lib/prisma";

/**
 * Get average rating + total reviews for multiple products in a single batch
 */
export async function getBulkProductRatingStats(productIds: number[]) {
    if (productIds.length === 0) return new Map();

    const statsMap = new Map();

    try {
        const stats = await prisma.review.groupBy({
            by: ['productId'],
            where: { productId: { in: productIds } },
            _avg: { rating: true },
            _count: { rating: true },
        });

        if (Array.isArray(stats)) {
            stats.forEach((s: any) => {
                const avg = s?._avg?.rating ?? s?.rating ?? 0;
                const count = typeof s?._count === "object"
                    ? (s._count.rating ?? s._count.id ?? s._count._all ?? 0)
                    : (Number(s?._count) || 0);

                statsMap.set(s.productId, {
                    averageRating: avg ? Number(Number(avg).toFixed(1)) : 0,
                    totalReviews: count
                });
            });
        }
    } catch (err) {
        console.error("Error in getBulkProductRatingStats:", err);
    }

    return statsMap;
}

/**
 * Get average rating + total reviews for a product
 */
export async function getProductRatingStats(productId: number) {
    try {
        const reviewStats = await prisma.review.aggregate({
            where: { productId },
            _avg: { rating: true },
            _count: { rating: true },
        });

        const avg = reviewStats?._avg?.rating ?? 0;
        const count = typeof reviewStats?._count === "object"
            ? (reviewStats._count.rating ?? reviewStats._count.id ?? reviewStats._count._all ?? 0)
            : (Number(reviewStats?._count) || 0);

        return {
            averageRating: avg ? Number(Number(avg).toFixed(1)) : 0,
            totalReviews: count,
        };
    } catch (err) {
        console.error("Error in getProductRatingStats:", err);
        return { averageRating: 0, totalReviews: 0 };
    }
}
