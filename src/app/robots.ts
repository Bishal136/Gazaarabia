import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/api/feeds/",
          "/api/header",
          "/api/front-end/",
          "/api/blogs",
          "/api/blog-categories",
          "/api/faqs",
          "/api/faq-categories",
        ],
        disallow: [
          "/admin/",
          "/seller/",
          "/affiliate/",
          "/ambassador/",
          "/shopify/",
          "/api/admin/",
          "/api/seller/",
          "/api/affiliates/",
          "/api/ambassadors/",
          "/api/auth/",
          "/api/chat/",
          "/api/stripe/",
          "/api/webhooks/",
          "/api/orders/",
          "/api/payouts/",
          "/api/users/",
          "/api/account/",
          "/cart",
          "/checkout",
          "/account/",
          "/orders/",
          "/order-success/",
          "/payment/",
          "/wishlist",
          "/forgot-password",
          "/reset-password",
          "/unauthorized",
          "/private/",
          "/server/",
        ],
      },
    ],
    sitemap: "https://gazaarabia.com/sitemap.xml",
  };
}
