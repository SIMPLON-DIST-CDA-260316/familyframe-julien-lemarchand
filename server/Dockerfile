FROM node:24.22-alpine3.24 AS base

RUN corepack enable && pnpm --version

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

COPY package.json ./
COPY prisma prisma

FROM base AS deps

RUN pnpm install --dangerously-allow-all-builds

FROM deps AS dev

COPY tsconfig.json tsconfig.build.json ./
COPY src src

EXPOSE 3000

CMD ["pnpm", "dev"]

FROM dev AS build

RUN pnpm build

FROM build AS prod-deps

RUN pnpm prune --prod --ignore-scripts

FROM base AS main

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["pnpm", "start"]
