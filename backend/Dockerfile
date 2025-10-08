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

# Generate Prisma client only
RUN npm run db:generate

# Expose port (Railway uses PORT env var)
EXPOSE $PORT

# Start with tsx (runs TypeScript directly, no build needed)
# Run migrations on startup, then start the app
CMD ["sh", "-c", "npm run db:migrate:deploy && NODE_ENV=production npx tsx src/app.ts"]