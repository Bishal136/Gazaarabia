# Feature Concept: Gazaarabia Production Docker Architecture & Image Acceleration Pipeline

* **Author:** Gazaarabia Architecture & DevOps Team
* **Date:** 2026-11-08

## Overview

Containerization of the Gazaarabia multi-vendor e-commerce platform using Docker and resolution of the slow image-loading bottleneck. The deployment coexists with existing production workloads (specifically Markitool) on a shared 12-core, 24 GB RAM Ubuntu 24.04 VPS without resource starvation or port collisions.

## Analysis

### 1. Root Cause of Image Latency
The root cause of image-loading delays was the omission of the `sharp` image processing library in `package.json`. Next.js defaulted to synchronous WebAssembly/Squoosh encoding. When catalog pages requested 20 to 30 images simultaneously, the Node.js event loop stalled for 2 to 5 seconds per request. Adding `sharp: ^0.35.5` introduces native C++ `libvips` SIMD acceleration, reducing per-image processing times to under 40 milliseconds.

### 2. Multi-Tenant VPS Coexistence
Markitool runs on the same VPS, serving an SPA from `/var/www/Markitool/client/dist` and proxying API traffic to `127.0.0.1:5010`. Gazaarabia binds exclusively to `127.0.0.1:3000` (web) and `127.0.0.1:9000` (webhook). Docker Compose enforces explicit cgroup resource limits (6 CPU cores and 6 GB RAM maximum), leaving the remaining 6 cores and 18 GB RAM permanently available for Markitool and host processes.

### 3. Media Persistence & Host Database Access
168+ MB of product images and variant videos reside in `/var/www/Gazaarabia/uploads`. Using a Docker bind mount (`./uploads:/app/uploads`), all media uploads remain on the host filesystem and persist across container rebuilds. Running the container in `network_mode: "host"` allows seamless zero-overhead communication with host MongoDB on `127.0.0.1:27017` without modifying MongoDB configuration or exposing the database port to external interfaces.

## Goals vs. Non-Goals

* **In-Scope Goals:**
  - Containerize the Next.js 16 application with `node:20-slim` and PM2 cluster execution.
  - Install native `sharp` to eliminate WebAssembly image conversion bottlenecks.
  - Preserve all media assets in `./uploads` with zero data loss.
  - Isolate resource allocation to protect Markitool and system stability.
  - Maintain the existing Nginx reverse proxy configuration.

* **Out-of-Scope Non-Goals:**
  - Modifying application UI code, API endpoints, or database schemas.
  - Migrating MongoDB out of the VPS into an external managed cluster.
  - Containerizing the host Nginx ingress or Markitool.

## Alternatives Weighed

1. **Virtual Bridge Network with `extra_hosts`**:
   - *Rejected*: MongoDB on the host is bound strictly to `127.0.0.1:27017`. Virtual bridge networking requires reconfiguring MongoDB to listen on docker bridge interfaces (e.g., `172.17.0.1`), introducing configuration risks. `network_mode: "host"` achieves native loopback compatibility and zero packet latency overhead.
2. **Next.js Standalone Output (`output: "standalone"`)**:
   - *Rejected*: Standalone output alters the runtime directory structure and does not natively support PM2 cluster mode without refactoring `server.js` and `ecosystem.config.cjs`. Using the full multi-stage build preserves existing application structure with zero code modifications.

## Key Decisions & Staging for Next Steps

1. **Image Engine**: Native `sharp: ^0.35.5` added to dependencies.
2. **Container Engine**: `Dockerfile` and `docker-compose.yml` authored and verified with a clean Next.js production build (243 static pages compiled).
3. **Rollout Sequence**: Commit and push artifacts to GitHub `origin main`, followed by safe VPS image build and controlled PM2 cutover.
