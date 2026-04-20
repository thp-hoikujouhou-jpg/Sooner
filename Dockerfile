# Railway / any host: git is required for POST /api/projects/clone and git push/pull.
FROM node:20-bookworm-slim

# node-pty compiles via node-gyp: needs Python + a C++ toolchain (prebuilds are not always present).
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    git ca-certificates \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production

# Railway sets PORT at runtime; server reads process.env.PORT
CMD ["npm", "start"]
