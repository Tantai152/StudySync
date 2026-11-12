# === Stage 1: cài dependencies ===
FROM node:20-alpine AS deps
WORKDIR /app
# Prisma engine cần OpenSSL để chạy trên Alpine
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# === Stage 2: build (prisma generate + tsc) ===
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Sinh Prisma Client trước khi compile TypeScript
RUN npx prisma generate
RUN npm run build

# === Stage 3: runner (chỉ chứa dist + production deps) ===
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Prisma engine cần OpenSSL để chạy trên Alpine
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["npm", "run", "start"]
