# ==============================================================================
# Gazaarabia Next.js Production Container
# Isolated Node 20 LTS Runtime with Native Sharp Image Acceleration & PM2 Cluster
# ==============================================================================

FROM node:20-slim AS runner

WORKDIR /app

# Install curl for container health check & necessary system tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install PM2 globally for production cluster mode within container
RUN npm install -g pm2

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 1. Install dependencies (copy package manifests and scripts for postinstall hooks)
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci --include=dev

# 2. Copy source code
COPY . .

# 3. Build Next.js application & precompress assets (runs copy-tinymce + next build + precompress-assets)
RUN npm run build

# 4. Prune development dependencies
RUN npm prune --omit=dev

# 5. Ensure uploads and logs directory structure exists
RUN mkdir -p /app/uploads /app/logs

EXPOSE 3000 9000

# Start using existing ecosystem.config.cjs
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
