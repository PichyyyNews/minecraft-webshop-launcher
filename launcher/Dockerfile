FROM node:22-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:22-slim AS builder
WORKDIR /app
ARG VITE_LAUNCHER_API_URL
ARG VITE_LAUNCHER_PRODUCT_NAME
ENV VITE_LAUNCHER_API_URL=$VITE_LAUNCHER_API_URL
ENV VITE_LAUNCHER_PRODUCT_NAME=$VITE_LAUNCHER_PRODUCT_NAME
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build:web

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
