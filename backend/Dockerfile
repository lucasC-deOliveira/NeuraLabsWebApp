# Imagem do backend NestJS. node:20 (debian) — compatível com o engine do Prisma.
#
# O contexto de build é a RAIZ do repositório (ver docker-compose.yml), não backend/:
# a compilação precisa enxergar contracts/, que fica fora desta pasta. Daí o prefixo
# backend/ nos COPY e o layout do repo preservado dentro da imagem — o rootDir ".."
# do tsconfig depende de contracts/ ser irmã de backend/.
FROM node:20

WORKDIR /repo/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/prisma ./prisma
RUN npx prisma generate

COPY contracts /repo/contracts
COPY backend /repo/backend

# Compila daqui: o tsconfig resolve "zod" do node_modules do backend (ver "paths"),
# e o dist sai em backend/dist/{backend,contracts}/.
RUN npm run build

EXPOSE 3001

# aplica o schema no banco e sobe a API. dist/backend/src/ por causa do rootDir "..".
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/backend/src/main.js"]
