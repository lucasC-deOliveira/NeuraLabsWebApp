# Frontend (SPA Vite) — thin client que aponta para a API NestJS.
# VITE_API_URL é build-time: entra no bundle do browser. Como o browser roda na
# máquina do usuário, aponta para a porta publicada do backend
# (http://localhost:3001/api), e NÃO para o hostname interno do Docker.
FROM node:20 AS builder
WORKDIR /app

# não baixa o binário do Electron no build (não é usado aqui, só na dist desktop)
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- Runtime: nginx servindo os estáticos ----
FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
# usa o CMD padrão da imagem nginx (nginx -g 'daemon off;')
