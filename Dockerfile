# Start from official Node.js 20 LTS (Bookworm Slim) for smaller image size
FROM node:20-bookworm-slim AS base

# 1. Dependencies
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./ 

# Install dependencies (ci for clean install)
RUN npm ci

# 2. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build time
ENV NEXT_TELEMETRY_DISABLED 1
# Increase memory limit for node during build if needed
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Limit npm parallel jobs to prevent OOM
ENV npm_config_jobs=2

# Run build
RUN npm run build

# 3. Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Next.js standalone output (requires output: 'standalone' in next.config.js/mjs)
# If not using standalone, might need to copy .next, public, package.json, etc.
# For now assuming standard build.

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# Note: You need to set "output: 'standalone'" in next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
