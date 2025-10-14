# Use Node.js 18 (standard glibc) for better compatibility with native modules
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install all dependencies (including dev deps for build)
RUN npm ci --include=optional

# Copy source code
COPY . .

# Accept build argument for API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the application
# If rollup binary issues occur, install platform-specific binary first
RUN npm run build || (npm install @rollup/rollup-linux-x64-gnu --save-dev && npm run build)

# Change ownership to node user
RUN chown -R node:node /app

# Expose port (Railway uses PORT env var)
EXPOSE 4173

# Set working user for Railway
USER node

# Start the application directly
CMD ["npm", "run", "preview"]