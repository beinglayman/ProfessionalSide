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

# Generate Prisma client and build (skip TS errors for production)
RUN npm run build:production

# Remove dev dependencies for smaller production image
RUN npm ci --only=production && npm cache clean --force

# Expose port (Railway uses PORT env var)
EXPOSE $PORT

# Start the application
CMD ["npm", "run", "start:production"]