# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Cài openssl cho Prisma
RUN apk add --no-cache openssl

# Copy file package để cài dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Cài toàn bộ dependencies (bao gồm cả devDeps để build TS)
RUN npm ci

# Copy toàn bộ source code
COPY . .

# Generate Prisma Client và Build TypeScript
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner (Production)
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

# Copy package.json và package-lock.json
COPY --from=builder /app/package*.json ./

# Cài CHỈ production dependencies
RUN npm ci --omit=dev

# Copy thư mục dist (code đã build) và prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Render inject PORT động (mặc định 10000)
EXPOSE 10000

# Chạy app
CMD ["npm", "run", "start"]