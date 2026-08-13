FROM node:22-slim

# Install Chromium for Puppeteer-based web scraping
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-noto-cjk \
    fonts-liberation \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy all source
COPY . .

# Install dependencies and build
RUN npm install -g corepack@latest && corepack pnpm install && corepack pnpm run build

# Production settings
ENV NODE_ENV=production

# The platform injects PORT at runtime
CMD ["node", "dist/index.js"]
