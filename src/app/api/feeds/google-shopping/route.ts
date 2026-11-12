import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await prisma.products.findMany({
      where: {
        active: true,
        isDeleted: false,
      },
      include: {
        productimage: {
          orderBy: { primary: "desc" },
        },
        productvariant: true,
        category: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const baseUrl = "https://gazaarabia.com";

    const itemsXml = products
      .map((product) => {
        const primaryImage =
          product.productimage?.find((img) => img.primary)?.url ||
          product.productimage?.[0]?.url ||
          "";

        const fullImageUrl = primaryImage.startsWith("http")
          ? primaryImage
          : `${baseUrl}${primaryImage.startsWith("/") ? "" : "/"}${primaryImage}`;

        const totalStock = product.productvariant.reduce(
          (sum, v) => sum + (v.stock || 0),
          0
        );
        const availability = totalStock > 0 ? "in_stock" : "out_of_stock";

        // Clean description of HTML tags
        const rawDesc = product.shortDescription || product.description || product.title;
        const cleanDesc = rawDesc
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 5000);

        const price = (product.price || 0).toFixed(2);

        return `
    <item>
      <g:id>${product.id}</g:id>
      <g:title><![CDATA[${product.title}]]></g:title>
      <g:description><![CDATA[${cleanDesc}]]></g:description>
      <g:link>${baseUrl}/products/${product.slug}</g:link>
      <g:image_link>${fullImageUrl}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price} GBP</g:price>
      <g:brand>Gazaarabia</g:brand>
      <g:condition>new</g:condition>
      ${product.category?.name ? `<g:product_type><![CDATA[${product.category.name}]]></g:product_type>` : ""}
    </item>`;
      })
      .join("");

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Gazaarabia Products Feed</title>
    <link>${baseUrl}</link>
    <description>Official Google Shopping product catalog for Gazaarabia</description>
    ${itemsXml}
  </channel>
</rss>`;

    return new NextResponse(rssXml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("Google Shopping Feed Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate Google Shopping feed" },
      { status: 500 }
    );
  }
}
