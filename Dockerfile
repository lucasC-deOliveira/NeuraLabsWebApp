# Frontend Next.js (output: standalone) — thin client que aponta para a API NestJS.
# NEXT_PUBLIC_API_URL é build-time: entra no bundle do browser. Como o browser
# roda na máquina do usuário, aponta para a porta publicada do backend
# (http://localhost:3001/api), e NÃO para o hostname interno do Docker.
FROM node:20 AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# gera o client Prisma legado (src/generated/prisma é gitignored) e compila
RUN npx prisma generate && npm run build

# ---- Runtime mínimo ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# server.js mínimo do standalone + estáticos (o standalone não os copia sozinho)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
