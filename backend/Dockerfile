# Use Node.js 18 Alpine
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies (including dev deps for build)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client only
RUN npm run db:generate

# Expose port (Railway uses PORT env var)
EXPOSE $PORT

# Start with tsx (runs TypeScript directly, no build needed)
CMD ["sh", "-c", "npm run db:migrate:deploy && npx tsx src/app.ts"]