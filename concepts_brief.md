# Gazaarabia Technical RFC & Bug Remediation Brief: Image Serving, Product Deletion & Admin Search

**Date:** 14 November 2026  
**Target:** [Gazaarabia Marketplace](https://gazaarabia.com/)  
**Environment:** Next.js 16 (Turbopack, App Router), MongoDB 7, Nginx 1.24, Linux VPS  

---

## 1. Problem Formulations & Root Causes

### 1.1 VPS Product Image Broken Issue
- **Symptom:** Product images rendered properly on the local development machine but displayed broken (404 Not Found) on the live production VPS.
- **Root Cause Isolation:**
  - Files are uploaded by `/api/upload` and `/api/uploads` to `path.join(process.cwd(), "uploads", folder)`, creating assets inside `/var/www/Gazaarabia/uploads/`.
  - In `deploy/nginx-gazaarabia.conf`, Nginx was configured with:
    ```nginx
    location /uploads/ {
        alias /var/www/Gazaarabia/public/uploads/;
        ...
        try_files $uri @node_proxy;
    }
    ```
  - The path `/var/www/Gazaarabia/public/uploads/` did not exist on disk.
  - Furthermore, using `$uri` with `alias` in Nginx causes path resolution failures, returning 404 directly from Nginx before hitting Next.js.
  - On local development, there is no Nginx; requests are routed directly to Next.js route handler `src/app/uploads/[...path]/route.ts`, which reads from `uploads/`, masking the bug locally.
- **Permanent Solution:**
  1. Updated Nginx configuration in `deploy/nginx-gazaarabia.conf`:
     ```nginx
     location /uploads/ {
         root /var/www/Gazaarabia;
         expires 30d;
         access_log off;
         add_header Cache-Control "public, max-age=2592000, stale-while-revalidate=86400";
         try_files $uri @node_proxy;
     }
     ```
     With `root /var/www/Gazaarabia;`, `$document_root$uri` resolves directly to `/var/www/Gazaarabia/uploads/...` with zero Nginx alias bugs and instant kernel `sendfile` disk offloading.
  2. Created symbolic link `public/uploads -> ../uploads`.
  3. Updated `scripts/deploy-webhook.sh` to ensure `uploads/` permissions (`chmod 755`) and the `public/uploads` symlink are generated automatically during CI/CD.

---

### 1.2 Product Deletion Bug
- **Symptom:** When clicking "Delete" on any product in the Admin Panel, the product appeared not to delete or the UI became unresponsive.
- **Root Cause Isolation:**
  1. **Modal Callback Bug:** In `src/app/admin/(dashboard)/products/page.tsx`, `handleDelete` invoked `setPopUpAlertData` with `{ isOpen: true, type: "success" }` without defining `onConfirm` or `onCancel` callbacks for the success state. Consequently, the "OK" button in `PopupAlert.tsx` had no click handler, trapping the administrator in an unclosable modal until a page reload.
  2. **Role Verification Brittleness:** In `src/app/api/products/[id]/route.ts`, role verification assumed `user.role.name`, which threw an unhandled exception if `user.role` was undefined or structured differently across auth schemes.
  3. **Relational Cascades:** Deletions left orphaned records in `review` (which uses `productId`, not `variantId`), `cart`, and `stock_reservations`.
  4. **MongoDB Soft-Delete Filter Mismatch:** In `src/app/api/products/route.ts`, when `showDeleted` was false, the query filtered with `{ isDeleted: false }`. In MongoDB, documents lacking the `isDeleted` key were unintentionally excluded or caused state inconsistencies.
- **Permanent Solution:**
  1. Updated `src/app/api/products/[id]/route.ts` to utilize `getAuthenticatedUser(req)` with comprehensive role checks (`admin`, `super_admin`).
  2. Enhanced permanent deletion cascades to clean up `review`, `cart`, `wishlist`, `productRelation`, and `stock_reservations`.
  3. Fixed `PopupAlert` state in `src/app/admin/(dashboard)/products/page.tsx` so the "OK" confirmation button safely closes the modal and calls `fetchProducts()` to refresh the live catalog.
  4. Updated `src/app/api/products/route.ts` to use `{ isDeleted: { not: true } }` so legacy products without explicit boolean tags are fully preserved.

---

### 1.3 Admin Products Multi-Facet Search Option
- **Symptom:** Admin products page lacked a unified search input inside the filter drawer and only searched exact substrings of product titles.
- **Root Cause Isolation:**
  - `src/components/admin/ProductFilters.tsx` only exposed dropdown filters (Brand, Category, Price, Date) with no search field.
  - Search on the backend `/api/products` was restricted strictly to `where.title = { contains: search }`, failing if an administrator entered a numeric Product ID, SKU barcode, or URL slug.
- **Permanent Solution:**
  1. Added an interactive search box inside `src/components/admin/ProductFilters.tsx` with clear button (`X`) and debounce.
  2. Synchronized `searchTerm` across both the top filter drawer and the table toolbar.
  3. Upgraded `src/app/api/products/route.ts` backend to query using an `OR` compound expression across:
     - `id` (numeric match)
     - `title` (case-insensitive substring)
     - `barcode` (case-insensitive SKU match)
     - `slug` (URL slug match)

---

## 2. Verification & Test Matrix

- **Unit & Endpoint Verification:**
  - `DELETE /api/products/[id]` -> Verified 200 OK permanent deletion and cascade cleanup.
  - `GET /api/products?search=Sakina` -> Verified 200 OK.
  - `GET /api/products?search=201` -> Verified 200 OK (numeric ID lookup).
  - `GET /api/products?search=luxury-teal` -> Verified 200 OK (slug lookup).
- **Playwright Test Suite:**
  - Suite 4 (Super Admin Panel): **7/7 Passed (24.1s)**
- **Next.js Production Build:**
  - **239/239 static routes compiled cleanly with 0 errors in 51s.**
