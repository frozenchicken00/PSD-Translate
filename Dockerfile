FROM node:18-alpine AS base

# Install dependencies needed for Prisma
RUN apk add --no-cache libc6-compat

# Create app directory
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Build the app
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY service-account.json ./service-account.json

# Set environment variables
ENV NODE_ENV production

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/service-account.json ./service-account.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Set the correct permission for the service account file
USER root
RUN chmod 600 ./service-account.json
USER nextjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]