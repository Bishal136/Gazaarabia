# ==============================================================================
# GAZAARABIA — DEVELOPER ONBOARDING & CODEBASE QUICKSTART GUIDE
# ==============================================================================
# Target: Full-Stack Engineers & DevOps Onboarding to Gazaarabia
# Companion Guide to: docs/PROJECT_ARCHITECTURE.md
# ==============================================================================

Welcome to the **Gazaarabia** codebase. This guide gets you up and running locally within 5 minutes and outlines essential development commands, testing workflows, and common tasks.

For full architectural blueprints, entity-relationship diagrams, and multi-tenant flows, read the primary guide:
👉 **[PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)**

---

## 1. Prerequisites

Ensure your development environment meets the following specifications:
- **Node.js**: `v20.x` or `v22.x` LTS
- **npm**: `v10.x` or later
- **MongoDB**: `v6.0+` or `v7.0+` running locally on `127.0.0.1:27017` (or via Docker)
- **Git**: Installed and configured

---

## 2. Local Environment Setup

### 2.1 Clone and Install Dependencies
```bash
git clone git@github.com:Bishal136/Gazaarabia.git
cd Gazaarabia

# Install dependencies (runs scripts/copy-tinymce.mjs automatically)
npm install
```

### 2.2 Configure Environment Variables
Copy the template configuration:
```bash
cp .env.example .env.local
```

Ensure the key variables are configured:
```ini
MONGODB_URI="mongodb://127.0.0.1:27017/gazaarabia"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-key-at-least-32-chars-long"
PORT=3000
NODE_ENV="development"
```

### 2.3 Seed Initial Database Data
To populate fresh categories, subcategories, products, and admin accounts:
```bash
# 1. Enforce performance & TTL indexes on MongoDB
npx tsx scripts/ensure-indexes.ts

# 2. Seed administrative credentials
npm run seed:admin

# 3. Seed verified modest wear catalog & images
npm run seed:catalog
```

---

## 3. Development Workflow

### 3.1 Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3.2 Key Local Portals & URLs

| Portal | Local URL | Default Test Account |
| :--- | :--- | :--- |
| **Marketplace Storefront** | `http://localhost:3000` | Public browsing / Guest |
| **Admin Dashboard** | `http://localhost:3000/admin/login` | `info@gazaarabia.com` / Admin |
| **Seller Portal** | `http://localhost:3000/seller/login` | `seller@gazaarabia.com` |
| **Affiliate Dashboard** | `http://localhost:3000/affiliate/login` | Registered affiliate account |
| **API Health Check** | `http://localhost:3000/api/health` | HTTP 200 JSON status |

---

## 4. Common Scripts & Tooling

All available scripts from `package.json`:

```bash
# Development
npm run dev                   # Starts Next.js development server with Turbopack

# Production Build
npm run build                 # Copies TinyMCE and runs Next.js production build
npm run postbuild             # Precompresses assets into .gz and .br for Nginx
npm run start                 # Runs production build locally

# Database Seeding & Maintenance
npm run seed:admin            # Creates default platform superadmin account
npm run seed:catalog          # Seeds verified products, categories & variants
npm run db:migrate:mongo      # Migrates historical SQL fixtures into MongoDB collections

# Testing & Verification
npm run test:auth             # Comprehensive NextAuth & JWT token test suite
npm run test:blogs            # Blog and CMS functionality verification
npm run test:hunter           # Automated bug detection & integrity scanner
npm run check                 # Full-stack MongoDB connectivity and health audit
```

---

## 5. Working with Media & Uploads

- All uploaded product images, variant videos, and banners are stored in the root `./uploads/` directory.
- In production, Nginx serves `/uploads/` directly from disk with kernel `sendfile` (bypassing Node.js).
- For Next.js dynamic image transformations (`/_next/image`), **`sharp`** is installed and used automatically.
- Variant videos are served with HTTP 206 Partial Content support (`src/app/uploads/[...path]/route.ts`) to enable video scrubbing.

---

## 6. Docker & Production Deployment

To run the containerized application locally or test production behavior:

```bash
# 1. Build and run in background
docker compose up -d --build

# 2. Inspect logs
docker logs -f gazaarabia-production

# 3. Stop container
docker compose down
```

For complete VPS architecture, shared-host isolation rules (Markitool), and Nginx reverse proxy tunings, see:
- [DOCKER_SETUP_PLAN.md](../DOCKER_SETUP_PLAN.md)
- [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)
- [CLOUDFLARE_CDN_SETUP.md](./CLOUDFLARE_CDN_SETUP.md)
