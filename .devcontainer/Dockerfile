FROM mcr.microsoft.com/devcontainers/javascript-node:1-24-bookworm

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends sqlite3 \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@9.12.2 --activate

USER node
