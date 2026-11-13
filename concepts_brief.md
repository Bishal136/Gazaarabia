# Product Discount Pricing System: Seller Form & Storefront Architecture

* **Author:** Antigravity (EGM Brainstorm)
* **Date:** 2026-11-13
* **Status:** Initial Brainstorm & Problem Definition

## Overview

Gazaarabia currently displays single flat prices (e.g., £60.00) across the storefront without e-commerce discount mechanics (regular price strikethrough, discounted sale price, or percentage-off badges). Furthermore, the Seller Panel product form only exposes "Selling Price" and "Cost Price" fields, preventing sellers from running sales, promotional markdowns, or seasonal discounts.

This initiative introduces an end-to-end discount pricing workflow:
1. Enabling sellers in the Seller Panel product form to set regular pricing alongside promotional sale pricing or percentage discounts.
2. Propagating promotional pricing through to the storefront Product Details page, product cards, cart drawer, and checkout pipeline.
3. Rendering strikethrough original prices and dynamic percentage-off badges.

---

## Analysis & Current Codebase Audit

### 1. Database Schema (`prisma/schema.prisma`)
* The `products` collection already includes:
  * `costPrice`: Float? (Wholesale cost to seller)
  * `sellingPrice`: Float (Currently used as the active price)
  * `discountPrice`: Float? (Present in schema, partially supported in API routes, but unexposed in Seller Form UI)
* The `productvariant` collection currently includes:
  * `price`: Float (Active variant price)
  * `compareAtPrice`: Float? (Present in schema, but not exposed in the variant editor)

### 2. Seller Product Form (`src/app/seller/(dashboard)/products/form/[[...id]]/page.tsx`)
* Lines 760–788 expose only two text fields: "Selling Price" and "Cost Price".
* `discountPrice` exists in internal state (`form.discountPrice`) and is mapped in `src/app/api/seller/products/route.ts`, but has zero user-facing inputs or calculation helpers.
* Sellers cannot currently input a discount percentage or sale price.

### 3. Product Details Page (`src/app/(site)/products/[slug]/ProductDetails.tsx`)
* Lines 827–839 calculate `displayPrice` and `originalPrice`.
* If variants exist, `selectedVariant.price` overrides `displayPrice`. Because variants currently lack compare-at pricing or discount association, `originalPrice` resolves to null, rendering a plain single price with no discount badge or strikethrough.

### 4. Product Cards & Search
* `src/components/ProductCard.tsx` lines 320–335 have basic conditional rendering for `product.discountPrice < product.sellingPrice`, but lack visual discount percentage badges (e.g., `-25%` or `SALE`) on the card image.

---

## Goals vs. Non-Goals

### In-Scope Goals:
* **Seller Form Upgrade**: Add intuitive inputs for "Regular Price" (Original Price) and "Sale Price" (Discounted Price), plus a dynamic Discount Percentage toggle/calculator (changing discount % updates sale price, and vice versa).
* **Variant Consistency**: Ensure variant pricing properly reflects the discount status (either inherited from product-level discount percentage or specified per variant).
* **Product Details UI**: Display the active discounted price prominently, strikethrough original price, and a styled `% OFF` badge (e.g., `Save 20%`).
* **Catalog & Cards**: Add badge overlays (`-X% OFF`) and strikethrough prices across ProductCard grids, Trending Now, and Search.
* **Cart & Checkout Invariant**: Ensure the customer is billed strictly the discounted price, and commission is calculated accurately on the final transaction amount.

### Out-of-Scope Non-Goals:
* Flash-sale countdown timers with automated expiry schedules (to be handled in a separate campaign engine).
* Coupon code application engine (coupons are already handled separately via `/api/coupons`).

---

## Alternatives Weighed

1. **Product-Level Global Discount vs. Variant-Level Compare-At Price**:
   * *Alternative A*: Purely product-level `discountPrice`. Simple, but breaks if variants have differing prices (e.g., Size XXL costs more than S).
   * *Alternative B*: Percentage-based discount applied uniformly to all variants, or supporting `compareAtPrice` per variant in `VariantsTikTokStyle.tsx`.
2. **Field Semantics (`sellingPrice` vs `discountPrice`)**:
   * *Convention 1*: `sellingPrice` = Original/Regular Price, `discountPrice` = Reduced Sale Price. If `discountPrice` is null/empty, active price is `sellingPrice`.
   * *Convention 2*: `sellingPrice` = Active Price, `originalPrice` / `compareAtPrice` = Strikethrough Reference.
   * Currently, existing codebase components (`ProductCard.tsx`, `trendingNow.tsx`, `bestSellers.tsx`) follow Convention 1: `discountPrice` is the reduced price and `sellingPrice` is the regular price.

---

## Open Design Questions for Clarification

1. How should discounts interact with product variants when variants have different base prices?
2. Should the seller input be bi-directional (entering either a discounted price in GBP or a discount percentage)?
3. Should the discount badge display the exact percentage savings (e.g., `25% OFF`) or a general `SALE` badge, or both?
