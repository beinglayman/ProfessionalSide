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

# Ensure startup script is executable
RUN chmod +x startup.sh

EXPOSE $PORT

# Startup: run migrations, verify tables, start app
CMD ["./startup.sh"]