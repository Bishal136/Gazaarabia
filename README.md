# Gazaarabia — Multi-Vendor Modest Wear Marketplace

> High-performance Next.js 16 multi-vendor modest fashion e-commerce marketplace powered by React 19, TypeScript, MongoDB, and Docker.

---

## 📖 Architectural & Developer Documentation

Comprehensive documentation has been prepared to guide both human developers and autonomous AI assistants:

*   🏛️ **[docs/PROJECT_ARCHITECTURE.md](./docs/PROJECT_ARCHITECTURE.md)**: Master architectural guide detailing frontend-to-backend flows, the Universal Prisma-to-MongoDB adapter, NextAuth RBAC, Mongoose schemas, and multi-tenant commission pipelines.
*   🚀 **[docs/CODEBASE_GUIDE.md](./docs/CODEBASE_GUIDE.md)**: Developer quickstart, environment setup, database seeding, and testing scripts.
*   🐳 **[DOCKER_SETUP_PLAN.md](./DOCKER_SETUP_PLAN.md)**: Production containerization blueprints, cgroup resource limits, and shared-VPS isolation specifications (Markitool coexistence).
*   🌐 **[docs/CLOUDFLARE_CDN_SETUP.md](./docs/CLOUDFLARE_CDN_SETUP.md)**: Edge CDN caching rules, HTTP/2 & HTTP/3 tuning, and DDoS mitigation runbooks.

---

## ⚡ Quickstart

### Prerequisites
*   Node.js 20+ LTS
*   MongoDB 7.0+ (running locally on port 27017 or via Docker)

### Installation & Run
```bash
# 1. Install dependencies (auto-copies self-hosted TinyMCE)
npm install

# 2. Configure environment
cp .env.example .env.local

# 3. Seed verified product catalog and performance indexes
npx tsx scripts/ensure-indexes.ts
npm run seed:catalog

# 4. Start development server with Turbopack
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the storefront.

---

## 🛠️ Key Technology Stack

*   **Frontend**: Next.js 16 (App Router / Turbopack), React 19, Tailwind CSS 3.4, Emotion/MUI, Radix UI.
*   **Backend & APIs**: Next.js Route Handlers (`src/app/api/*`), HTTP 206 video range streaming.
*   **Database**: MongoDB 7.0+ via Mongoose 9.11 + Universal Prisma Adapter (`src/lib/prisma-mongo.ts`).
*   **Image Processing**: Native C++ `libvips` SIMD engine via `sharp: ^0.35.5`.
*   **Authentication**: NextAuth.js v4 (JWT-based session authentication with multi-role RBAC).
*   **Payments**: Stripe (Payment Intents & Saved Cards), PayPal Smart Buttons, Cash on Delivery (COD).
*   **Production Deployment**: Docker Compose (`network_mode: "host"`), PM2 Cluster (4 instances), Nginx Reverse Proxy.

---

## 📜 Verification & Testing

```bash
npm run test:auth      # Complete NextAuth, JWT & OTP verification suite
npm run test:blogs     # Editorial CMS and blog functionality audit
npm run test:hunter    # Fullstack automated bug hunting & integrity check
npm run check          # Full-stack MongoDB connectivity and health audit
```
