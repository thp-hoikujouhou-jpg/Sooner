# Railway / any host: git is required for POST /api/projects/clone and git push/pull.
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production

# Railway sets PORT at runtime; server reads process.env.PORT
CMD ["npm", "start"]
