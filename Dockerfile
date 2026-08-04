FROM node:22-alpine AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM nginx:stable-alpine AS deploy
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

HEALTHCHECK CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
