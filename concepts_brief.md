# Feature Concept: Dynamic 'You May Also Like' Engine & Interactive Product Recommendations

* **Author:** Gazaarabia Engineering & Frontend UX Team
* **Date:** 2026-11-11
* **Status:** Resolved & Verified

## Overview

Investigation, root-cause bug isolation, and technical refactoring of the "You may also like" product recommendation carousel on the Gazaarabia Product Details page (`/products/[slug]`). The audit resolved a fatal React infinite re-render crash (`Maximum update depth exceeded`), established a dedicated dynamic backend recommendation endpoint (`/api/front-end/product/[slug]/related`), connected interactive color swatches that switch variant images on click, and wired the "Add to Bag" button directly to the Cart Context and slide-over Cart Drawer.

## Root Cause Analysis: 'Maximum update depth exceeded'

* **Failing File & Line:** `src/components/ProductSuggestions.tsx:47`
* **Trigger Mechanism:**
  `ProductSuggestions` declared a default parameter `recentlyViewed = []`. In React, when `ProductDetails.tsx` rendered `<ProductSuggestions wearWith={...} hideHeader={true} />` without supplying `recentlyViewed`, a new empty array literal (`[]`) was allocated in memory on every render.
  `ProductSuggestions` included `useEffect(..., [recentlyViewed])`. Because `[] !== []` by object identity, this effect ran on every single render and called `setRecent(list)`. Calling `setRecent` scheduled another render, creating an unconditional infinite update cycle that crashed the client with `Maximum update depth exceeded`.
* **Remediation:**
  1. The localStorage reader effect in `ProductSuggestions.tsx` was decoupled from the prop and scoped to run strictly once on mount with an empty dependency array (`[]`).
  2. The redundant duplicate state `const [wearWithProducts, setWearWithProducts] = useState(wearWith)` with a reactive syncing `useEffect` was replaced with a clean `useMemo` pipeline and client fallback.

## Implementation Details

### 1. Dedicated Dynamic Recommendation Endpoint
* **File:** [src/app/api/front-end/product/[slug]/related/route.ts](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/app/api/front-end/product/[slug]/related/route.ts)
* **Algorithm:**
  1. Identifies the active product by slug.
  2. Queries curated "Wear With" associations (`asParentRelations`).
  3. Fills remaining quota (up to 10 items) by matching `subcategoryId`, then `categoryId`, strictly excluding the active product (`id != activeProduct.id`).
  4. Returns rich variant metadata including `color.hexCode`, `variantImages`, `availableStock`, and wishlist status for logged-in users.

### 2. Interactive Color Swatches & Image Swapping
* **File:** [src/components/SingleImgMultiColorsProductCard.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/components/SingleImgMultiColorsProductCard.tsx)
* **Mechanism:**
  - Swatches are interactive `<button>` elements with `selectedColor` state.
  - Clicking a swatch updates `displayImg` to the variant image corresponding to that color hex code and renders an active focus ring (`ring-2 ring-[var(--brand-primary)]`).

### 3. Functional 'Add to Bag' Action & Cart Drawer Confirmation
* **File:** [src/components/ProductSuggestions.tsx](file:///home/bishal/BishalHome/Cours/Ecommarce/Gazaarabia/src/components/ProductSuggestions.tsx)
* **Mechanism:**
  - Consumes `useCart()` (`refreshCart` and `openCartDrawer`).
  - Calls `cartService.add()` targeting the selected color variant or first in-stock variant.
  - Automatically refreshes the global cart counter and slides out `CartDrawer` with visual confirmation ("Added to Bag").
