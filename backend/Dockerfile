# Use official Playwright base image with Node.js & pre-installed browsers
FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Install matching Chromium browser binary for Playwright
RUN npx playwright install chromium

# Generate Prisma client
RUN npx prisma generate

# Copy application source
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 3001

# Environment defaults
ENV PORT=3001
ENV NODE_ENV=production

# Run database migrations and start server
CMD ["sh", "-c", "npx prisma db push && npm start"]
