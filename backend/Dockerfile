# Imagem do backend NestJS. node:20 (debian) — compatível com o engine do Prisma.
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 3001

# aplica o schema no banco e sobe a API
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]
