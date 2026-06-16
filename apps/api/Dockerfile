# API container — build context must be the REPO ROOT:
#   docker build -f apps/api/Dockerfile -t gc4s-api .
# Works on Railway, Fly.io, Cloud Run, or any container host.
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install deps (workspace-aware)
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm install

# Build shared + API and generate Prisma client
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build:shared \
  && npm run prisma:generate -w @gc4s/api \
  && npm run build -w @gc4s/api

ENV NODE_ENV=production
EXPOSE 4000

# Apply migrations on boot, then start the server.
CMD ["sh", "-c", "npm run prisma:deploy -w @gc4s/api && npm run start -w @gc4s/api"]
