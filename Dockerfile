# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install all dependencies (including dev deps for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (Railway uses PORT env var)
EXPOSE 4173

# Start the application with fallback port
CMD ["sh", "-c", "PORT=${PORT:-4173} npm run preview -- --host 0.0.0.0 --port $PORT"]