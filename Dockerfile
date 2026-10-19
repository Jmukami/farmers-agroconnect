FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY server ./server
EXPOSE 3001
CMD ["npm", "start"]
