# Use regular Node.js 18 (not Alpine) for better Prisma compatibility
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies (including dev deps for build)
RUN npm ci

# Copy source code
COPY . .

# Copy screenshots from frontend public directory
COPY public/screenshots ./public/screenshots

# Generate Prisma client only (run TS with tsx at runtime)
RUN npm run db:generate && npm run build:production

# Expose default app port (App Service uses PORT env var at runtime)
EXPOSE 3002

# Start with tsx (runs TypeScript directly)
CMD ["sh", "-c", "NODE_ENV=production node dist/app.js"]