# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (Railway uses PORT env var)
EXPOSE $PORT

# Start the application
CMD ["sh", "-c", "npm run preview -- --host 0.0.0.0 --port ${PORT:-4173}"]