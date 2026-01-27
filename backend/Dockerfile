# Use regular Node.js 18 (not Alpine) for better Prisma compatibility
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies (including dev deps for build)
# Use public registry explicitly to avoid corporate proxy issues in ACR builds
RUN npm ci --registry https://registry.npmjs.org

# Copy source code
COPY . .

# Generate Prisma client only
RUN npm run db:generate

# Expose port (Railway uses PORT env var)
EXPOSE $PORT

# Start with tsx (runs TypeScript directly, no build needed)
# Run migrations on startup, then start the app
CMD ["sh", "-c", "npm run db:migrate:deploy && NODE_ENV=production npx tsx src/app.ts"]