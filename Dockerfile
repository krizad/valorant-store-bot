FROM node:20-alpine

# Install libc6-compat and build tools for native Skia @napi-rs/canvas & better-sqlite3 module support on Alpine
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /usr/app

# Copy dependency specifications first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install production dependencies inside the container
RUN npm ci --omit=dev

# Copy all current source code (respecting .dockerignore)
COPY . .

# Set environment
ENV NODE_ENV=production

# Expose HTTP Keep-Alive & Web Auth Portal port
EXPOSE 3000

# Start bot
CMD ["node", "SkinPeek.js"]
