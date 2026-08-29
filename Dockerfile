# Dockerfile

# Name

# Build stage
FROM node:22-alpine AS builder

WORKDIR /usr/evonest

# Install system dependencies for image processing
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    pkgconfig \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies with the lockfile and relaxed peer resolution
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Stub env vars required at module-load time during next build.
# These are NOT the real values — runtime values come from docker-compose.
ENV MONGODB_URI=mongodb://placeholder:27017 \
    STORAGE_PATH=/tmp/placeholder

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /usr/evonest

# Install system dependencies for image processing in production
RUN apk add --no-cache \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    pixman \
    gcompat \
    libc6-compat

# Copy package files from builder
COPY --from=builder /usr/evonest/package*.json ./

# Copy node_modules from builder (includes compiled canvas)
COPY --from=builder /usr/evonest/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /usr/evonest/.next ./.next
COPY --from=builder /usr/evonest/public ./public

# Set environment variables
ENV NOTIFICATIONS_URL=https://raw.githubusercontent.com/daniele-liprandi/EvoNEST-news/refs/heads/main/notifications.json

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -q --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]