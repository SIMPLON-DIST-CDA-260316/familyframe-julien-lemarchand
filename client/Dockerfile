FROM node:24.22-alpine3.24 AS base

RUN corepack enable && pnpm --version

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

COPY package.json ./

FROM base AS deps

RUN pnpm install

FROM deps AS dev

COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html components.json ./
COPY public public
COPY src src

EXPOSE 5180

CMD ["pnpm", "dev"]

FROM dev AS build

RUN pnpm build

# Prod : on sert le build avec vite preview (plus simple que nginx pour l'instant).
# Attention, la doc Vite déconseille preview en prod : https://vite.dev/guide/cli#vite-preview
FROM build AS main

CMD ["pnpm", "preview", "--port", "5180"]
